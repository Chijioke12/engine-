#include "lua_bindings.hpp"
#include "engine_core.hpp"
#include "renderer_2d.hpp"
#include "renderer_25d.hpp"
#include "audio.hpp"

#include <stdio.h>
#include <stdlib.h>

extern "C" {
#include "lua.h"
#include "lauxlib.h"
#include "lualib.h"
}

// ----------------------------------------------------
// Lua C API Bindings: engine.renderer2d
// ----------------------------------------------------

static int l_r2d_clear(lua_State* L) {
    uint32_t color = (uint32_t)luaL_optnumber(L, 1, 0xFF000000);
    Renderer2D::clear(color);
    return 0;
}

static int l_r2d_pixel(lua_State* L) {
    int x = (int)luaL_checknumber(L, 1);
    int y = (int)luaL_checknumber(L, 2);
    uint32_t col = (uint32_t)luaL_checknumber(L, 3);
    Renderer2D::set_pixel(x, y, col);
    return 0;
}

static int l_r2d_line(lua_State* L) {
    int x0 = (int)luaL_checknumber(L, 1);
    int y0 = (int)luaL_checknumber(L, 2);
    int x1 = (int)luaL_checknumber(L, 3);
    int y1 = (int)luaL_checknumber(L, 4);
    uint32_t col = (uint32_t)luaL_checknumber(L, 5);
    Renderer2D::draw_line(x0, y0, x1, y1, col);
    return 0;
}

