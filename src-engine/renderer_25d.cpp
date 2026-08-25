#include "renderer_25d.hpp"
#include "renderer_2d.hpp"
#include <math.h>
#include <stdlib.h>
#include <string.h>

namespace Renderer25D {

static float g_z_buffer[SCREEN_WIDTH];

void init_raycaster() {
    memset(g_z_buffer, 0, sizeof(g_z_buffer));
}

void render_raycast(
    const RaycastCamera& cam,
    const uint8_t* world_map,
    int map_w,
    int map_h,
    uint32_t ceiling_color,
    uint32_t floor_color
) {
    render_raycaster(cam, world_map, map_w, map_h, NULL, 0, NULL, 0, ceiling_color, floor_color);
}

void render_raycaster(
    const RaycastCamera& cam,
    const uint8_t* world_map,
    int map_w,
    int map_h,
    const uint32_t* wall_textures,
    int texture_count,
    const BillboardSprite* sprites,
    int sprite_count,
    uint32_t ceiling_color,
    uint32_t floor_color
) {
    int half_h = SCREEN_HEIGHT / 2;

    // 1. Draw Ceiling & Floor
    for (int y = 0; y < half_h; ++y) {
        int row = y * SCREEN_WIDTH;
        int row_floor = (SCREEN_HEIGHT - 1 - y) * SCREEN_WIDTH;
        for (int x = 0; x < SCREEN_WIDTH; ++x) {
            g_engine.framebuffer[row + x] = ceiling_color;
            g_engine.framebuffer[row_floor + x] = floor_color;
        }
    }

    // 2. Raycast Wall Columns (DDA algorithm)
    for (int x = 0; x < SCREEN_WIDTH; ++x) {
        float camera_x = 2.0f * x / (float)SCREEN_WIDTH - 1.0f;
        float ray_dir_x = cam.dir_x + cam.plane_x * camera_x;
        float ray_dir_y = cam.dir_y + cam.plane_y * camera_x;

        int map_box_x = (int)cam.x;
        int map_box_y = (int)cam.y;

        float delta_dist_x = (ray_dir_x == 0) ? 1e30f : fabsf(1.0f / ray_dir_x);
        float delta_dist_y = (ray_dir_y == 0) ? 1e30f : fabsf(1.0f / ray_dir_y);

        float side_dist_x, side_dist_y;
        int step_x, step_y;
        int hit = 0;
        int side = 0; // 0 = X-wall, 1 = Y-wall
        uint8_t hit_tile = 0;

        if (ray_dir_x < 0) {
            step_x = -1;
            side_dist_x = (cam.x - map_box_x) * delta_dist_x;
        } else {
            step_x = 1;
            side_dist_x = (map_box_x + 1.0f - cam.x) * delta_dist_x;
        }

        if (ray_dir_y < 0) {
            step_y = -1;
            side_dist_y = (cam.y - map_box_y) * delta_dist_y;
        } else {
            step_y = 1;
            side_dist_y = (map_box_y + 1.0f - cam.y) * delta_dist_y;
        }

        // Perform DDA
        while (hit == 0) {
            if (side_dist_x < side_dist_y) {
                side_dist_x += delta_dist_x;
                map_box_x += step_x;
                side = 0;
            } else {
                side_dist_y += delta_dist_y;
                map_box_y += step_y;
                side = 1;
            }

            if (map_box_x < 0 || map_box_x >= map_w || map_box_y < 0 || map_box_y >= map_h) {
                hit = 1;
                hit_tile = 1; // Map boundary wall
            } else {
                uint8_t t = world_map[map_box_y * map_w + map_box_x];
                if (t > 0) {
                    hit = 1;
                    hit_tile = t;
                }
            }
        }

        float perp_wall_dist;
        if (side == 0) {
            perp_wall_dist = (side_dist_x - delta_dist_x);
        } else {
            perp_wall_dist = (side_dist_y - delta_dist_y);
        }
        if (perp_wall_dist < 0.05f) perp_wall_dist = 0.05f;

        g_z_buffer[x] = perp_wall_dist;

        // Calculate wall height on 240x320 screen
        int line_height = (int)(SCREEN_HEIGHT / perp_wall_dist);
        int draw_start = -line_height / 2 + SCREEN_HEIGHT / 2;
        if (draw_start < 0) draw_start = 0;
        int draw_end = line_height / 2 + SCREEN_HEIGHT / 2;
        if (draw_end >= SCREEN_HEIGHT) draw_end = SCREEN_HEIGHT - 1;

        // Wall Texture coordinates
        float wall_x;
        if (side == 0) wall_x = cam.y + perp_wall_dist * ray_dir_y;
        else           wall_x = cam.x + perp_wall_dist * ray_dir_x;
        wall_x -= floorf(wall_x);

        int tex_x = (int)(wall_x * 64.0f);
        if (side == 0 && ray_dir_x > 0) tex_x = 64 - tex_x - 1;
        if (side == 1 && ray_dir_y < 0) tex_x = 64 - tex_x - 1;

        int tex_id = (hit_tile - 1) % (texture_count > 0 ? texture_count : 1);
        const uint32_t* tex_ptr = wall_textures ? &wall_textures[tex_id * 64 * 64] : NULL;

        float step = 64.0f / (float)line_height;
        float tex_pos = (draw_start - SCREEN_HEIGHT / 2 + line_height / 2) * step;

        for (int y = draw_start; y < draw_end; ++y) {
            int tex_y = (int)tex_pos & 63;
            tex_pos += step;

            uint32_t color;
            if (tex_ptr) {
                color = tex_ptr[tex_y * 64 + tex_x];
            } else {
                color = (hit_tile == 1) ? 0xFFE11D48 : (hit_tile == 2) ? 0xFF0284C7 : 0xFF10B981;
            }

            // Darken Y-sides for cheap realistic 3D lighting
            if (side == 1) {
                uint32_t r = ((color >> 16) & 0xFF) * 3 / 4;
                uint32_t g = ((color >> 8) & 0xFF) * 3 / 4;
                uint32_t b = (color & 0xFF) * 3 / 4;
                color = (0xFF << 24) | (r << 16) | (g << 8) | b;
            }

            g_engine.framebuffer[y * SCREEN_WIDTH + x] = color;
        }
    }
}

void render_mode7(
    float cam_x,
    float cam_y,
    float cam_angle,
    float horizon_y,
    float scale_x,
    float scale_y,
    const uint32_t* texture,
    int tex_w,
    int tex_h,
    uint32_t sky_color
) {
    int horiz = (int)horizon_y;
    if (horiz < 0) horiz = 0;
    if (horiz > SCREEN_HEIGHT) horiz = SCREEN_HEIGHT;

    // Draw Sky
    for (int y = 0; y < horiz; ++y) {
        int row = y * SCREEN_WIDTH;
        for (int x = 0; x < SCREEN_WIDTH; ++x) {
            g_engine.framebuffer[row + x] = sky_color;
        }
    }

    float cos_a = cosf(cam_angle);
    float sin_a = sinf(cam_angle);

    // Render perspective plane below horizon
    for (int y = horiz; y < SCREEN_HEIGHT; ++y) {
        float distance = (float)SCREEN_HEIGHT / (float)(y - horiz + 0.1f);
        float row_scale_x = distance * scale_x;
        float row_scale_y = distance * scale_y;

        float start_x = cam_x + (-SCREEN_WIDTH / 2.0f * cos_a - distance * sin_a) * (scale_x / 100.0f);
        float start_y = cam_y + (-SCREEN_WIDTH / 2.0f * sin_a + distance * cos_a) * (scale_y / 100.0f);

        float step_dx = (cos_a * (scale_x / 100.0f));
        float step_dy = (sin_a * (scale_y / 100.0f));

        float cur_u = start_x;
        float cur_v = start_y;
        int row_offset = y * SCREEN_WIDTH;

        for (int x = 0; x < SCREEN_WIDTH; ++x) {
            int tx = ((int)cur_u) % tex_w;
            int ty = ((int)cur_v) % tex_h;
            if (tx < 0) tx += tex_w;
            if (ty < 0) ty += tex_h;

            uint32_t col = texture[ty * tex_w + tx];
            g_engine.framebuffer[row_offset + x] = col;

            cur_u += step_dx;
            cur_v += step_dy;
        }
    }
}

}
