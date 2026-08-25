import React, { useState } from 'react';
import { Play, Copy, Check, Sparkles, RefreshCw, FileCode, Zap } from 'lucide-react';
import { GameMode } from '../types';

interface LuaEditorProps {
  currentScript: string;
  onApplyScript: (script: string) => void;
  activeMode: GameMode;
  onSelectModePreset: (mode: GameMode) => void;
}

const PRESET_SCRIPTS: Record<GameMode, string> = {
  box2d: `-- ===============================================
-- 2D Rigid Body Box2D Physics & Angry Birds Style
-- Powered by C++ Box2D-Lite & Lua 5.1 on KaiOS 2.5
-- ===============================================

function init()
    -- Set gravity (x=0, y=500 pixels/sec^2)
    engine.physics.set_gravity(0, 500)
    engine.physics.clear()

    -- 1. Create Static Ground & Walls
    ground_id = engine.physics.create_box(120, 290, 240, 20, 0, 0.5, 0.2, true)
    left_wall = engine.physics.create_box(0, 160, 10, 320, 0, 0.2, 0.5, true)
    right_wall = engine.physics.create_box(240, 160, 10, 320, 0, 0.2, 0.5, true)

    -- 2. Build a stack of dynamic wooden crates
    crates = {}
    for row = 1, 4 do
        for col = 1, 3 do
            local bx = 140 + col * 22
            local by = 260 - row * 22
            local id = engine.physics.create_box(bx, by, 18, 18, 1.2, 0.4, 0.3, false)
            table.insert(crates, id)
        end
    end

    -- 3. Cannon / Projectile
    ball_id = engine.physics.create_circle(40, 240, 10, 3.5, 0.2, 0.7, false)
    aim_angle = -0.6 -- radians
    power = 420

    engine.audio.play_preset(5) -- Startup SFX
end

function update(dt)
    -- Aim Up / Down (D-Pad UP/DOWN or Key 2/8)
    if engine.input.is_down(KEY_UP) or engine.input.is_down(KEY_2) then
        aim_angle = aim_angle - 1.5 * dt
    end
    if engine.input.is_down(KEY_DOWN) or engine.input.is_down(KEY_8) then
        aim_angle = aim_angle + 1.5 * dt
    end

    -- Fire Projectile (Center OK or Key 5)
    if engine.input.is_pressed(KEY_FIRE) or engine.input.is_pressed(KEY_5) then
        -- Reset ball position & launch with impulse
        local jx = math.cos(aim_angle) * power
        local jy = math.sin(aim_angle) * power
        engine.physics.set_velocity(ball_id, jx, jy)
        engine.audio.play_preset(3) -- Cannon SFX
    end

    -- Reset World (SoftKey Right)
    if engine.input.is_pressed(KEY_SOFT_RIGHT) or engine.input.is_pressed(KEY_STAR) then
        init()
    end

    -- Advance Box2D simulation by dt (8 solver iterations)
    engine.physics.step(dt, 8)
end

function draw()
    engine.renderer2d.clear(0xFF0F172A)

    -- Draw Ground
    engine.renderer2d.fill_rect(0, 280, 240, 40, 0xFF1E293B)
    engine.renderer2d.fill_rect(0, 280, 240, 2, 0xFF38BDF8)

    -- Draw Crates with Rotations
    for i, id in ipairs(crates) do
        local b = engine.physics.get_body(id)
        if b then
            engine.renderer2d.fill_rect(b.x - b.w/2, b.y - b.h/2, b.w, b.h, 0xFFF59E0B)
            engine.renderer2d.draw_rect(b.x - b.w/2, b.y - b.h/2, b.w, b.h, 0xFFD97706)
        end
    end

    -- Draw Ball
    local ball = engine.physics.get_body(ball_id)
    if ball then
        engine.renderer2d.fill_circle(ball.x, ball.y, 8, 0xFFEF4444)
    end

    -- Draw Aim Trajectory Line
    local aim_len = 35
    local ax2 = 40 + math.cos(aim_angle) * aim_len
    local ay2 = 240 + math.sin(aim_angle) * aim_len
    engine.renderer2d.draw_line(40, 240, ax2, ay2, 0xFF38BDF8)

    -- HUD
    engine.renderer2d.draw_text("BOX2D RIGID BODY PHYSICS", 10, 15, 0xFF38BDF8, 1)
    engine.renderer2d.draw_text("Up/Down: Aim   OK: Fire Cannon", 10, 30, 0xFF94A3B8, 1)
    engine.renderer2d.draw_text("RSK / *: Reset World", 10, 305, 0xFF64748B, 1)
end`,

  raycast: `-- ===============================================
-- 2.5D Raycaster (Wolfenstein 3D DDA Engine)
-- Executed inside embedded Lua 5.1 on KaiOS 2.5
-- ===============================================

function init()
    player = { x = 3.5, y = 3.5, angle = 0 }
    engine.audio.play_preset(5) -- Startup jingle
end

function update(dt)
    local rot_speed = 2.8 * dt
    local move_speed = 3.2 * dt

    -- Turn Left / Right (D-Pad or Key 4/6)
    if engine.input.is_down(KEY_LEFT) or engine.input.is_down(KEY_4) then
        player.angle = player.angle - rot_speed
    end
    if engine.input.is_down(KEY_RIGHT) or engine.input.is_down(KEY_6) then
        player.angle = player.angle + rot_speed
    end

    -- Forward / Backward (D-Pad or Key 2/8)
    local dir_x = math.cos(player.angle)
    local dir_y = math.sin(player.angle)
    if engine.input.is_down(KEY_UP) or engine.input.is_down(KEY_2) then
        player.x = player.x + dir_x * move_speed
        player.y = player.y + dir_y * move_speed
    end

    -- Fire / Action (Enter or Key 5)
    if engine.input.is_pressed(KEY_FIRE) or engine.input.is_pressed(KEY_5) then
        engine.audio.play_preset(3) -- Laser SFX
    end
end

function draw()
    -- Native C++ DDA Raycast Call (240x320)
    engine.renderer25d.raycast(
        player.x, player.y,
        math.cos(player.angle), math.sin(player.angle),
        -math.sin(player.angle) * 0.66, math.cos(player.angle) * 0.66,
        dungeon_map, 8, 8,
        0xFF1E293B, 0xFF0F172A
    )
    engine.renderer2d.draw_text("2.5D RAYCASTER (Wolf3D)", 10, 290, 0xFF38BDF8, 1)
end`,

  mode7: `-- ===============================================
-- 2.5D Mode 7 Racer (SNES Affine Texture Engine)
-- Executed inside embedded Lua 5.1 on KaiOS 2.5
-- ===============================================

function init()
    car = { x = 0, y = 0, speed = 0, angle = 0 }
    engine.audio.play_preset(5)
end

function update(dt)
    -- Throttle / Brakes
    if engine.input.is_down(KEY_UP) or engine.input.is_down(KEY_2) then
        car.speed = math.min(car.speed + 160 * dt, 240)
    else
        car.speed = math.max(car.speed - 90 * dt, 0)
    end

    -- Steering
    if engine.input.is_down(KEY_LEFT) or engine.input.is_down(KEY_4) then
        car.angle = car.angle - 2.6 * dt
    end
    if engine.input.is_down(KEY_RIGHT) or engine.input.is_down(KEY_6) then
        car.angle = car.angle + 2.6 * dt
    end

    car.x = car.x + math.cos(car.angle) * car.speed * dt
    car.y = car.y + math.sin(car.angle) * car.speed * dt
end

function draw()
    engine.renderer2d.clear(0xFF0F172A)
    engine.renderer2d.fill_rect(0, 0, 240, 130, 0xFF0284C7) -- Sky
    engine.renderer2d.draw_text("2.5D MODE 7 RACER", 10, 20, 0xFF38BDF8, 1)
    engine.renderer2d.draw_text("SPEED: " .. math.floor(car.speed) .. " KM/H", 10, 35, 0xFFFFFFFF, 1)
end`,

  platformer: `-- ===============================================
-- 2D Retro Action Platformer (Sprite / Tile Engine)
-- Executed inside embedded Lua 5.1 on KaiOS 2.5
-- ===============================================

function init()
    hero = { x = 120, y = 240, vx = 0, vy = 0, coins = 0, grounded = true }
    engine.audio.play_preset(5)
end

function update(dt)
    local speed = 130
    if engine.input.is_down(KEY_LEFT) then hero.vx = -speed
    elseif engine.input.is_down(KEY_RIGHT) then hero.vx = speed
    else hero.vx = 0 end

    -- Jump
    if (engine.input.is_pressed(KEY_UP) or engine.input.is_pressed(KEY_FIRE)) and hero.grounded then
        hero.vy = -270
        hero.grounded = false
        engine.audio.play_preset(0) -- Jump SFX
    end

    -- Physics
    hero.vy = hero.vy + 650 * dt
    hero.x = hero.x + hero.vx * dt
    hero.y = hero.y + hero.vy * dt

    if hero.y >= 240 then
        hero.y = 240
        hero.vy = 0
        hero.grounded = true
    end
end

function draw()
    engine.renderer2d.clear(0xFF0B0F19)
    engine.renderer2d.fill_rect(0, 248, 240, 72, 0xFF1E293B) -- Ground
    engine.renderer2d.fill_rect(hero.x - 8, hero.y - 16, 16, 16, 0xFF38BDF8) -- Hero
    engine.renderer2d.draw_text("2D PLATFORMER", 10, 20, 0xFF38BDF8, 1)
    engine.renderer2d.draw_text("COINS: " .. hero.coins, 10, 35, 0xFFFBBF24, 1)
end`
};

