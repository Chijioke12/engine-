export type GameMode = 'raycast' | 'mode7' | 'platformer' | 'box2d';

export interface FileItem {
  path: string;
  name: string;
  category: 'github' | 'cpp' | 'lua' | 'webapp' | 'config';
  description: string;
  content: string;
  language: string;
}

export interface KeyState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  softLeft: boolean;
  softRight: boolean;
  call: boolean;
  back: boolean;
  num0: boolean;
  num1: boolean;
  num2: boolean;
  num3: boolean;
  num4: boolean;
  num5: boolean;
  num6: boolean;
  num7: boolean;
  num8: boolean;
  num9: boolean;
  star: boolean;
  hash: boolean;
}
