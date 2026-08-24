-- ==========================================================
-- KaiOS 2.5 Multi-Mode Game Demo (Lua 5.1 Engine Script)
-- Compile C++ once -> Write any 2D / 2.5D game purely in Lua!
-- ==========================================================

-- Engine Modes:
-- 1 = 2.5D Raycaster (Wolf3D style 3D maze)
-- 2 = 2.5D Mode 7 (SNES F-Zero style pseudo-3D plane)
-- 3 = 2D Action Platformer / Dungeon

local current_mode = 1
local mode_names = {"2.5D Raycaster", "2.5D Mode 7", "2D Action"}

-- ----------------------------------------------------------
-- 1. Raycaster State
-- ----------------------------------------------------------
local ray_player = {
    x = 3.5,
    y = 3.5,
    dir_x = 1.0,
    dir_y = 0.0,
    plane_x = 0.0,
    plane_y = 0.66,
    angle = 0.0,
    score = 0
}

local map_w = 8
local map_h = 8
local dungeon_map = {
    1, 1, 1, 1, 1, 1, 1, 1,
    1, 0, 0, 0, 0, 2, 0, 1,
    1, 0, 2, 0, 0, 0, 0, 1,
    1, 0, 2, 0, 0, 3, 0, 1,
    1, 0, 0, 0, 0, 3, 0, 1,
    1, 0, 3, 3, 0, 0, 0, 1,
    1, 0, 0, 0, 0, 2, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 1
}

-- ----------------------------------------------------------
-- 2. 2D Platformer / Arena State
-- ----------------------------------------------------------
local hero = {
    x = 120,
    y = 200,
    vx = 0,
    vy = 0,
    is_grounded = true,
    coins = 0,
    color = 0xFF38BDF8
}

local coins = {
    {x = 40, y = 180, collected = false},
    {x = 120, y = 140, collected = false},
    {x = 200, y = 180, collected = false}
}

-- ----------------------------------------------------------
-- 3. Mode 7 Racer State
-- ----------------------------------------------------------
local car = {
    x = 0,
    y = 0,
    speed = 0,
    angle = 0
}

-- ==========================================================
-- Engine Callbacks (init, update, draw)
-- ==========================================================

function init()
    engine.audio.play_preset(5) -- Startup chime
end

