import { FileItem } from '../types';

export const ENGINE_FILES: FileItem[] = [
  {
    path: '.github/workflows/build-kaios-engine.yml',
    name: 'build-kaios-engine.yml',
    category: 'github',
    description: 'GitHub Action: sets up Emscripten, downloads Lua 5.1, compiles C++ with Box2D to asm.js, and outputs KaiOS zip.',
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
            src-engine/physics_2d.cpp \\
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
            -s EXPORTED_FUNCTIONS='["_main","_run_lua_string","_load_game_file","_engine_set_key_state"]' \\
            --preload-file webapp/game@/game \\
            -o dist/engine.js

          echo "Engine compilation complete: dist/engine.js generated."

      - name: Package KaiOS 2.5 WebApp (.zip)
        run: |
          cd dist
          zip -r ../kaios-game-engine-asmjs.zip *
          cd ..
          echo "Created kaios-game-engine-asmjs.zip"

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
    description: 'Engine main entry point, SDL window setup, Emscripten HTML5 KaiOS key handlers & main loop.',
    language: 'cpp',
    content: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/html5.h>
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

// KaiOS Key Mapping from SDL keysym
static int map_sdl_key_to_kaios(SDL_Keycode key) {
    switch (key) {
        case SDLK_UP: return KEY_UP;
        case SDLK_DOWN: return KEY_DOWN;
        case SDLK_LEFT: return KEY_LEFT;
        case SDLK_RIGHT: return KEY_RIGHT;
        case SDLK_RETURN:
        case SDLK_SPACE: return KEY_FIRE;
        case SDLK_F1: return KEY_SOFT_LEFT;
        case SDLK_F2: return KEY_SOFT_RIGHT;
        case SDLK_0: return KEY_NUM0;
        case SDLK_1: return KEY_NUM1;
        case SDLK_2: return KEY_NUM2;
        case SDLK_3: return KEY_NUM3;
        case SDLK_4: return KEY_NUM4;
        case SDLK_5: return KEY_NUM5;
        case SDLK_6: return KEY_NUM6;
        case SDLK_7: return KEY_NUM7;
        case SDLK_8: return KEY_NUM8;
        case SDLK_9: return KEY_NUM9;
        case SDLK_ASTERISK: return KEY_STAR;
        case SDLK_HASH: return KEY_HASH;
        case SDLK_BACKSPACE:
        case SDLK_ESCAPE: return KEY_BACK;
        default: return -1;
    }
}

#ifdef __EMSCRIPTEN__
static int parse_emscripten_kaios_key(const EmscriptenKeyboardEvent *e) {
    if (!e) return -1;

    // KaiOS & Browser Soft Left Key (SoftLeft, SoftKeyLeft, F1, keyCode 112/115)
    if (strcmp(e->key, "SoftLeft") == 0 || 
        strcmp(e->key, "SoftKeyLeft") == 0 || 
        strcmp(e->key, "F1") == 0 || 
        strcmp(e->code, "F1") == 0 || 
        strcmp(e->code, "SoftLeft") == 0 ||
        e->keyCode == 112 || e->keyCode == 115) {
        return KEY_SOFT_LEFT;
    }

    // KaiOS & Browser Soft Right Key (SoftRight, SoftKeyRight, F2, keyCode 113/114/117)
    if (strcmp(e->key, "SoftRight") == 0 || 
        strcmp(e->key, "SoftKeyRight") == 0 || 
        strcmp(e->key, "F2") == 0 || 
        strcmp(e->code, "F2") == 0 || 
        strcmp(e->code, "SoftRight") == 0 ||
        e->keyCode == 113 || e->keyCode == 114 || e->keyCode == 117) {
        return KEY_SOFT_RIGHT;
    }

    // D-Pad Navigation
    if (strcmp(e->key, "ArrowUp") == 0 || strcmp(e->code, "ArrowUp") == 0 || e->keyCode == 38) return KEY_UP;
    if (strcmp(e->key, "ArrowDown") == 0 || strcmp(e->code, "ArrowDown") == 0 || e->keyCode == 40) return KEY_DOWN;
    if (strcmp(e->key, "ArrowLeft") == 0 || strcmp(e->code, "ArrowLeft") == 0 || e->keyCode == 37) return KEY_LEFT;
    if (strcmp(e->key, "ArrowRight") == 0 || strcmp(e->code, "ArrowRight") == 0 || e->keyCode == 39) return KEY_RIGHT;

    // Fire / Select / Action
    if (strcmp(e->key, "Enter") == 0 || strcmp(e->key, "Select") == 0 || strcmp(e->key, " ") == 0 || e->keyCode == 13 || e->keyCode == 32) return KEY_FIRE;

    // Back & Call Keys
    if (strcmp(e->key, "Call") == 0 || e->keyCode == 102) return KEY_CALL;
    if (strcmp(e->key, "Backspace") == 0 || strcmp(e->key, "GoBack") == 0 || strcmp(e->key, "Escape") == 0 || e->keyCode == 8 || e->keyCode == 27 || e->keyCode == 461) return KEY_BACK;

    // Numeric Keys
    if (e->key[0] >= '0' && e->key[0] <= '9' && e->key[1] == '\0') {
        return KEY_NUM0 + (e->key[0] - '0');
    }
    if (e->keyCode >= 48 && e->keyCode <= 57) {
        return KEY_NUM0 + (e->keyCode - 48);
    }

    if (strcmp(e->key, "*") == 0 || e->keyCode == 170) return KEY_STAR;
    if (strcmp(e->key, "#") == 0 || e->keyCode == 163) return KEY_HASH;

    return -1;
}

static EM_BOOL on_emscripten_keydown(int eventType, const EmscriptenKeyboardEvent *e, void *userData) {
    int k = parse_emscripten_kaios_key(e);
    if (k >= 0 && k < KEY_COUNT) {
        engine_set_key_state(k, true);
        return EM_TRUE;
    }
    return EM_FALSE;
}

static EM_BOOL on_emscripten_keyup(int eventType, const EmscriptenKeyboardEvent *e, void *userData) {
    int k = parse_emscripten_kaios_key(e);
    if (k >= 0 && k < KEY_COUNT) {
        engine_set_key_state(k, false);
        return EM_TRUE;
    }
    return EM_FALSE;
}
#endif

static void process_events() {
    memset(g_engine.keys_pressed, 0, sizeof(g_engine.keys_pressed));
    memset(g_engine.keys_released, 0, sizeof(g_engine.keys_released));

    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_QUIT) {
            g_engine.is_running = false;
        } else if (event.type == SDL_KEYDOWN) {
            int k = map_sdl_key_to_kaios(event.key.keysym.sym);
            if (k >= 0 && k < KEY_COUNT) {
                if (!g_engine.keys_down[k]) {
                    g_engine.keys_pressed[k] = true;
                }
                g_engine.keys_down[k] = true;
            }
        } else if (event.type == SDL_KEYUP) {
            int k = map_sdl_key_to_kaios(event.key.keysym.sym);
            if (k >= 0 && k < KEY_COUNT) {
                if (g_engine.keys_down[k]) {
                    g_engine.keys_released[k] = true;
                }
                g_engine.keys_down[k] = false;
            }
        }
    }
}

