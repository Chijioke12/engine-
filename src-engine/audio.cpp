#include "audio.hpp"
#include <SDL2/SDL.h>
#include <math.h>
#include <string.h>

namespace AudioEngine {

#define MAX_CHANNELS 4
#define AUDIO_SAMPLE_RATE 22050

struct Channel {
    bool active;
    SoundWave wave;
    float freq_start;
    float freq_end;
    float current_freq;
    float duration;
    float elapsed;
    float volume;
    float phase;
};

static Channel g_channels[MAX_CHANNELS];
static SDL_AudioDeviceID g_audio_device = 0;

static void audio_callback(void* userdata, Uint8* stream, int len) {
    int16_t* buffer = (int16_t*)stream;
    int samples = len / sizeof(int16_t);

    for (int i = 0; i < samples; ++i) {
        float mix = 0.0f;

        for (int ch = 0; ch < MAX_CHANNELS; ++ch) {
            Channel& c = g_channels[ch];
            if (!c.active) continue;

            float t = c.elapsed / c.duration;
            if (t >= 1.0f) {
                c.active = false;
                continue;
            }

            c.current_freq = c.freq_start + (c.freq_end - c.freq_start) * t;
            float phase_inc = (2.0f * 3.14159265f * c.current_freq) / (float)AUDIO_SAMPLE_RATE;
            c.phase += phase_inc;
            if (c.phase > 2.0f * 3.14159265f) c.phase -= 2.0f * 3.14159265f;

            float sample = 0.0f;
            switch (c.wave) {
                case WAVE_SQUARE:
                    sample = (sinf(c.phase) >= 0.0f) ? 1.0f : -1.0f;
                    break;
                case WAVE_TRIANGLE:
                    sample = 2.0f * fabsf(2.0f * (c.phase / (2.0f * 3.14159265f) - floorf(c.phase / (2.0f * 3.14159265f) + 0.5f))) - 1.0f;
                    break;
                case WAVE_NOISE:
                    sample = ((float)rand() / (float)RAND_MAX) * 2.0f - 1.0f;
                    break;
                case WAVE_SINE:
                    sample = sinf(c.phase);
                    break;
            }

            float envelope = (1.0f - t); // Simple linear decay
            mix += sample * c.volume * envelope;
            c.elapsed += (1.0f / (float)AUDIO_SAMPLE_RATE);
        }

        // Clamp & Output 16-bit PCM
        if (mix > 1.0f) mix = 1.0f;
        if (mix < -1.0f) mix = -1.0f;
        buffer[i] = (int16_t)(mix * 32767.0f);
    }
}

void init() {
    memset(g_channels, 0, sizeof(g_channels));

    SDL_AudioSpec wanted, obtained;
    SDL_zero(wanted);
    wanted.freq = AUDIO_SAMPLE_RATE;
    wanted.format = AUDIO_S16SYS;
    wanted.channels = 1;
    wanted.samples = 512;
    wanted.callback = audio_callback;

    g_audio_device = SDL_OpenAudioDevice(NULL, 0, &wanted, &obtained, 0);
    if (g_audio_device != 0) {
        SDL_PauseAudioDevice(g_audio_device, 0); // Start audio
    }
}

void update(float dt) {
    // Synchronized in callback
}

void play_sfx(SoundWave wave, float freq_start, float freq_end, float duration, float volume) {
    for (int i = 0; i < MAX_CHANNELS; ++i) {
        if (!g_channels[i].active) {
            g_channels[i].active = true;
            g_channels[i].wave = wave;
            g_channels[i].freq_start = freq_start;
            g_channels[i].freq_end = freq_end;
            g_channels[i].current_freq = freq_start;
            g_channels[i].duration = duration;
            g_channels[i].elapsed = 0.0f;
            g_channels[i].volume = volume;
            g_channels[i].phase = 0.0f;
            return;
        }
    }
}

void play_preset(int preset_id) {
    switch (preset_id) {
        case 0: // Jump
            play_sfx(WAVE_SQUARE, 180.0f, 440.0f, 0.15f, 0.35f);
            break;
        case 1: // Coin
            play_sfx(WAVE_SINE, 440.0f, 880.0f, 0.20f, 0.40f);
            break;
        case 2: // Explosion
            play_sfx(WAVE_NOISE, 200.0f, 50.0f, 0.45f, 0.50f);
            break;
        case 3: // Laser
            play_sfx(WAVE_TRIANGLE, 900.0f, 220.0f, 0.12f, 0.40f);
            break;
        case 4: // Hit
            play_sfx(WAVE_NOISE, 120.0f, 30.0f, 0.10f, 0.30f);
            break;
        case 5: // Powerup
            play_sfx(WAVE_SQUARE, 220.0f, 660.0f, 0.35f, 0.40f);
            break;
    }
}

void stop_all() {
    for (int i = 0; i < MAX_CHANNELS; ++i) {
        g_channels[i].active = false;
    }
}

}
