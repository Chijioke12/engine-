#pragma once
#include <stdint.h>
#include "engine_core.hpp"

namespace Renderer2D {
    void clear(uint32_t color);
    void set_pixel(int x, int y, uint32_t color);
    uint32_t get_pixel(int x, int y);
    void draw_line(int x0, int y0, int x1, int y1, uint32_t color);
    void draw_rect(int x, int y, int w, int h, uint32_t color);
    void fill_rect(int x, int y, int w, int h, uint32_t color);
    void draw_circle(int cx, int cy, int radius, uint32_t color);
    void fill_circle(int cx, int cy, int radius, uint32_t color);
    void draw_sprite_raw(const uint32_t* pixels, int sx, int sy, int sw, int sh, int dx, int dy, bool flip_x, uint32_t transparent_color);
    void draw_tilemap(const uint8_t* tiles, int map_w, int map_h, const uint32_t* tileset, int tile_size, int scroll_x, int scroll_y);
    void draw_text(const char* text, int x, int y, uint32_t color, int scale);
}
