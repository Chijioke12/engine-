import React, { useState } from 'react';
import { Copy, Check, Folder, FileCode, Cpu, Layers, Terminal, Sparkles } from 'lucide-react';
import { ENGINE_FILES } from '../data/engineCode';
import { FileItem } from '../types';

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileItem>(ENGINE_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryBadge = (cat: FileItem['category']) => {
    switch (cat) {
      case 'github': return <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/30">CI/CD Workflow</span>;
      case 'cpp': return <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/30">C++ Engine</span>;
      case 'lua': return <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30">Lua Script</span>;
      case 'webapp': return <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">KaiOS WebApp</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-500/10 text-slate-300 border border-slate-500/30">Config</span>;
    }
  };

  return (
    <div id="code-explorer-panel" className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Cpu size={18} className="text-sky-400" />
            Project Source Code & Architecture
          </h3>
          <p className="text-[11px] text-slate-400">
            Inspect all engine C++ modules, Lua bindings, and GitHub Actions compile scripts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 flex-1 overflow-hidden">
        {/* File Tree / List Sidebar */}
        <div className="col-span-4 bg-slate-950/80 rounded-xl border border-slate-800/80 p-2 overflow-y-auto space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Repository Files
          </div>
          {ENGINE_FILES.map((file) => {
            const isSelected = selectedFile.path === file.path;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono transition-all flex flex-col gap-0.5 ${
                  isSelected
                    ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-850 hover:text-slate-100 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold truncate">{file.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 truncate font-sans">{file.path}</span>
              </button>
            );
          })}
        </div>

        {/* File Preview & Code Viewer */}
        <div className="col-span-8 bg-slate-950 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs text-slate-100 font-semibold">{selectedFile.path}</span>
                {getCategoryBadge(selectedFile.category)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Code content */}
          <div className="p-3 overflow-auto flex-1 font-mono text-xs text-slate-300 leading-relaxed bg-slate-950/90 whitespace-pre">
            {selectedFile.content}
          </div>
        </div>
      </div>
    </div>
  );
};
