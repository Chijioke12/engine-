#include "renderer_2d.hpp"
#include <string.h>
#include <stdlib.h>
#include <math.h>

namespace Renderer2D {

void clear(uint32_t color) {
    for (int i = 0; i < SCREEN_WIDTH * SCREEN_HEIGHT; ++i) {
        g_engine.framebuffer[i] = color;
    }
}

void set_pixel(int x, int y, uint32_t color) {
    if (x >= 0 && x < SCREEN_WIDTH && y >= 0 && y < SCREEN_HEIGHT) {
        g_engine.framebuffer[y * SCREEN_WIDTH + x] = color;
    }
}

uint32_t get_pixel(int x, int y) {
    if (x >= 0 && x < SCREEN_WIDTH && y >= 0 && y < SCREEN_HEIGHT) {
        return g_engine.framebuffer[y * SCREEN_WIDTH + x];
    }
    return 0;
}

void draw_line(int x0, int y0, int x1, int y1, uint32_t color) {
    int dx = abs(x1 - x0);
    int dy = abs(y1 - y0);
    int sx = (x0 < x1) ? 1 : -1;
    int sy = (y0 < y1) ? 1 : -1;
    int err = dx - dy;

    while (true) {
        set_pixel(x0, y0, color);
        if (x0 == x1 && y0 == y1) break;
        int e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}

void draw_rect(int x, int y, int w, int h, uint32_t color) {
    draw_line(x, y, x + w - 1, y, color);
    draw_line(x, y + h - 1, x + w - 1, y + h - 1, color);
    draw_line(x, y, x, y + h - 1, color);
    draw_line(x + w - 1, y, x + w - 1, y + h - 1, color);
}

void fill_rect(int x, int y, int w, int h, uint32_t color) {
    int x0 = (x < 0) ? 0 : x;
    int y0 = (y < 0) ? 0 : y;
    int x1 = (x + w > SCREEN_WIDTH) ? SCREEN_WIDTH : x + w;
    int y1 = (y + h > SCREEN_HEIGHT) ? SCREEN_HEIGHT : y + h;

    for (int py = y0; py < y1; ++py) {
        int row_offset = py * SCREEN_WIDTH;
        for (int px = x0; px < x1; ++px) {
            g_engine.framebuffer[row_offset + px] = color;
        }
    }
}

void draw_circle(int cx, int cy, int radius, uint32_t color) {
    int x = radius;
    int y = 0;
    int err = 0;

    while (x >= y) {
        set_pixel(cx + x, cy + y, color);
        set_pixel(cx + y, cy + x, color);
        set_pixel(cx - y, cy + x, color);
        set_pixel(cx - x, cy + y, color);
        set_pixel(cx - x, cy - y, color);
        set_pixel(cx - y, cy - x, color);
        set_pixel(cx + y, cy - x, color);
        set_pixel(cx + x, cy - y, color);

        if (err <= 0) {
            y += 1;
            err += 2 * y + 1;
        }
        if (err > 0) {
            x -= 1;
            err -= 2 * x + 1;
        }
    }
}

void fill_circle(int cx, int cy, int radius, uint32_t color) {
    for (int y = -radius; y <= radius; ++y) {
        for (int x = -radius; x <= radius; ++x) {
            if (x * x + y * y <= radius * radius) {
                set_pixel(cx + x, cy + y, color);
            }
        }
    }
}

void draw_sprite_raw(const uint32_t* pixels, int sx, int sy, int sw, int sh, int dx, int dy, bool flip_x, uint32_t transparent_color) {
    for (int y = 0; y < sh; ++y) {
        int target_y = dy + y;
        if (target_y < 0 || target_y >= SCREEN_HEIGHT) continue;
        for (int x = 0; x < sw; ++x) {
            int target_x = dx + (flip_x ? (sw - 1 - x) : x);
            if (target_x < 0 || target_x >= SCREEN_WIDTH) continue;

            uint32_t col = pixels[(sy + y) * sw + (sx + x)];
            if ((col & 0x00FFFFFF) != (transparent_color & 0x00FFFFFF)) {
                g_engine.framebuffer[target_y * SCREEN_WIDTH + target_x] = col;
            }
        }
    }
}

void draw_tilemap(const uint8_t* tiles, int map_w, int map_h, const uint32_t* tileset, int tile_size, int scroll_x, int scroll_y) {
    int start_tile_x = scroll_x / tile_size;
    int start_tile_y = scroll_y / tile_size;
    int end_tile_x = (scroll_x + SCREEN_WIDTH) / tile_size + 1;
    int end_tile_y = (scroll_y + SCREEN_HEIGHT) / tile_size + 1;

    if (start_tile_x < 0) start_tile_x = 0;
    if (start_tile_y < 0) start_tile_y = 0;
    if (end_tile_x > map_w) end_tile_x = map_w;
    if (end_tile_y > map_h) end_tile_y = map_h;

    for (int ty = start_tile_y; ty < end_tile_y; ++ty) {
        for (int tx = start_tile_x; tx < end_tile_x; ++tx) {
            uint8_t tile_id = tiles[ty * map_w + tx];
            if (tile_id == 0) continue; // 0 = empty air

            int screen_x = tx * tile_size - scroll_x;
            int screen_y = ty * tile_size - scroll_y;
            int tile_offset = (tile_id - 1) * tile_size * tile_size;

            for (int py = 0; py < tile_size; ++py) {
                int dest_y = screen_y + py;
                if (dest_y < 0 || dest_y >= SCREEN_HEIGHT) continue;
                for (int px = 0; px < tile_size; ++px) {
                    int dest_x = screen_x + px;
                    if (dest_x < 0 || dest_x >= SCREEN_WIDTH) continue;
                    uint32_t col = tileset[tile_offset + py * tile_size + px];
                    g_engine.framebuffer[dest_y * SCREEN_WIDTH + dest_x] = col;
                }
            }
        }
    }
}

// Built-in 4x6 micro bitmap font for KaiOS 240x320 UI
static const uint8_t MICRO_FONT[96][5] = {
    {0x00,0x00,0x00,0x00,0x00}, // space
    {0x00,0x00,0x5F,0x00,0x00}, // !
    {0x00,0x07,0x00,0x07,0x00}, // "
    {0x14,0x7F,0x14,0x7F,0x14}, // #
    {0x24,0x2A,0x7F,0x2A,0x12}, // $
    {0x23,0x13,0x08,0x64,0x62}, // %
    {0x36,0x49,0x55,0x22,0x50}, // &
    {0x00,0x05,0x03,0x00,0x00}, // '
    {0x00,0x1C,0x22,0x41,0x00}, // (
    {0x00,0x41,0x22,0x1C,0x00}, // )
    {0x08,0x2A,0x1C,0x2A,0x08}, // *
    {0x08,0x08,0x3E,0x08,0x08}, // +
    {0x00,0x50,0x30,0x00,0x00}, // ,
    {0x08,0x08,0x08,0x08,0x08}, // -
    {0x00,0x60,0x60,0x00,0x00}, // .
    {0x20,0x10,0x08,0x04,0x02}, // /
    {0x3E,0x51,0x49,0x45,0x3E}, // 0
    {0x00,0x42,0x7F,0x40,0x00}, // 1
    {0x42,0x61,0x51,0x49,0x46}, // 2
    {0x21,0x41,0x45,0x4B,0x31}, // 3
    {0x18,0x14,0x12,0x7F,0x10}, // 4
    {0x27,0x45,0x45,0x45,0x39}, // 5
    {0x3C,0x4A,0x49,0x49,0x30}, // 6
    {0x01,0x71,0x09,0x05,0x03}, // 7
    {0x36,0x49,0x49,0x49,0x36}, // 8
    {0x06,0x49,0x49,0x29,0x1E}, // 9
    {0x00,0x36,0x36,0x00,0x00}, // :
    {0x00,0x56,0x36,0x00,0x00}, // ;
    {0x00,0x08,0x14,0x22,0x41}, // <
    {0x14,0x14,0x14,0x14,0x14}, // =
    {0x41,0x22,0x14,0x08,0x00}, // >
    {0x02,0x01,0x51,0x09,0x06}, // ?
    {0x32,0x49,0x79,0x41,0x3E}, // @
    {0x7E,0x11,0x11,0x11,0x7E}, // A
    {0x7F,0x49,0x49,0x49,0x36}, // B
    {0x3E,0x41,0x41,0x41,0x22}, // C
    {0x7F,0x41,0x41,0x22,0x1C}, // D
    {0x7F,0x49,0x49,0x49,0x41}, // E
    {0x7F,0x09,0x09,0x01,0x01}, // F
    {0x3E,0x41,0x41,0x51,0x32}, // G
    {0x7F,0x08,0x08,0x08,0x7F}, // H
    {0x00,0x41,0x7F,0x41,0x00}, // I
    {0x20,0x40,0x41,0x3F,0x01}, // J
    {0x7F,0x08,0x14,0x22,0x41}, // K
    {0x7F,0x40,0x40,0x40,0x40}, // L
    {0x7F,0x02,0x04,0x02,0x7F}, // M
    {0x7F,0x04,0x08,0x10,0x7F}, // N
    {0x3E,0x41,0x41,0x41,0x3E}, // O
    {0x7F,0x09,0x09,0x09,0x06}, // P
    {0x3E,0x41,0x51,0x21,0x5E}, // Q
    {0x7F,0x09,0x19,0x29,0x46}, // R
    {0x46,0x49,0x49,0x49,0x31}, // S
    {0x01,0x01,0x7F,0x01,0x01}, // T
    {0x3F,0x40,0x40,0x40,0x3F}, // U
    {0x1F,0x20,0x40,0x20,0x1F}, // V
    {0x7F,0x20,0x18,0x20,0x7F}, // W
    {0x63,0x14,0x08,0x14,0x63}, // X
    {0x03,0x04,0x78,0x04,0x03}, // Y
    {0x61,0x51,0x49,0x45,0x43}  // Z
};

void draw_text(const char* text, int x, int y, uint32_t color, int scale) {
    if (!text || scale <= 0) return;
    int cur_x = x;
    int cur_y = y;

    for (int i = 0; text[i] != '\0'; ++i) {
        char c = text[i];
        if (c == '\n') {
            cur_y += 8 * scale;
            cur_x = x;
            continue;
        }
        if (c >= 'a' && c <= 'z') {
            c = c - 'a' + 'A'; // Uppercase fallback
        }
        if (c < 32 || c > 90) c = '?';

        int glyph_idx = c - 32;
        for (int col = 0; col < 5; ++col) {
            uint8_t line = MICRO_FONT[glyph_idx][col];
            for (int row = 0; row < 8; ++row) {
                if (line & (1 << row)) {
                    if (scale == 1) {
                        set_pixel(cur_x + col, cur_y + row, color);
                    } else {
                        fill_rect(cur_x + col * scale, cur_y + row * scale, scale, scale, color);
                    }
                }
            }
        }
        cur_x += 6 * scale;
    }
}

}