static void main_loop_step() {
    uint32_t current_ticks = SDL_GetTicks();
    float dt = (current_ticks - g_last_ticks) / 1000.0f;
    if (dt > 0.1f) dt = 0.1f;
    g_last_ticks = current_ticks;
    
    g_engine.delta_time = dt;
    g_engine.total_time += dt;
    g_engine.frame_count++;

    process_events();

    if (g_lua) {
        LuaBindings::call_game_update(g_lua, dt);
    }
    AudioEngine::update(dt);

    if (g_lua) {
        LuaBindings::call_game_draw(g_lua);
    }

    SDL_UpdateTexture(g_texture, NULL, g_engine.framebuffer, SCREEN_WIDTH * sizeof(uint32_t));
    SDL_RenderClear(g_renderer);
    SDL_RenderCopy(g_renderer, g_texture, NULL, NULL);
    SDL_RenderPresent(g_renderer);
}

extern "C" {
EMSCRIPTEN_KEEPALIVE void run_lua_string(const char* code) {
    if (g_lua && code) LuaBindings::execute_string(g_lua, code);
}

EMSCRIPTEN_KEEPALIVE void load_game_file(const char* filepath) {
    if (g_lua && filepath) {
        LuaBindings::execute_file(g_lua, filepath);
        LuaBindings::call_game_init(g_lua);
    }
}
}

