import React from 'react';
import { GitBranch, Download, CheckCircle2, ArrowRight, ShieldCheck, Terminal, Layers, Play, Zap } from 'lucide-react';
import { downloadEngineRepositoryZip } from '../utils/zipExporter';

export const GitHubWorkflowGuide: React.FC<{ customScript?: string }> = ({ customScript }) => {
  return (
    <div id="github-workflow-guide" className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 flex flex-col h-full shadow-lg overflow-y-auto space-y-6">
      {/* Hero Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <GitBranch size={20} />
            </span>
            <h2 className="text-base font-bold text-slate-100">
              GitHub Actions Automated Compilation Workflow
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Let GitHub's cloud runners handle Emscripten, Lua 5.1 embedding, and <code className="text-purple-300">asm.js</code> generation automatically on every git push.
          </p>
        </div>

        <button
          onClick={() => downloadEngineRepositoryZip(customScript)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download size={15} />
          <span>Download GitHub Repo (.ZIP)</span>
        </button>
      </div>

      {/* Step by Step Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider font-mono">STEP 1</span>
              <span className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-300 text-xs flex items-center justify-center font-bold">1</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Push to your GitHub Repo</h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Create a new repository on GitHub and push the downloaded repository files (including <code className="text-sky-300 font-mono">.github/workflows/</code>).
            </p>
          </div>
          <div className="mt-3 p-2 rounded bg-slate-900 font-mono text-[10px] text-slate-300 border border-slate-800">
            git init &amp;&amp; git push origin main
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider font-mono">STEP 2</span>
              <span className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-300 text-xs flex items-center justify-center font-bold">2</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Emscripten asm.js Build</h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              GitHub Actions triggers Ubuntu runners with Emscripten SDK, embeds ANSI C Lua 5.1, and compiles with <code className="text-sky-300 font-mono">-s WASM=0</code> and 32MB fixed arena.
            </p>
          </div>
          <div className="mt-3 p-2 rounded bg-slate-900 font-mono text-[10px] text-sky-300 border border-slate-800 flex items-center justify-between">
            <span>Runs automatically (1m 10s)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">STEP 3</span>
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-300 text-xs flex items-center justify-center font-bold">3</span>
            </div>
            <h4 className="text-sm font-semibold text-slate-200">Download KaiOS .ZIP Package</h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Collect <code className="text-emerald-300 font-mono">kaios-game-engine-asmjs.zip</code> from GitHub Actions Artifacts. Sideload to phone via WebIDE or submit to KaiStore.
            </p>
          </div>
          <div className="mt-3 p-2 rounded bg-slate-900 font-mono text-[10px] text-emerald-400 border border-slate-800">
            Artifacts → kaios-game-engine.zip
          </div>
        </div>
      </div>

      {/* Compiler Flags Explanation */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
          <Zap size={14} className="text-amber-400" />
          <span>Emscripten asm.js Optimization Configuration for KaiOS 2.5 (Gecko 48)</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <code className="text-sky-300 font-mono font-bold">-s WASM=0</code>
            <p className="text-slate-400 mt-1 text-[11px]">
              Forces Emscripten to output pure JavaScript/asm.js compatible with KaiOS 2.5's Gecko 48 OdinMonkey JIT compiler.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <code className="text-sky-300 font-mono font-bold">-s TOTAL_MEMORY=33554432</code>
            <p className="text-slate-400 mt-1 text-[11px]">
              Allocates a fixed 32MB linear memory arena upfront. Prevents Low Memory Killer (LMK) crashes on 256MB/512MB RAM phones.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <code className="text-sky-300 font-mono font-bold">-s ALLOW_MEMORY_GROWTH=0</code>
            <p className="text-slate-400 mt-1 text-[11px]">
              Crucial for OdinMonkey AOT optimization. Dynamic memory resizing disables asm.js speedups in Gecko 48.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <code className="text-sky-300 font-mono font-bold">-s DISABLE_EXCEPTION_CATCHING=1</code>
            <p className="text-slate-400 mt-1 text-[11px]">
              Strips heavy C++ exception table overhead, reducing the final compiled binary size by ~350 KB.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
