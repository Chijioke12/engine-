#include "lua_bindings.hpp"
#include "engine_core.hpp"
#include "renderer_2d.hpp"
#include "renderer_25d.hpp"
#include "audio.hpp"
#include "physics_2d.hpp"

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
    Renderer25D::RaycastCamera cam;
    cam.x = (float)luaL_checknumber(L, 1);
    cam.y = (float)luaL_checknumber(L, 2);
    cam.dir_x = (float)luaL_checknumber(L, 3);
    cam.dir_y = (float)luaL_checknumber(L, 4);
    cam.plane_x = (float)luaL_checknumber(L, 5);
    cam.plane_y = (float)luaL_checknumber(L, 6);

    if (!lua_istable(L, 7)) {
        luaL_error(L, "raycast expected map table at arg 7");
        return 0;
    }

    int map_w = (int)luaL_checknumber(L, 8);
    int map_h = (int)luaL_checknumber(L, 9);
    uint32_t ceil_col = (uint32_t)luaL_optnumber(L, 10, 0xFF1E293B);
    uint32_t floor_col = (uint32_t)luaL_optnumber(L, 11, 0xFF0F172A);

    int total_tiles = map_w * map_h;
    uint8_t* map_data = (uint8_t*)malloc(total_tiles);
    if (!map_data) return 0;

    for (int i = 1; i <= total_tiles; ++i) {
        lua_rawgeti(L, 7, i);
        map_data[i - 1] = (uint8_t)lua_tonumber(L, -1);
        lua_pop(L, 1);
    }

    Renderer25D::render_raycast(cam, map_data, map_w, map_h, ceil_col, floor_col);
    free(map_data);
    return 0;
}

// ----------------------------------------------------
// Lua C API Bindings: engine.physics (Box2D-Lite Rigid Bodies & Joints)
// ----------------------------------------------------

static int l_physics_set_gravity(lua_State* L) {
    float gx = (float)luaL_checknumber(L, 1);
    float gy = (float)luaL_checknumber(L, 2);
    PhysicsEngine::set_gravity(gx, gy);
    return 0;
}

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

static int l_physics_create_circle(lua_State* L) {
    float x = (float)luaL_checknumber(L, 1);
    float y = (float)luaL_checknumber(L, 2);
    float r = (float)luaL_checknumber(L, 3);
    float mass = (float)luaL_optnumber(L, 4, 1.0f);
    float friction = (float)luaL_optnumber(L, 5, 0.3f);
    float restitution = (float)luaL_optnumber(L, 6, 0.6f);
    bool is_static = lua_toboolean(L, 7);

    int id = PhysicsEngine::create_circle(x, y, r, mass, friction, restitution, is_static);
    lua_pushinteger(L, id);
    return 1;
}

static int l_physics_get_body(lua_State* L) {
    int id = (int)luaL_checknumber(L, 1);
    RigidBody* b = PhysicsEngine::get_body(id);
    if (!b) {
        lua_pushnil(L);
        return 1;
    }

    lua_newtable(L);
    lua_pushnumber(L, b->position.x); lua_setfield(L, -2, "x");
    lua_pushnumber(L, b->position.y); lua_setfield(L, -2, "y");
    lua_pushnumber(L, b->rotation);   lua_setfield(L, -2, "angle");
    lua_pushnumber(L, b->velocity.x); lua_setfield(L, -2, "vx");
    lua_pushnumber(L, b->velocity.y); lua_setfield(L, -2, "vy");
    lua_pushnumber(L, b->width_height.x); lua_setfield(L, -2, "w");
    lua_pushnumber(L, b->width_height.y); lua_setfield(L, -2, "h");
    return 1;
}

static int l_physics_apply_impulse(lua_State* L) {
    int id = (int)luaL_checknumber(L, 1);
    float jx = (float)luaL_checknumber(L, 2);
    float jy = (float)luaL_checknumber(L, 3);
    RigidBody* b = PhysicsEngine::get_body(id);
    if (b) {
        PhysicsEngine::apply_impulse(id, jx, jy, b->position.x, b->position.y);
    }
    return 0;
}