function update(dt)
    -- Switch Game Mode using SoftKeys or Keypad (1, 2, 3)
    if engine.input.is_pressed(KEY_SOFT_RIGHT) or engine.input.is_pressed(KEY_1) then
        current_mode = (current_mode % 3) + 1
        engine.audio.play_preset(1)
    end
    if engine.input.is_pressed(KEY_2) then
        current_mode = 2
        engine.audio.play_preset(1)
    end
    if engine.input.is_pressed(KEY_3) then
        current_mode = 3
        engine.audio.play_preset(1)
    end

    -- ------------------------------------------------------
    -- Mode 1: 2.5D Raycaster Logic
    -- ------------------------------------------------------
    if current_mode == 1 then
        local rot_speed = 2.5 * dt
        local move_speed = 3.0 * dt

        -- Turn left / right (D-Pad Left/Right or 4/6)
        if engine.input.is_down(KEY_LEFT) or engine.input.is_down(KEY_4) then
            ray_player.angle = ray_player.angle - rot_speed
        end
        if engine.input.is_down(KEY_RIGHT) or engine.input.is_down(KEY_6) then
            ray_player.angle = ray_player.angle + rot_speed
        end

        ray_player.dir_x = math.cos(ray_player.angle)
        ray_player.dir_y = math.sin(ray_player.angle)
        ray_player.plane_x = -math.sin(ray_player.angle) * 0.66
        ray_player.plane_y = math.cos(ray_player.angle) * 0.66

        -- Move forward / backward (D-Pad Up/Down or 2/8)
        if engine.input.is_down(KEY_UP) or engine.input.is_down(KEY_2) then
            local nx = ray_player.x + ray_player.dir_x * move_speed
            local ny = ray_player.y + ray_player.dir_y * move_speed
            if dungeon_map[math.floor(ny) * map_w + math.floor(nx) + 1] == 0 then
                ray_player.x = nx
                ray_player.y = ny
            end
        end
        if engine.input.is_down(KEY_DOWN) or engine.input.is_down(KEY_8) then
            local nx = ray_player.x - ray_player.dir_x * move_speed
            local ny = ray_player.y - ray_player.dir_y * move_speed
            if dungeon_map[math.floor(ny) * map_w + math.floor(nx) + 1] == 0 then
                ray_player.x = nx
                ray_player.y = ny
            end
        end

        if engine.input.is_pressed(KEY_FIRE) or engine.input.is_pressed(KEY_5) then
            engine.audio.play_preset(3) -- Laser gunshot
        end

    -- ------------------------------------------------------
    -- Mode 2: Mode 7 Racer Logic
    -- ------------------------------------------------------
    elseif current_mode == 2 then
        if engine.input.is_down(KEY_UP) or engine.input.is_down(KEY_2) then
            car.speed = math.min(car.speed + 150 * dt, 240)
        else
            car.speed = math.max(car.speed - 80 * dt, 0)
        end

        if engine.input.is_down(KEY_LEFT) or engine.input.is_down(KEY_4) then
            car.angle = car.angle - 2.5 * dt
        end
        if engine.input.is_down(KEY_RIGHT) or engine.input.is_down(KEY_6) then
            car.angle = car.angle + 2.5 * dt
        end

        car.x = car.x + math.cos(car.angle) * car.speed * dt
        car.y = car.y + math.sin(car.angle) * car.speed * dt

    -- ------------------------------------------------------
    -- Mode 3: 2D Action Platformer Logic
    -- ------------------------------------------------------
    elseif current_mode == 3 then
        local speed = 120

        if engine.input.is_down(KEY_LEFT) or engine.input.is_down(KEY_4) then
            hero.vx = -speed
        elseif engine.input.is_down(KEY_RIGHT) or engine.input.is_down(KEY_6) then
            hero.vx = speed
        else
            hero.vx = 0
        end

        -- Jump (Up or Fire / Center)
        if (engine.input.is_pressed(KEY_UP) or engine.input.is_pressed(KEY_FIRE) or engine.input.is_pressed(KEY_5)) and hero.is_grounded then
            hero.vy = -260
            hero.is_grounded = false
            engine.audio.play_preset(0) -- Jump sfx
        end

        -- Gravity
        hero.vy = hero.vy + 600 * dt
        hero.x = hero.x + hero.vx * dt
        hero.y = hero.y + hero.vy * dt

        -- Ground collision at y = 240
        if hero.y >= 240 then
            hero.y = 240
            hero.vy = 0
            hero.is_grounded = true
        end

        -- Screen bounds
        if hero.x < 16 then hero.x = 16 end
        if hero.x > 224 then hero.x = 224 end

        -- Coin collection
        for i, c in ipairs(coins) do
            if not c.collected then
                local dx = hero.x - c.x
                local dy = hero.y - c.y
                if math.sqrt(dx*dx + dy*dy) < 18 then
                    c.collected = true
                    hero.coins = hero.coins + 1
                    engine.audio.play_preset(1) -- Coin sfx
                end
            end
        end
    end
end

