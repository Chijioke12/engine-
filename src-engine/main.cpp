#include <stdio.h>
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

static void process_events() {
    // Reset frame-specific key transitions
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
    if (dt > 0.1f) dt = 0.1f; // Clamp to avoid huge frame spikes
    g_last_ticks = current_ticks;
    
    g_engine.delta_time = dt;
    g_engine.total_time += dt;
    g_engine.frame_count++;

    process_events();

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

extern "C" {

EMSCRIPTEN_KEEPALIVE
void run_lua_string(const char* code) {
    if (g_lua && code) {
        LuaBindings::execute_string(g_lua, code);
    }
}

EMSCRIPTEN_KEEPALIVE
void load_game_file(const char* filepath) {
    if (g_lua && filepath) {
        LuaBindings::execute_file(g_lua, filepath);
        LuaBindings::call_game_init(g_lua);
    }
}

}

int main(int argc, char* argv[]) {
    printf("[KaiOS Game Engine] Initializing asm.js core (240x320)...\n");

    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO) < 0) {
        fprintf(stderr, "SDL Init failed: %s\n", SDL_GetError());
        return 1;
    }

    g_window = SDL_CreateWindow(
        "KaiOS Game Engine",
        SDL_WINDOWPOS_CENTERED,
        SDL_WINDOWPOS_CENTERED,
        SCREEN_WIDTH,
        SCREEN_HEIGHT,
        SDL_WINDOW_SHOWN
    );

    g_renderer = SDL_CreateRenderer(g_window, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    g_texture = SDL_CreateTexture(
        g_renderer,
        SDL_PIXELFORMAT_ARGB8888,
        SDL_TEXTUREACCESS_STREAMING,
        SCREEN_WIDTH,
        SCREEN_HEIGHT
    );

    // Initialize subsystems
    memset(&g_engine, 0, sizeof(g_engine));
    g_engine.is_running = true;
    AudioEngine::init();

    // Initialize Lua VM
    g_lua = luaL_newstate();
    luaL_openlibs(g_lua);
    LuaBindings::init(g_lua);

    // Try loading main game file from Emscripten virtual filesystem
    printf("[KaiOS Game Engine] Loading /game/main.lua...\n");
    if (!LuaBindings::execute_file(g_lua, "/game/main.lua")) {
        // Fallback demo if file not found
        const char* fallback_script = 
            "function init()\n"
            "  x = 120; y = 160\n"
            "end\n"
            "function update(dt)\n"
            "  if engine.input.is_down(KEY_LEFT) then x = x - 60*dt end\n"
            "  if engine.input.is_down(KEY_RIGHT) then x = x + 60*dt end\n"
            "  if engine.input.is_down(KEY_UP) then y = y - 60*dt end\n"
            "  if engine.input.is_down(KEY_DOWN) then y = y + 60*dt end\n"
            "end\n"
            "function draw()\n"
            "  engine.renderer2d.clear(0xFF10141E)\n"
            "  engine.renderer2d.fill_rect(x-12, y-12, 24, 24, 0xFF38BDF8)\n"
            "  engine.renderer2d.draw_text('KaiOS 2.5 Engine Ready', 20, 20, 0xFFFFFFFF, 1)\n"
            "end\n";
        LuaBindings::execute_string(g_lua, fallback_script);
    }
    LuaBindings::call_game_init(g_lua);

    g_last_ticks = SDL_GetTicks();

#ifdef __EMSCRIPTEN__
    // 0 fps uses requestAnimationFrame
    emscripten_set_main_loop(main_loop_step, 0, 1);
#else
    while (g_engine.is_running) {
        main_loop_step();
        SDL_Delay(16);
    }
    lua_close(g_lua);
    SDL_DestroyTexture(g_texture);
    SDL_DestroyRenderer(g_renderer);
    SDL_DestroyWindow(g_window);
    SDL_Quit();
#endif

    return 0;
}