static int l_physics_set_velocity(lua_State* L) {
    int id = (int)luaL_checknumber(L, 1);
    float vx = (float)luaL_checknumber(L, 2);
    float vy = (float)luaL_checknumber(L, 3);
    PhysicsEngine::set_velocity(id, vx, vy);
    return 0;
}

static int l_physics_create_joint(lua_State* L) {
    int ba = (int)luaL_checknumber(L, 1);
    int bb = (int)luaL_checknumber(L, 2);
    float ax = (float)luaL_checknumber(L, 3);
    float ay = (float)luaL_checknumber(L, 4);
    int jid = PhysicsEngine::create_revolute_joint(ba, bb, ax, ay);
    lua_pushinteger(L, jid);
    return 1;
}

static int l_physics_step(lua_State* L) {
    float dt = (float)luaL_checknumber(L, 1);
    int iterations = (int)luaL_optnumber(L, 2, 8);
    PhysicsEngine::step(dt, iterations);
    return 0;
}

static int l_physics_clear(lua_State* L) {
    PhysicsEngine::clear_world();
    return 0;
}

// ----------------------------------------------------
// Lua C API Bindings: engine.input
// ----------------------------------------------------

static int l_input_is_down(lua_State* L) {
    int key = (int)luaL_checknumber(L, 1);
    lua_pushboolean(L, EngineCore::is_key_down(key));
    return 1;
}

static int l_input_is_pressed(lua_State* L) {
    int key = (int)luaL_checknumber(L, 1);
    lua_pushboolean(L, EngineCore::is_key_pressed(key));
    return 1;
}

static int l_input_is_released(lua_State* L) {
    int key = (int)luaL_checknumber(L, 1);
    lua_pushboolean(L, EngineCore::is_key_released(key));
    return 1;
}

// ----------------------------------------------------
// Lua C API Bindings: engine.audio
// ----------------------------------------------------

static int l_audio_play_preset(lua_State* L) {
    int preset_id = (int)luaL_checknumber(L, 1);
    AudioEngine::play_preset(preset_id);
    return 0;
}

static int l_audio_play_sfx(lua_State* L) {
    int wave_type = (int)luaL_checknumber(L, 1);
    float freq = (float)luaL_checknumber(L, 2);
    float duration = (float)luaL_checknumber(L, 3);
    float vol = (float)luaL_optnumber(L, 4, 0.5f);
    AudioEngine::play_sfx((AudioEngine::SoundWave)wave_type, freq, freq, duration, vol);
    return 0;
}

// ----------------------------------------------------
// Module Initialization & Registration
// ----------------------------------------------------

