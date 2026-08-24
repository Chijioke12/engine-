import React, { useState } from 'react';
import { Play, Copy, Check, Sparkles, RefreshCw, FileCode } from 'lucide-react';
import { GameMode } from '../types';

interface LuaEditorProps {
  currentScript: string;
  onApplyScript: (script: string) => void;
  activeMode: GameMode;
  onSelectModePreset: (mode: GameMode) => void;
}

const PRESET_SCRIPTS: Record<GameMode, string> = {
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
                Lua 5.1 VM
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
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-xs text-slate-400">Presets:</span>
        <button
          onClick={() => handlePresetSelect('raycast')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
            activeMode === 'raycast'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
          }`}
        >
          2.5D Raycaster
        </button>
        <button
          onClick={() => handlePresetSelect('mode7')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
            activeMode === 'mode7'
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
          }`}
        >
          2.5D Mode 7
        </button>
        <button
          onClick={() => handlePresetSelect('platformer')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
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
        <span>Available APIs: <code className="text-sky-300">engine.renderer2d</code>, <code className="text-sky-300">engine.renderer25d</code>, <code className="text-sky-300">engine.input</code>, <code className="text-sky-300">engine.audio</code></span>
        <span className="text-slate-400 font-mono">240×320 Target</span>
      </div>
    </div>
  );
};