static int l_r2d_rect(lua_State* L) {
    int x = (int)luaL_checknumber(L, 1);
    int y = (int)luaL_checknumber(L, 2);
    int w = (int)luaL_checknumber(L, 3);
    int h = (int)luaL_checknumber(L, 4);
    uint32_t col = (uint32_t)luaL_checknumber(L, 5);
    Renderer2D::draw_rect(x, y, w, h, col);
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

static int l_r2d_circle(lua_State* L) {
    int cx = (int)luaL_checknumber(L, 1);
    int cy = (int)luaL_checknumber(L, 2);
    int r = (int)luaL_checknumber(L, 3);
    uint32_t col = (uint32_t)luaL_checknumber(L, 4);
    Renderer2D::draw_circle(cx, cy, r, col);
    return 0;
}

static int l_r2d_fill_circle(lua_State* L) {
    int cx = (int)luaL_checknumber(L, 1);
    int cy = (int)luaL_checknumber(L, 2);
    int r = (int)luaL_checknumber(L, 3);
    uint32_t col = (uint32_t)luaL_checknumber(L, 4);
    Renderer2D::fill_circle(cx, cy, r, col);
    return 0;
}

static int l_r2d_draw_text(lua_State* L) {
    const char* text = luaL_checkstring(L, 1);
    int x = (int)luaL_checknumber(L, 2);
    int y = (int)luaL_checknumber(L, 3);
    uint32_t col = (uint32_t)luaL_optnumber(L, 4, 0xFFFFFFFF);
    int scale = (int)luaL_optnumber(L, 5, 1);
    Renderer2D::draw_text(text, x, y, col, scale);
    return 0;
}

// ----------------------------------------------------
// Lua C API Bindings: engine.renderer25d (Raycaster / Mode 7)
// ----------------------------------------------------

static int l_r25d_raycast(lua_State* L) {
    // cam_x, cam_y, dir_x, dir_y, plane_x, plane_y, map_table, map_w, map_h, ceil_col, floor_col
    Renderer25D::RaycastCamera cam;
    cam.x = (float)luaL_checknumber(L, 1);
    cam.y = (float)luaL_checknumber(L, 2);
    cam.dir_x = (float)luaL_checknumber(L, 3);
    cam.dir_y = (float)luaL_checknumber(L, 4);
    cam.plane_x = (float)luaL_checknumber(L, 5);
    cam.plane_y = (float)luaL_checknumber(L, 6);

    int map_w = (int)luaL_checknumber(L, 8);
    int map_h = (int)luaL_checknumber(L, 9);
    uint32_t ceil_col = (uint32_t)luaL_optnumber(L, 10, 0xFF1E293B);
    uint32_t floor_col = (uint32_t)luaL_optnumber(L, 11, 0xFF0F172A);

    // Read map array from table (or static memory)
    static uint8_t s_temp_map[64 * 64];
    if (lua_istable(L, 7)) {
        int total = map_w * map_h;
        if (total > 64 * 64) total = 64 * 64;
        for (int i = 0; i < total; ++i) {
            lua_rawgeti(L, 7, i + 1);
            s_temp_map[i] = (uint8_t)lua_tonumber(L, -1);
            lua_pop(L, 1);
        }
    }

    Renderer25D::render_raycaster(cam, s_temp_map, map_w, map_h, NULL, 0, NULL, 0, ceil_col, floor_col);
    return 0;
}

// ----------------------------------------------------
// Lua C API Bindings: engine.input
// ----------------------------------------------------

static int l_input_is_down(lua_State* L) {
    int key = (int)luaL_checknumber(L, 1);
    bool down = (key >= 0 && key < KEY_COUNT) ? g_engine.keys_down[key] : false;
    lua_pushboolean(L, down);
    return 1;
}

static int l_input_is_pressed(lua_State* L) {
    int key = (int)luaL_checknumber(L, 1);
    bool pressed = (key >= 0 && key < KEY_COUNT) ? g_engine.keys_pressed[key] : false;
    lua_pushboolean(L, pressed);
    return 1;
}

static int l_input_is_released(lua_State* L) {
    int key = (int)luaL_checknumber(L, 1);
    bool rel = (key >= 0 && key < KEY_COUNT) ? g_engine.keys_released[key] : false;
    lua_pushboolean(L, rel);
    return 1;
}

// ----------------------------------------------------
// Lua C API Bindings: engine.audio
// ----------------------------------------------------

static int l_audio_play_preset(lua_State* L) {
    int id = (int)luaL_checknumber(L, 1);
    AudioEngine::play_preset(id);
    return 0;
}

static int l_audio_play_sfx(lua_State* L) {
    int wave = (int)luaL_checknumber(L, 1);
    float f0 = (float)luaL_checknumber(L, 2);
    float f1 = (float)luaL_checknumber(L, 3);
    float dur = (float)luaL_checknumber(L, 4);
    float vol = (float)luaL_optnumber(L, 5, 0.5f);
    AudioEngine::play_sfx((AudioEngine::SoundWave)wave, f0, f1, dur, vol);
    return 0;
}

// ----------------------------------------------------
// Lua Engine Module Registration
// ----------------------------------------------------

namespace LuaBindings {

void init(lua_State* L) {
    // 1. Create global Key constants (KEY_UP, KEY_SOFT_LEFT, etc.)
    lua_pushinteger(L, KEY_UP);         lua_setglobal(L, "KEY_UP");
    lua_pushinteger(L, KEY_DOWN);       lua_setglobal(L, "KEY_DOWN");
    lua_pushinteger(L, KEY_LEFT);       lua_setglobal(L, "KEY_LEFT");
    lua_pushinteger(L, KEY_RIGHT);      lua_setglobal(L, "KEY_RIGHT");
    lua_pushinteger(L, KEY_FIRE);       lua_setglobal(L, "KEY_FIRE");
    lua_pushinteger(L, KEY_SOFT_LEFT);  lua_setglobal(L, "KEY_SOFT_LEFT");
    lua_pushinteger(L, KEY_SOFT_RIGHT); lua_setglobal(L, "KEY_SOFT_RIGHT");
    lua_pushinteger(L, KEY_NUM0);       lua_setglobal(L, "KEY_0");
    lua_pushinteger(L, KEY_NUM1);       lua_setglobal(L, "KEY_1");
    lua_pushinteger(L, KEY_NUM2);       lua_setglobal(L, "KEY_2");
    lua_pushinteger(L, KEY_NUM3);       lua_setglobal(L, "KEY_3");
    lua_pushinteger(L, KEY_NUM4);       lua_setglobal(L, "KEY_4");
    lua_pushinteger(L, KEY_NUM5);       lua_setglobal(L, "KEY_5");
    lua_pushinteger(L, KEY_NUM6);       lua_setglobal(L, "KEY_6");
    lua_pushinteger(L, KEY_NUM7);       lua_setglobal(L, "KEY_7");
    lua_pushinteger(L, KEY_NUM8);       lua_setglobal(L, "KEY_8");
    lua_pushinteger(L, KEY_NUM9);       lua_setglobal(L, "KEY_9");
    lua_pushinteger(L, KEY_STAR);       lua_setglobal(L, "KEY_STAR");
    lua_pushinteger(L, KEY_HASH);       lua_setglobal(L, "KEY_HASH");
    lua_pushinteger(L, KEY_CALL);       lua_setglobal(L, "KEY_CALL");
    lua_pushinteger(L, KEY_BACK);       lua_setglobal(L, "KEY_BACK");

    // Screen constants
    lua_pushinteger(L, SCREEN_WIDTH);   lua_setglobal(L, "SCREEN_WIDTH");
    lua_pushinteger(L, SCREEN_HEIGHT);  lua_setglobal(L, "SCREEN_HEIGHT");

    // 2. Build `engine` namespace table
    lua_newtable(L); // top = engine table

    // engine.renderer2d
    lua_newtable(L);
    lua_pushcfunction(L, l_r2d_clear);       lua_setfield(L, -2, "clear");
    lua_pushcfunction(L, l_r2d_pixel);       lua_setfield(L, -2, "pixel");
    lua_pushcfunction(L, l_r2d_line);        lua_setfield(L, -2, "line");
    lua_pushcfunction(L, l_r2d_rect);        lua_setfield(L, -2, "rect");
    lua_pushcfunction(L, l_r2d_fill_rect);   lua_setfield(L, -2, "fill_rect");
    lua_pushcfunction(L, l_r2d_circle);      lua_setfield(L, -2, "circle");
    lua_pushcfunction(L, l_r2d_fill_circle); lua_setfield(L, -2, "fill_circle");
    lua_pushcfunction(L, l_r2d_draw_text);   lua_setfield(L, -2, "draw_text");
    lua_setfield(L, -2, "renderer2d");

    // engine.renderer25d
    lua_newtable(L);
    lua_pushcfunction(L, l_r25d_raycast);    lua_setfield(L, -2, "raycast");
    lua_setfield(L, -2, "renderer25d");

    // engine.input
    lua_newtable(L);
    lua_pushcfunction(L, l_input_is_down);     lua_setfield(L, -2, "is_down");
    lua_pushcfunction(L, l_input_is_pressed);  lua_setfield(L, -2, "is_pressed");
    lua_pushcfunction(L, l_input_is_released); lua_setfield(L, -2, "is_released");
    lua_setfield(L, -2, "input");

    // engine.audio
    lua_newtable(L);
    lua_pushcfunction(L, l_audio_play_preset); lua_setfield(L, -2, "play_preset");
    lua_pushcfunction(L, l_audio_play_sfx);    lua_setfield(L, -2, "play_sfx");
    lua_setfield(L, -2, "audio");

    lua_setglobal(L, "engine");
}

bool execute_file(lua_State* L, const char* filepath) {
    if (luaL_dofile(L, filepath) != 0) {
        fprintf(stderr, "[Lua Error in %s]: %s\n", filepath, lua_tostring(L, -1));
        lua_pop(L, 1);
        return false;
    }
    return true;
}

bool execute_string(lua_State* L, const char* code) {
    if (luaL_dostring(L, code) != 0) {
        fprintf(stderr, "[Lua String Error]: %s\n", lua_tostring(L, -1));
        lua_pop(L, 1);
        return false;
    }
    return true;
}

void call_game_init(lua_State* L) {
    lua_getglobal(L, "init");
    if (lua_isfunction(L, -1)) {
        if (lua_pcall(L, 0, 0, 0) != 0) {
            fprintf(stderr, "[Lua Error in init()]: %s\n", lua_tostring(L, -1));
            lua_pop(L, 1);
        }
    } else {
        lua_pop(L, 1);
    }
}

void call_game_update(lua_State* L, float dt) {
    lua_getglobal(L, "update");
    if (lua_isfunction(L, -1)) {
        lua_pushnumber(L, dt);
        if (lua_pcall(L, 1, 0, 0) != 0) {
            fprintf(stderr, "[Lua Error in update()]: %s\n", lua_tostring(L, -1));
            lua_pop(L, 1);
        }
    } else {
        lua_pop(L, 1);
    }
}

void call_game_draw(lua_State* L) {
    lua_getglobal(L, "draw");
    if (lua_isfunction(L, -1)) {
        if (lua_pcall(L, 0, 0, 0) != 0) {
            fprintf(stderr, "[Lua Error in draw()]: %s\n", lua_tostring(L, -1));
            lua_pop(L, 1);
        }
    } else {
        lua_pop(L, 1);
    }
}

}