namespace LuaBindings {

void register_engine_api(lua_State* L) {
    // 1. Key constants
    lua_pushinteger(L, KEY_UP);         lua_setglobal(L, "KEY_UP");
    lua_pushinteger(L, KEY_DOWN);       lua_setglobal(L, "KEY_DOWN");
    lua_pushinteger(L, KEY_LEFT);       lua_setglobal(L, "KEY_LEFT");
    lua_pushinteger(L, KEY_RIGHT);      lua_setglobal(L, "KEY_RIGHT");
    lua_pushinteger(L, KEY_FIRE);       lua_setglobal(L, "KEY_FIRE");
    lua_pushinteger(L, KEY_SOFT_LEFT);  lua_setglobal(L, "KEY_SOFT_LEFT");
    lua_pushinteger(L, KEY_SOFT_RIGHT); lua_setglobal(L, "KEY_SOFT_RIGHT");
    lua_pushinteger(L, KEY_0);          lua_setglobal(L, "KEY_0");
    lua_pushinteger(L, KEY_1);          lua_setglobal(L, "KEY_1");
    lua_pushinteger(L, KEY_2);          lua_setglobal(L, "KEY_2");
    lua_pushinteger(L, KEY_3);          lua_setglobal(L, "KEY_3");
    lua_pushinteger(L, KEY_4);          lua_setglobal(L, "KEY_4");
    lua_pushinteger(L, KEY_5);          lua_setglobal(L, "KEY_5");
    lua_pushinteger(L, KEY_6);          lua_setglobal(L, "KEY_6");
    lua_pushinteger(L, KEY_7);          lua_setglobal(L, "KEY_7");
    lua_pushinteger(L, KEY_8);          lua_setglobal(L, "KEY_8");
    lua_pushinteger(L, KEY_9);          lua_setglobal(L, "KEY_9");
    lua_pushinteger(L, KEY_NUM0);       lua_setglobal(L, "KEY_NUM0");
    lua_pushinteger(L, KEY_NUM1);       lua_setglobal(L, "KEY_NUM1");
    lua_pushinteger(L, KEY_NUM2);       lua_setglobal(L, "KEY_NUM2");
    lua_pushinteger(L, KEY_NUM3);       lua_setglobal(L, "KEY_NUM3");
    lua_pushinteger(L, KEY_NUM4);       lua_setglobal(L, "KEY_NUM4");
    lua_pushinteger(L, KEY_NUM5);       lua_setglobal(L, "KEY_NUM5");
    lua_pushinteger(L, KEY_NUM6);       lua_setglobal(L, "KEY_NUM6");
    lua_pushinteger(L, KEY_NUM7);       lua_setglobal(L, "KEY_NUM7");
    lua_pushinteger(L, KEY_NUM8);       lua_setglobal(L, "KEY_NUM8");
    lua_pushinteger(L, KEY_NUM9);       lua_setglobal(L, "KEY_NUM9");
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
    lua_pushcfunction(L, l_r2d_line);        lua_setfield(L, -2, "draw_line");
    lua_pushcfunction(L, l_r2d_rect);        lua_setfield(L, -2, "rect");
    lua_pushcfunction(L, l_r2d_rect);        lua_setfield(L, -2, "draw_rect");
    lua_pushcfunction(L, l_r2d_fill_rect);   lua_setfield(L, -2, "fill_rect");
    lua_pushcfunction(L, l_r2d_circle);      lua_setfield(L, -2, "circle");
    lua_pushcfunction(L, l_r2d_circle);      lua_setfield(L, -2, "draw_circle");
    lua_pushcfunction(L, l_r2d_fill_circle); lua_setfield(L, -2, "fill_circle");
    lua_pushcfunction(L, l_r2d_draw_text);   lua_setfield(L, -2, "draw_text");
    lua_setfield(L, -2, "renderer2d");

    // engine.renderer25d
    lua_newtable(L);
    lua_pushcfunction(L, l_r25d_raycast);    lua_setfield(L, -2, "raycast");
    lua_setfield(L, -2, "renderer25d");

    // engine.physics (Box2D-Lite)
    lua_newtable(L);
    lua_pushcfunction(L, l_physics_set_gravity);   lua_setfield(L, -2, "set_gravity");
    lua_pushcfunction(L, l_physics_create_box);     lua_setfield(L, -2, "create_box");
    lua_pushcfunction(L, l_physics_create_circle);  lua_setfield(L, -2, "create_circle");
    lua_pushcfunction(L, l_physics_get_body);       lua_setfield(L, -2, "get_body");
    lua_pushcfunction(L, l_physics_apply_impulse);  lua_setfield(L, -2, "apply_impulse");
    lua_pushcfunction(L, l_physics_set_velocity);   lua_setfield(L, -2, "set_velocity");
    lua_pushcfunction(L, l_physics_create_joint);   lua_setfield(L, -2, "create_joint");
    lua_pushcfunction(L, l_physics_step);           lua_setfield(L, -2, "step");
    lua_pushcfunction(L, l_physics_clear);          lua_setfield(L, -2, "clear");
    lua_setfield(L, -2, "physics");

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

void init(lua_State* L) {
    register_engine_api(L);
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
