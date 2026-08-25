#include "engine_core.hpp"
#include <string.h>

void engine_init() {
    memset(&g_engine, 0, sizeof(g_engine));
    g_engine.is_running = true;
}

void engine_update(float dt) {
    g_engine.delta_time = dt;
    g_engine.total_time += dt;
    g_engine.frame_count++;
}

void engine_render() {
    // Framebuffer ready for blit
}

void engine_shutdown() {
    g_engine.is_running = false;
}

void engine_set_key_state(int key_code, bool is_down) {
    if (key_code >= 0 && key_code < KEY_COUNT) {
        if (is_down) {
            if (!g_engine.keys_down[key_code]) {
                g_engine.keys_pressed[key_code] = true;
                g_engine.pending_keys_pressed[key_code] = true;
            }
            g_engine.keys_down[key_code] = true;
        } else {
            if (g_engine.keys_down[key_code]) {
                g_engine.keys_released[key_code] = true;
                g_engine.pending_keys_released[key_code] = true;
            }
            g_engine.keys_down[key_code] = false;
        }
    }
}
