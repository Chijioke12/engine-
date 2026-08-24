#pragma once
#include <stdint.h>

namespace AudioEngine {
    enum SoundWave {
        WAVE_SQUARE = 0,
        WAVE_TRIANGLE = 1,
        WAVE_NOISE = 2,
        WAVE_SINE = 3
    };

    void init();
    void update(float dt);
    void play_sfx(SoundWave wave, float freq_start, float freq_end, float duration, float volume);
    void play_preset(int preset_id); // 0: jump, 1: coin, 2: explosion, 3: laser, 4: hit, 5: powerup
    void stop_all();
}
