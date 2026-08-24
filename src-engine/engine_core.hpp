#pragma once
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
    KEY_SOFT_LEFT = 5,  // SoftLeft (F1)
    KEY_SOFT_RIGHT = 6, // SoftRight (F2)
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