function draw()
    -- ------------------------------------------------------
    -- Render Mode 1: 2.5D Raycaster
    -- ------------------------------------------------------
    if current_mode == 1 then
        engine.renderer25d.raycast(
            ray_player.x, ray_player.y,
            ray_player.dir_x, ray_player.dir_y,
            ray_player.plane_x, ray_player.plane_y,
            dungeon_map, map_w, map_h,
            0xFF1E293B, 0xFF0F172A
        )

        -- Mini-map (top-left)
        engine.renderer2d.fill_rect(8, 8, 36, 36, 0xAA000000)
        for my = 0, map_h-1 do
            for mx = 0, map_w-1 do
                local tile = dungeon_map[my * map_w + mx + 1]
                if tile > 0 then
                    engine.renderer2d.fill_rect(8 + mx * 4, 8 + my * 4, 3, 3, 0xFF94A3B8)
                end
            end
        end
        -- Player dot on minimap
        engine.renderer2d.fill_rect(8 + math.floor(ray_player.x * 4), 8 + math.floor(ray_player.y * 4), 3, 3, 0xFF38BDF8)

        -- Crosshair & UI Overlay
        engine.renderer2d.fill_rect(118, 158, 4, 4, 0x88FFFFFF)
        engine.renderer2d.draw_text("2.5D RAYCASTER (Wolf3D)", 10, 290, 0xFF38BDF8, 1)
        engine.renderer2d.draw_text("SoftR: Switch Mode", 10, 305, 0xFF94A3B8, 1)

    -- ------------------------------------------------------
    -- Render Mode 2: Mode 7 Racer
    -- ------------------------------------------------------
    elseif current_mode == 2 then
        engine.renderer2d.clear(0xFF0F172A)
        -- Sky gradient horizon
        engine.renderer2d.fill_rect(0, 0, 240, 140, 0xFF0284C7)
        engine.renderer2d.fill_rect(0, 140, 240, 180, 0xFF1E293B)

        -- Pseudo-3D Track Grid Lines
        for i = 0, 12 do
            local y = 140 + i * i * 1.2
            if y < 320 then
                engine.renderer2d.draw_line(0, y, 240, y, 0xFF334155)
            end
        end

        -- Draw Player Vehicle
        engine.renderer2d.fill_rect(108, 250, 24, 16, 0xFFEF4444)
        engine.renderer2d.fill_rect(112, 246, 16, 6, 0xFFFCA5A5)
        engine.renderer2d.fill_rect(104, 254, 4, 8, 0xFF000000)
        engine.renderer2d.fill_rect(132, 254, 4, 8, 0xFF000000)

        engine.renderer2d.draw_text("2.5D MODE 7 RACER", 10, 20, 0xFF38BDF8, 1)
        engine.renderer2d.draw_text("Speed: " .. math.floor(car.speed) .. " km/h", 10, 35, 0xFFFFFFFF, 1)
        engine.renderer2d.draw_text("SoftR: Switch Mode", 10, 305, 0xFF94A3B8, 1)

    -- ------------------------------------------------------
    -- Render Mode 3: 2D Action Platformer
    -- ------------------------------------------------------
    elseif current_mode == 3 then
        engine.renderer2d.clear(0xFF0B0F19)

        -- Ground
        engine.renderer2d.fill_rect(0, 256, 240, 64, 0xFF1E293B)
        engine.renderer2d.draw_line(0, 256, 240, 256, 0xFF38BDF8)

        -- Floating Platforms
        engine.renderer2d.fill_rect(30, 200, 50, 8, 0xFF334155)
        engine.renderer2d.fill_rect(100, 160, 50, 8, 0xFF334155)
        engine.renderer2d.fill_rect(170, 200, 50, 8, 0xFF334155)

        -- Coins
        for i, c in ipairs(coins) do
            if not c.collected then
                engine.renderer2d.fill_circle(c.x, c.y, 6, 0xFFFBBF24)
                engine.renderer2d.fill_circle(c.x, c.y, 3, 0xFFF59E0B)
            end
        end

        -- Hero Character
        engine.renderer2d.fill_rect(hero.x - 8, hero.y - 16, 16, 16, hero.color)
        engine.renderer2d.fill_rect(hero.x - 4, hero.y - 12, 3, 3, 0xFFFFFFFF)
        engine.renderer2d.fill_rect(hero.x + 2, hero.y - 12, 3, 3, 0xFFFFFFFF)

        engine.renderer2d.draw_text("2D PLATFORMER", 10, 20, 0xFF38BDF8, 1)
        engine.renderer2d.draw_text("Coins: " .. hero.coins, 10, 35, 0xFFFBBF24, 1)
        engine.renderer2d.draw_text("D-Pad: Move / Fire: Jump", 10, 290, 0xFF94A3B8, 1)
        engine.renderer2d.draw_text("SoftR: Switch Mode", 10, 305, 0xFF94A3B8, 1)
    end
end
