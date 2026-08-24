import JSZip from 'jszip';
import { ENGINE_FILES } from '../data/engineCode';

export async function downloadEngineRepositoryZip(customLuaScript?: string) {
  const zip = new JSZip();

  // Add all files
  for (const file of ENGINE_FILES) {
    if (file.path === 'webapp/game/main.lua' && customLuaScript) {
      zip.file(file.path, customLuaScript);
    } else {
      zip.file(file.path, file.content);
    }
  }

  // Generate ZIP blob
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kaios-cpp-lua-engine-github.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