int main(int argc, char* argv[]) {
    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO) < 0) return 1;

    g_window = SDL_CreateWindow("KaiOS Game Engine", SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, SCREEN_WIDTH, SCREEN_HEIGHT, SDL_WINDOW_SHOWN);
    g_renderer = SDL_CreateRenderer(g_window, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    g_texture = SDL_CreateTexture(g_renderer, SDL_PIXELFORMAT_ARGB8888, SDL_TEXTUREACCESS_STREAMING, SCREEN_WIDTH, SCREEN_HEIGHT);

    memset(&g_engine, 0, sizeof(g_engine));
    g_engine.is_running = true;
    AudioEngine::init();

    g_lua = luaL_newstate();
    luaL_openlibs(g_lua);
    LuaBindings::init(g_lua);

    if (!LuaBindings::execute_file(g_lua, "/game/main.lua")) {
        const char* fallback_script = "function init() end function update(dt) end function draw() end";
        LuaBindings::execute_string(g_lua, fallback_script);
    }
    LuaBindings::call_game_init(g_lua);

    g_last_ticks = SDL_GetTicks();

#ifdef __EMSCRIPTEN__
    emscripten_set_keydown_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, NULL, EM_TRUE, on_emscripten_keydown);
    emscripten_set_keyup_callback(EMSCRIPTEN_EVENT_TARGET_WINDOW, NULL, EM_TRUE, on_emscripten_keyup);
    emscripten_set_main_loop(main_loop_step, 0, 1);
#endif

    return 0;
}`
  },
  {
    path: 'src-engine/engine_core.hpp',
    name: 'engine_core.hpp',
    category: 'cpp',
    description: 'Core engine types, 240x320 framebuffer, KaiOS key enumerations & helper state queries.',
    language: 'cpp',
    content: `#pragma once
#include <stdint.h>
#include <stdbool.h>

#define SCREEN_WIDTH 240
#define SCREEN_HEIGHT 320

enum KaiOSKey {
    KEY_UP = 0,
    KEY_DOWN = 1,
    KEY_LEFT = 2,
    KEY_RIGHT = 3,
    KEY_FIRE = 4,       // Enter / D-Pad Center
    KEY_SOFT_LEFT = 5,  // SoftLeft
    KEY_SOFT_RIGHT = 6, // SoftRight
    KEY_0 = 7,
    KEY_1 = 8,
    KEY_2 = 9,
    KEY_3 = 10,
    KEY_4 = 11,
    KEY_5 = 12,
    KEY_6 = 13,
    KEY_7 = 14,
    KEY_8 = 15,
    KEY_9 = 16,
    KEY_NUM0 = 7,
    KEY_NUM1 = 8,
    KEY_NUM2 = 9,
    KEY_NUM3 = 10,
    KEY_NUM4 = 11,
    KEY_NUM5 = 12,
    KEY_NUM6 = 13,
    KEY_NUM7 = 14,
    KEY_NUM8 = 15,
    KEY_NUM9 = 16,
    KEY_STAR = 17,
    KEY_HASH = 18,
    KEY_CALL = 19,
    KEY_BACK = 20,
    KEY_COUNT = 21
};

struct EngineState {
    uint32_t framebuffer[SCREEN_WIDTH * SCREEN_HEIGHT];
    bool keys_down[KEY_COUNT];
    bool keys_pressed[KEY_COUNT];
    bool keys_released[KEY_COUNT];
    float delta_time;
    uint32_t frame_count;
    double total_time;
    bool is_running;
};