export const LuaEditor: React.FC<LuaEditorProps> = ({
  currentScript,
  onApplyScript,
  activeMode,
  onSelectModePreset
}) => {
  const [code, setCode] = useState(currentScript);
  const [copied, setCopied] = useState(false);
  const [justApplied, setJustApplied] = useState(false);

  const handlePresetSelect = (mode: GameMode) => {
    onSelectModePreset(mode);
    setCode(PRESET_SCRIPTS[mode]);
  };

  const handleApply = () => {
    onApplyScript(code);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 1500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="lua-editor-panel" className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 flex flex-col h-full shadow-lg">
      {/* Editor Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <FileCode size={18} className="text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              webapp/game/main.lua
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Lua 5.1 VM + Box2D
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Zero C++ recompilation required. Modify scripts and push anytime.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleApply}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm ${
              justApplied
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/20'
            }`}
          >
            {justApplied ? <Check size={13} /> : <Play size={13} />}
            <span>{justApplied ? 'Applied to Sim' : 'Live Update Sim'}</span>
          </button>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex items-center space-x-2 mb-3 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 shrink-0">Presets:</span>
        <button
          onClick={() => handlePresetSelect('box2d')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors flex items-center space-x-1 shrink-0 ${
            activeMode === 'box2d'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Zap size={12} className="text-amber-400" />
          <span>Box2D Physics</span>
        </button>
        <button
          onClick={() => handlePresetSelect('raycast')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors shrink-0 ${
            activeMode === 'raycast'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
          }`}
        >
          2.5D Raycaster
        </button>
        <button
          onClick={() => handlePresetSelect('mode7')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors shrink-0 ${
            activeMode === 'mode7'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
          }`}
        >
          2.5D Mode 7
        </button>
        <button
          onClick={() => handlePresetSelect('platformer')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors shrink-0 ${
            activeMode === 'platformer'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
          }`}
        >
          2D Platformer
        </button>
      </div>

      {/* Code Textarea with Line Numbers aesthetic */}
      <div className="flex-1 relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden flex font-mono text-xs">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full h-full p-3 bg-transparent text-slate-200 outline-none resize-none leading-relaxed font-mono selection:bg-sky-500/30"
          placeholder="-- Write your game logic in Lua..."
        />
      </div>

      {/* Footer helper */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Available APIs: <code className="text-amber-300">engine.physics</code>, <code className="text-sky-300">engine.renderer2d</code>, <code className="text-sky-300">engine.renderer25d</code>, <code className="text-sky-300">engine.input</code>, <code className="text-sky-300">engine.audio</code></span>
        <span className="text-slate-400 font-mono">240×320 Target</span>
      </div>
    </div>
  );
};
