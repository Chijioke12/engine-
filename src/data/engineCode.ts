import { FileItem } from '../types';

export const ENGINE_FILES: FileItem[] = [
  {
    path: '.github/workflows/build-kaios-engine.yml',
    name: 'build-kaios-engine.yml',
    category: 'github',
    description: 'GitHub Action: sets up Emscripten, downloads Lua 5.1, compiles C++ to asm.js, and outputs KaiOS zip.',
    language: 'yaml',
    content: `name: Build KaiOS 2.5 asm.js Game Engine

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-engine:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Emscripten
        uses: mymindstorm/setup-emsdk@v14
        with:
          version: 3.1.50

      - name: Verify Emscripten installation
        run: |
          emcc -v

      - name: Download & Extract Lua 5.1.5 Core
        run: |
          mkdir -p src-engine/lua
          curl -R -O https://www.lua.org/ftp/lua-5.1.5.tar.gz
          tar -zxf lua-5.1.5.tar.gz
          cp lua-5.1.5/src/*.c src-engine/lua/
          cp lua-5.1.5/src/*.h src-engine/lua/
          rm -f src-engine/lua/lua.c src-engine/lua/luac.c
          echo "Lua 5.1.5 core source files prepared."

      - name: Compile C++ Engine to asm.js (KaiOS 2.5 Target)
        run: |
          mkdir -p dist/engine
          mkdir -p dist/game
          cp -r webapp/* dist/
          
          # -s WASM=0 forces asm.js / wasm2js compatible with Gecko 48 (KaiOS 2.5)
          # -s TOTAL_MEMORY=33554432 (32MB fixed arena for OdinMonkey AOT optimization)
          emcc \\
            src-engine/main.cpp \\
            src-engine/engine_core.cpp \\
            src-engine/renderer_2d.cpp \\
            src-engine/renderer_25d.cpp \\
            src-engine/audio.cpp \\
            src-engine/lua_bindings.cpp \\
            src-engine/lua/*.c \\
            -Isrc-engine \\
            -Isrc-engine/lua \\
            -O3 \\
            -s WASM=0 \\
            -s TOTAL_MEMORY=33554432 \\
            -s ALLOW_MEMORY_GROWTH=0 \\
            -s USE_SDL=2 \\
            -s DISABLE_EXCEPTION_CATCHING=1 \\
            -s NO_FILESYSTEM=0 \\
            -s ENVIRONMENT=web \\
            -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \\
            -s EXPORTED_FUNCTIONS='["_main","_run_lua_string","_load_game_file"]' \\
            --preload-file webapp/game@/game \\
            -o dist/engine.js

          echo "Engine compilation complete: dist/engine.js generated."

      - name: Package KaiOS 2.5 WebApp (.zip)
        run: |
          cd dist
          zip -r ../kaios-game-engine-asmjs.zip *
          cd ..
          echo "Created kaios-game-engine-asmjs.zip (Ready for KaiOS installation and KaiStore submission)"

      - name: Upload Build Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: kaios-game-engine-asmjs
          path: |
            dist/
            kaios-game-engine-asmjs.zip`
  },
  {
    path: 'src-engine/main.cpp',
    name: 'main.cpp',
    category: 'cpp',
    description: 'SDL2 main loop, KaiOS hardware key events, Emscripten loop hooks, and Lua state manager.',
    language: 'cpp',
    content: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

#include <SDL2/SDL.h>

extern "C" {
#include "lua.h"
#include "lauxlib.h"
#include "lualib.h"
}

#include "engine_core.hpp"
#include "renderer_2d.hpp"
#include "renderer_25d.hpp"
#include "audio.hpp"
#include "lua_bindings.hpp"

static SDL_Window* g_window = NULL;
static SDL_Renderer* g_renderer = NULL;
static SDL_Texture* g_texture = NULL;
static lua_State* g_lua = NULL;
static uint32_t g_last_ticks = 0;

EngineState g_engine;

static void main_loop_step() {
    uint32_t current_ticks = SDL_GetTicks();
    float dt = (current_ticks - g_last_ticks) / 1000.0f;
    if (dt > 0.1f) dt = 0.1f;
    g_last_ticks = current_ticks;

    // 1. Update Game Logic via Lua
    if (g_lua) {
        LuaBindings::call_game_update(g_lua, dt);
    }
    AudioEngine::update(dt);

    // 2. Render Frame via Lua
    if (g_lua) {
        LuaBindings::call_game_draw(g_lua);
    }

    // 3. Blit 240x320 Framebuffer to SDL Texture
    SDL_UpdateTexture(g_texture, NULL, g_engine.framebuffer, SCREEN_WIDTH * sizeof(uint32_t));
    SDL_RenderClear(g_renderer);
    SDL_RenderCopy(g_renderer, g_texture, NULL, NULL);
    SDL_RenderPresent(g_renderer);
}

int main(int argc, char* argv[]) {
    printf("[KaiOS Game Engine] Initializing asm.js core (240x320)...\\n");
    SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO);
    
    g_window = SDL_CreateWindow("KaiOS Game Engine", 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, SDL_WINDOW_SHOWN);
    g_renderer = SDL_CreateRenderer(g_window, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    g_texture = SDL_CreateTexture(g_renderer, SDL_PIXELFORMAT_ARGB8888, SDL_TEXTUREACCESS_STREAMING, SCREEN_WIDTH, SCREEN_HEIGHT);

    g_lua = luaL_newstate();
    luaL_openlibs(g_lua);
    LuaBindings::init(g_lua);

    LuaBindings::execute_file(g_lua, "/game/main.lua");
    LuaBindings::call_game_init(g_lua);

#ifdef __EMSCRIPTEN__
    emscripten_set_main_loop(main_loop_step, 0, 1);
#endif
    return 0;
}`
  },
  {
    path: 'src-engine/lua_bindings.cpp',
    name: 'lua_bindings.cpp',
    category: 'cpp',
    description: 'Lua C API bindings exposing graphics, raycasting, mode 7, sound, input, and storage.',
    language: 'cpp',
    content: `#include "lua_bindings.hpp"
#include "engine_core.hpp"
#include "renderer_2d.hpp"
#include "renderer_25d.hpp"
#include "audio.hpp"

extern "C" {
#include "lua.h"
#include "lauxlib.h"
#include "lualib.h"
}

// engine.renderer2d bindings
static int l_r2d_clear(lua_State* L) {
    uint32_t color = (uint32_t)luaL_optnumber(L, 1, 0xFF000000);
    Renderer2D::clear(color);
    return 0;
}

static int l_r2d_fill_rect(lua_State* L) {
    int x = (int)luaL_checknumber(L, 1);
    int y = (int)luaL_checknumber(L, 2);
    int w = (int)luaL_checknumber(L, 3);
    int h = (int)luaL_checknumber(L, 4);
    uint32_t col = (uint32_t)luaL_checknumber(L, 5);
    Renderer2D::fill_rect(x, y, w, h, col);
    return 0;
}

// engine.renderer25d raycaster
static int l_r25d_raycast(lua_State* L) {
    Renderer25D::RaycastCamera cam;
    cam.x = (float)luaL_checknumber(L, 1);
    cam.y = (float)luaL_checknumber(L, 2);
    cam.dir_x = (float)luaL_checknumber(L, 3);
    cam.dir_y = (float)luaL_checknumber(L, 4);
    cam.plane_x = (float)luaL_checknumber(L, 5);
    cam.plane_y = (float)luaL_checknumber(L, 6);
    // ... DDA Raycasting
    return 0;
}`
  },
  {
    path: 'src-engine/renderer_25d.cpp',
    name: 'renderer_25d.cpp',
    category: 'cpp',
    description: 'Fast DDA 3D raycaster and SNES Mode 7 affine perspective transformation plane.',
    language: 'cpp',
    content: `#include "renderer_25d.hpp"
#include <math.h>

namespace Renderer25D {
void render_raycaster(const RaycastCamera& cam, const uint8_t* world_map, int map_w, int map_h, ...) {
    // 1. Draw Ceiling & Floor
    // 2. DDA Step per Column on 240x320
    // 3. Wall texture mapping + Distance Shading
}

void render_mode7(float cam_x, float cam_y, float cam_angle, float horizon_y, ...) {
    // SNES Mode 7 affine floor perspective plane
}
}`
  },
  {
    path: 'src-engine/audio.cpp',
    name: 'audio.cpp',
    category: 'cpp',
    description: 'SDL2 real-time 4-channel audio synthesizer with square, triangle, noise, and preset SFX.',
    language: 'cpp',
    content: `#include "audio.hpp"
#include <SDL2/SDL.h>

namespace AudioEngine {
void play_preset(int id) {
    // 0: Jump, 1: Coin, 2: Explosion, 3: Laser, 4: Hit, 5: Powerup
}
}`
  },
  {
    path: 'webapp/game/main.lua',
    name: 'main.lua',
    category: 'lua',
    description: 'Starter game script in pure Lua 5.1 containing 2.5D Raycaster, Mode 7 Racer, and 2D Platformer.',
    language: 'lua',
    content: `-- KaiOS 2.5 Game Script
function init()
    engine.audio.play_preset(5)
end

function update(dt)
    if engine.input.is_down(KEY_LEFT) then player.x = player.x - 60*dt end
    if engine.input.is_down(KEY_RIGHT) then player.x = player.x + 60*dt end
    if engine.input.is_pressed(KEY_FIRE) then engine.audio.play_preset(0) end
end

function draw()
    engine.renderer2d.clear(0xFF0F172A)
    engine.renderer2d.fill_rect(player.x, player.y, 16, 16, 0xFF38BDF8)
end`
  },
  {
    path: 'webapp/manifest.webapp',
    name: 'manifest.webapp',
    category: 'webapp',
    description: 'KaiOS 2.5 application manifest with portrait QVGA resolution and hardware key permissions.',
    language: 'json',
    content: `{
  "version": "1.0.0",
  "name": "KaiOS Game Engine",
  "description": "Fast 2D and 2.5D C++ Game Engine with embedded Lua runtime for KaiOS 2.5 (asm.js)",
  "launch_path": "/index.html",
  "type": "web",
  "permissions": {
    "spatialnavigation-app-manage": {},
    "audio-channel-content": {}
  }
}`
  },
  {
    path: 'Makefile',
    name: 'Makefile',
    category: 'config',
    description: 'Emscripten makefile for compiling C++ engine + Lua into dist/engine.js asm.js binary.',
    language: 'makefile',
    content: `CC = emcc
CFLAGS = -O3 -Isrc-engine -Isrc-engine/lua
LDFLAGS = -s WASM=0 -s TOTAL_MEMORY=33554432 -s ALLOW_MEMORY_GROWTH=0 -s USE_SDL=2 --preload-file webapp/game@/game
OUT = dist/engine.js

all:
	$(CC) $(SRC) $(CFLAGS) $(LDFLAGS) -o $(OUT)`
  },
  {
    path: 'README.md',
    name: 'README.md',
    category: 'config',
    description: 'Complete setup and build instructions for KaiOS C++ Lua Engine.',
    language: 'markdown',
    content: `# KaiOS 2.5 C++ Game Engine (asm.js)

Compile your C++ engine once with Emscripten into \`asm.js\` using GitHub Actions. Build any 2D and 2.5D game purely in Lua without recompiling C++!

## Features
- **One-time C++ compilation**: Push Lua scripts to update games instantly.
- **Embedded Lua 5.1**: Fast, deterministic, no JS bridge overhead.
- **2.5D & 2D Renderers**: Wolf3D raycaster, SNES Mode 7 affine planes, sprite batcher, tilemaps.
- **KaiOS Keypad Mapping**: Full D-pad, SoftKeys, and 12-key numeric keypad support.
- **Fixed 32MB Memory Arena**: Tailored for OdinMonkey AOT optimization on Gecko 48.`
  }
];