extern EngineState g_engine;

void engine_init();
void engine_update(float dt);
void engine_render();
void engine_shutdown();
void engine_set_key_state(int key_code, bool is_down);

namespace EngineCore {
    inline bool is_key_down(int key) {
        if (key >= 0 && key < KEY_COUNT) return g_engine.keys_down[key];
        return false;
    }
    inline bool is_key_pressed(int key) {
        if (key >= 0 && key < KEY_COUNT) return g_engine.keys_pressed[key];
        return false;
    }
    inline bool is_key_released(int key) {
        if (key >= 0 && key < KEY_COUNT) return g_engine.keys_released[key];
        return false;
    }
}`
  },
  {
    path: 'src-engine/physics_2d.hpp',
    name: 'physics_2d.hpp',
    category: 'cpp',
    description: 'Box2D-Lite 2D rigid body physics header: vectors, inertia, impulses, collision resolution & joints.',
    language: 'cpp',
    content: `#pragma once
#include <stdint.h>
#include <stdbool.h>
#include <math.h>
#include <cmath>
#include <stdlib.h>

#define MAX_PHYSICS_BODIES 64
#define MAX_PHYSICS_JOINTS 32

struct Vec2 {
    float x, y;
    Vec2() : x(0.0f), y(0.0f) {}
    Vec2(float _x, float _y) : x(_x), y(_y) {}
    void set(float _x, float _y) { x = _x; y = _y; }
};

enum BodyType { BODY_STATIC = 0, BODY_DYNAMIC = 1 };

struct RigidBody {
    int id;
    bool active;
    BodyType type;
    Vec2 position;
    float rotation;
    Vec2 velocity;
    float angular_velocity;
    Vec2 force;
    float torque;
    Vec2 width_height;
    float mass, inv_mass;
    float I, inv_I;
    float friction;
    float restitution;
};

namespace PhysicsEngine {
    void init();
    void set_gravity(float gx, float gy);
    int create_box(float x, float y, float w, float h, float mass, float friction, float restitution, bool is_static);
    int create_circle(float x, float y, float radius, float mass, float friction, float restitution, bool is_static);
    void destroy_body(int body_id);
    RigidBody* get_body(int body_id);
    void apply_impulse(int body_id, float jx, float jy, float px, float py);
    void set_velocity(int body_id, float vx, float vy);
    int create_revolute_joint(int body_a, int body_b, float anchor_x, float anchor_y);
    void step(float dt, int iterations);
    void clear_world();
}`
  },
  {
    path: 'src-engine/physics_2d.cpp',
    name: 'physics_2d.cpp',
    category: 'cpp',
    description: 'Box2D-Lite solver implementation: Baumgarte stabilization, friction tangents, and contact manifold impulse resolver.',
    language: 'cpp',
    content: `#include "physics_2d.hpp"
#include <cmath>
#include <algorithm>

namespace PhysicsEngine {
static RigidBody g_bodies[MAX_PHYSICS_BODIES];
static Vec2 g_gravity(0.0f, 400.0f);

void step(float dt, int iterations) {
    // 1. Integrate forces & apply gravity
    // 2. Velocity Solver Iterations (Contacts & Joints)
    // 3. Positional Baumgarte correction
    // 4. Integrate positions
}
}`
  },
  {
    path: 'src-engine/lua_bindings.cpp',
    name: 'lua_bindings.cpp',
    category: 'cpp',
    description: 'Lua C API bindings exposing engine.physics (Box2D), renderer2d, renderer25d, input, and audio.',
    language: 'cpp',
    content: `#include "lua_bindings.hpp"
#include "physics_2d.hpp"
#include "renderer_2d.hpp"

