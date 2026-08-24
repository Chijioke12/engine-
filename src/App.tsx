import React, { useState } from 'react';
import { Gamepad2, FileCode, GitBranch, Cpu, Download, Sparkles, Terminal, Play, BookOpen, Layers } from 'lucide-react';
import { PhoneSimulator } from './components/PhoneSimulator';
import { LuaEditor } from './components/LuaEditor';
import { CodeExplorer } from './components/CodeExplorer';
import { GitHubWorkflowGuide } from './components/GitHubWorkflowGuide';
import { GameMode } from './types';
import { downloadEngineRepositoryZip } from './utils/zipExporter';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'editor' | 'code' | 'github'>('simulator');
  const [gameMode, setGameMode] = useState<GameMode>('raycast');
  const [customLuaScript, setCustomLuaScript] = useState<string>(`-- KaiOS 2.5 Game Script (Lua 5.1)
function init()
    player = { x = 3.5, y = 3.5, angle = 0 }
    engine.audio.play_preset(5)
end

function update(dt)
    if engine.input.is_down(KEY_LEFT) or engine.input.is_down(KEY_4) then
        player.angle = player.angle - 2.8 * dt
    end
    if engine.input.is_down(KEY_RIGHT) or engine.input.is_down(KEY_6) then
        player.angle = player.angle + 2.8 * dt
    end
    if engine.input.is_down(KEY_UP) or engine.input.is_down(KEY_2) then
        player.x = player.x + math.cos(player.angle) * 3.2 * dt
        player.y = player.y + math.sin(player.angle) * 3.2 * dt
    end
    if engine.input.is_pressed(KEY_FIRE) or engine.input.is_pressed(KEY_5) then
        engine.audio.play_preset(3)
    end
end

function draw()
    engine.renderer25d.raycast(
        player.x, player.y,
        math.cos(player.angle), math.sin(player.angle),
        -math.sin(player.angle) * 0.66, math.cos(player.angle) * 0.66,
        dungeon_map, 8, 8,
        0xFF1E293B, 0xFF0F172A
    )
    engine.renderer2d.draw_text("2.5D RAYCASTER (Wolf3D)", 10, 290, 0xFF38BDF8, 1)
end`);

  const handleApplyScript = (script: string) => {
    setCustomLuaScript(script);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Cpu size={20} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-white">KaiOS C++ Lua Game Engine</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/30">
                asm.js · Gecko 48
              </span>
            </div>
            <p className="text-xs text-slate-400">Compile C++ once via GitHub Actions · Write 2D &amp; 2.5D games purely in Lua</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'simulator'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Gamepad2 size={14} />
            <span>KaiOS Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'editor'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileCode size={14} />
            <span>Lua Game Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'code'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu size={14} />
            <span>C++ Engine &amp; Bindings</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
              activeTab === 'github'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-300 hover:text-white hover:bg-purple-950/40'
            }`}
          >
            <GitBranch size={14} />
            <span>GitHub CI/CD</span>
          </button>
        </div>

        {/* Quick Export Button */}
        <button
          onClick={() => downloadEngineRepositoryZip(customLuaScript)}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download size={14} />
          <span>Export Repo (.ZIP)</span>
        </button>
      </header>

      {/* Main Studio Viewport */}
      <main className="flex-1 p-5 overflow-hidden flex flex-col max-w-[1600px] w-full mx-auto">
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-12 gap-5 flex-1 items-start h-full">
            {/* Left: KaiOS Phone Device Simulator */}
            <div className="col-span-12 lg:col-span-4 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-lg flex justify-center">
              <PhoneSimulator
                activeMode={gameMode}
                onModeChange={setGameMode}
                customScript={customLuaScript}
              />
            </div>

            {/* Right: Engine Architecture & Real-Time Lua Code Info */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 h-full">
              {/* Architecture Blueprint Card */}
              <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                    <Sparkles size={16} className="text-sky-400" />
                    <span>How "Compile Once, Make Many Games" Works on KaiOS 2.5</span>
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    OdinMonkey JIT Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] font-bold text-sky-400 uppercase font-mono">1. C++ Engine Core</div>
                    <p className="text-xs text-slate-300 mt-1">
                      Fast SDL2 240x320 pixel blitter, DDA raycaster, Mode 7 affine matrix, 4-channel retro synth, and KaiOS keypad mapper.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] font-bold text-amber-400 uppercase font-mono">2. Embedded Lua 5.1</div>
                    <p className="text-xs text-slate-300 mt-1">
                      Compiles Lua scripts into bytecode at runtime. Zero JS bridge overhead because Lua lives inside the C++ memory arena.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="text-[10px] font-bold text-purple-400 uppercase font-mono">3. GitHub CI/CD</div>
                    <p className="text-xs text-slate-300 mt-1">
                      GitHub Actions runs Emscripten (<code className="text-purple-300 font-mono">-s WASM=0</code>) to generate ready-to-run <code className="text-purple-300 font-mono">engine.js</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Script Preview */}
              <div className="flex-1 min-h-[300px]">
                <LuaEditor
                  currentScript={customLuaScript}
                  onApplyScript={handleApplyScript}
                  activeMode={gameMode}
                  onSelectModePreset={setGameMode}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="flex-1 h-full">
            <LuaEditor
              currentScript={customLuaScript}
              onApplyScript={handleApplyScript}
              activeMode={gameMode}
              onSelectModePreset={setGameMode}
            />
          </div>
        )}

        {activeTab === 'code' && (
          <div className="flex-1 h-full">
            <CodeExplorer />
          </div>
        )}

        {activeTab === 'github' && (
          <div className="flex-1 h-full">
            <GitHubWorkflowGuide customScript={customLuaScript} />
          </div>
        )}
      </main>
    </div>
  );
}
