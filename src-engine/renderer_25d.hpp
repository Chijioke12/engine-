#pragma once
#include <stdint.h>
#include "engine_core.hpp"

namespace Renderer25D {
    // Raycaster (Wolfenstein 3D style DDA)
    struct RaycastCamera {
        float x, y;          // Player position in world grid
        float dir_x, dir_y;  // Direction vector
        float plane_x, plane_y; // Camera plane (FOV)
    };

    struct BillboardSprite {
        float x, y;
        int texture_id;
        float scale;
    };

    void init_raycaster();
    void render_raycaster(
        const RaycastCamera& cam,
        const uint8_t* world_map,
        int map_w,
        int map_h,
        const uint32_t* wall_textures, // 64x64 wall textures
        int texture_count,
        const BillboardSprite* sprites,
        int sprite_count,
        uint32_t ceiling_color,
        uint32_t floor_color
    );

    // Mode 7 (SNES Affine Texture Transformation Plane)
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
    );
}