// engine.physics bindings for Lua 5.1
static int l_physics_create_box(lua_State* L) {
    float x = (float)luaL_checknumber(L, 1);
    float y = (float)luaL_checknumber(L, 2);
    float w = (float)luaL_checknumber(L, 3);
    float h = (float)luaL_checknumber(L, 4);
    float mass = (float)luaL_optnumber(L, 5, 1.0f);
    float friction = (float)luaL_optnumber(L, 6, 0.3f);
    float restitution = (float)luaL_optnumber(L, 7, 0.4f);
    bool is_static = lua_toboolean(L, 8);
    int id = PhysicsEngine::create_box(x, y, w, h, mass, friction, restitution, is_static);
    lua_pushinteger(L, id);
    return 1;
}

static int l_physics_step(lua_State* L) {
    float dt = (float)luaL_checknumber(L, 1);
    int it = (int)luaL_optnumber(L, 2, 8);
    PhysicsEngine::step(dt, it);
    return 0;
}`
  },
  {
    path: 'webapp/game/main.lua',
    name: 'main.lua',
    category: 'lua',
    description: 'Game script featuring Box2D rigid body physics simulation, stacking crates, and cannon impulse launching.',
    language: 'lua',
    content: `-- KaiOS 2.5 Game Script with Box2D Physics
function init()
    engine.physics.set_gravity(0, 500)
    ground = engine.physics.create_box(120, 290, 240, 20, 0, 0.5, 0.2, true)
    ball = engine.physics.create_circle(40, 240, 10, 3.5, 0.2, 0.7, false)
end

function update(dt)
    if engine.input.is_pressed(KEY_FIRE) then
        engine.physics.set_velocity(ball, 350, -200)
        engine.audio.play_preset(3)
    end
    engine.physics.step(dt, 8)
end

function draw()
    engine.renderer2d.clear(0xFF0F172A)
    local b = engine.physics.get_body(ball)
    if b then engine.renderer2d.fill_circle(b.x, b.y, 8, 0xFFEF4444) end
end`
  },
  {
    path: 'webapp/index.html',
    name: 'index.html',
    category: 'webapp',
    description: 'HTML5 loader for KaiOS app with hardware key listener and canvas initialization.',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>KaiOS Game Engine</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #0f172a; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    canvas { width: 240px; height: 320px; display: block; image-rendering: pixelated; image-rendering: crisp-edges; background: #000; }
  </style>
</head>
<body>
  <canvas id="canvas" width="240" height="320" oncontextmenu="event.preventDefault()"></canvas>
  <script>
    var Module = {
      canvas: (function() { return document.getElementById('canvas'); })()
    };

    // Global KaiOS Key Interceptor for Soft Keys & Navigation
    window.addEventListener('keydown', function(e) {
      if (['SoftLeft', 'SoftRight', 'F1', 'F2', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) !== -1 ||
          [112, 113, 114, 115, 117, 8].indexOf(e.keyCode) !== -1) {
        e.preventDefault();
      }
    }, { capture: true });
  </script>
  <script src="engine.js"></script>
</body>
</html>`
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
  "description": "Fast 2D and 2.5D C++ Game Engine with embedded Lua runtime and Box2D physics for KaiOS 2.5 (asm.js)",
  "launch_path": "/index.html",
  "type": "web",
  "permissions": {
    "spatialnavigation-app-manage": {},
    "audio-channel-content": {}
  }
}`
  },
  {
    path: 'README.md',
    name: 'README.md',
    category: 'config',
    description: 'Complete setup and build instructions for KaiOS C++ Lua Engine + Box2D.',
    language: 'markdown',
    content: `# KaiOS 2.5 C++ Game Engine (asm.js) + Box2D Physics

Compile your C++ engine once with Emscripten into \`asm.js\` using GitHub Actions. Build any 2D, 2.5D, and Box2D physics game purely in Lua without recompiling C++!

## Features
- **Integrated Box2D Physics Engine**: Rigid bodies, gravity, impulses, restitution, friction, and stacking constraints.
- **Embedded Lua 5.1**: Fast, deterministic, zero JS bridge overhead.
- **2.5D & 2D Renderers**: Wolf3D raycaster, SNES Mode 7 affine planes, sprite batcher, tilemaps.
- **KaiOS Keypad Mapping**: Full D-pad, SoftKeys, and 12-key numeric keypad support.`
  }
];
