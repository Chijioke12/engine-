#pragma once

struct lua_State;

namespace LuaBindings {
    void init(lua_State* L);
    bool execute_file(lua_State* L, const char* filepath);
    bool execute_string(lua_State* L, const char* code);
    void call_game_init(lua_State* L);
    void call_game_update(lua_State* L, float dt);
    void call_game_draw(lua_State* L);
}
