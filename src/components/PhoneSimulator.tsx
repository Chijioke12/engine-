import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Gamepad2, Compass, Layers, Zap } from 'lucide-react';
import { GameMode, KeyState } from '../types';

interface PhoneSimulatorProps {
  activeMode: GameMode;
  onModeChange: (mode: GameMode) => void;
  customScript?: string;
}

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  activeMode,
  onModeChange,
  customScript
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [fps, setFps] = useState(60);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Key States
  const keysRef = useRef<KeyState>({
    up: false, down: false, left: false, right: false, fire: false,
    softLeft: false, softRight: false, call: false, back: false,
    num0: false, num1: false, num2: false, num3: false, num4: false,
    num5: false, num6: false, num7: false, num8: false, num9: false,
    star: false, hash: false
  });
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // ----------------------------------------------------
  // Audio Synthesizer (Matches C++ AudioEngine)
  // ----------------------------------------------------
  const playSfx = useCallback((type: 'jump' | 'coin' | 'explosion' | 'laser' | 'powerup') => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'explosion') {
        // Noise buffer
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
      } else if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'powerup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(261.63, now);
        osc.frequency.setValueAtTime(329.63, now + 0.08);
        osc.frequency.setValueAtTime(392.00, now + 0.16);
        osc.frequency.setValueAtTime(523.25, now + 0.24);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // Audio context policy fallback
    }
  }, [audioEnabled]);

  // ----------------------------------------------------
  // Game States
  // ----------------------------------------------------
  const rayPlayerRef = useRef({
    x: 3.5,
    y: 3.5,
    angle: 0.0,
    score: 0
  });

  const dungeonMap = useRef([
    1, 1, 1, 1, 1, 1, 1, 1,
    1, 0, 0, 0, 0, 2, 0, 1,
    1, 0, 2, 0, 0, 0, 0, 1,
    1, 0, 2, 0, 0, 3, 0, 1,
    1, 0, 0, 0, 0, 3, 0, 1,
    1, 0, 3, 3, 0, 0, 0, 1,
    1, 0, 0, 0, 0, 2, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 1
  ]);

  const carRef = useRef({ x: 0, y: 0, speed: 0, angle: 0 });
  const heroRef = useRef({ x: 120, y: 240, vx: 0, vy: 0, grounded: true, coins: 0 });
  const coinsRef = useRef([
    { x: 45, y: 175, collected: false },
    { x: 120, y: 135, collected: false },
    { x: 195, y: 175, collected: false }
  ]);

  // Box2D Physics State Ref
  const box2dRef = useRef({
    ball: { x: 40, y: 240, vx: 0, vy: 0, radius: 8, isFired: false },
    aimAngle: -0.6,
    power: 420,
    crates: [
      { x: 160, y: 250, w: 18, h: 18, vx: 0, vy: 0, angle: 0, va: 0 },
      { x: 182, y: 250, w: 18, h: 18, vx: 0, vy: 0, angle: 0, va: 0 },
      { x: 204, y: 250, w: 18, h: 18, vx: 0, vy: 0, angle: 0, va: 0 },
      { x: 171, y: 230, w: 18, h: 18, vx: 0, vy: 0, angle: 0, va: 0 },
      { x: 193, y: 230, w: 18, h: 18, vx: 0, vy: 0, angle: 0, va: 0 },
      { x: 182, y: 210, w: 18, h: 18, vx: 0, vy: 0, angle: 0, va: 0 },
    ]
  });

  // Handle Hardware / Simulator Key Press
  const handleKeyDown = useCallback((key: keyof KeyState) => {
    keysRef.current[key] = true;
    setPressedKey(key);

    if (key === 'softRight' || key === 'num1') {
      onModeChange('raycast');
      playSfx('coin');
    } else if (key === 'num2') {
      onModeChange('mode7');
      playSfx('coin');
    } else if (key === 'num3') {
      onModeChange('platformer');
      playSfx('coin');
    }
  }, [onModeChange, playSfx]);

  const handleKeyUp = useCallback((key: keyof KeyState) => {
    keysRef.current[key] = false;
    setPressedKey(null);
  }, []);

  // Keyboard Event Listeners for PC Testing
  useEffect(() => {
    const onKey = (e: KeyboardEvent, isDown: boolean) => {
      const k = e.key.toLowerCase();
      let mappedKey: keyof KeyState | null = null;

      if (k === 'arrowup' || k === 'w') mappedKey = 'up';
      else if (k === 'arrowdown' || k === 's') mappedKey = 'down';
      else if (k === 'arrowleft' || k === 'a') mappedKey = 'left';
      else if (k === 'arrowright' || k === 'd') mappedKey = 'right';
      else if (k === 'enter' || k === ' ') mappedKey = 'fire';
      else if (k === 'f1') mappedKey = 'softLeft';
      else if (k === 'f2') mappedKey = 'softRight';
      else if (k === '1') mappedKey = 'num1';
      else if (k === '2') mappedKey = 'num2';
      else if (k === '3') mappedKey = 'num3';
      else if (k === '4') mappedKey = 'num4';
      else if (k === '5') mappedKey = 'num5';
      else if (k === '6') mappedKey = 'num6';
      else if (k === '7') mappedKey = 'num7';
      else if (k === '8') mappedKey = 'num8';
      else if (k === '9') mappedKey = 'num9';
      else if (k === '0') mappedKey = 'num0';
      else if (k === 'backspace' || k === 'escape') mappedKey = 'back';

      if (mappedKey) {
        if (isDown) handleKeyDown(mappedKey);
        else handleKeyUp(mappedKey);
      }
    };

    const downHandler = (e: KeyboardEvent) => onKey(e, true);
    const upHandler = (e: KeyboardEvent) => onKey(e, false);

    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);
    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [handleKeyDown, handleKeyUp]);

  // ----------------------------------------------------
  // Main Engine Simulation Loop (240x320 Canvas Blitter)
  // ----------------------------------------------------
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsTime = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const renderLoop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      frameCounter++;
      if (time - fpsTime >= 1000) {
        setFps(frameCounter);
        frameCounter = 0;
        fpsTime = time;
      }

      const keys = keysRef.current;

      // --------------------------------------------------
      // Mode 1: 2.5D Raycaster (Wolfenstein 3D DDA)
      // --------------------------------------------------
      if (activeMode === 'raycast') {
        const player = rayPlayerRef.current;
        const rotSpeed = 2.8 * dt;
        const moveSpeed = 3.2 * dt;

        if (keys.left || keys.num4) player.angle -= rotSpeed;
        if (keys.right || keys.num6) player.angle += rotSpeed;

        const dirX = Math.cos(player.angle);
        const dirY = Math.sin(player.angle);
        const planeX = -Math.sin(player.angle) * 0.66;
        const planeY = Math.cos(player.angle) * 0.66;

        if (keys.up || keys.num2) {
          const nx = player.x + dirX * moveSpeed;
          const ny = player.y + dirY * moveSpeed;
          if (dungeonMap.current[Math.floor(ny) * 8 + Math.floor(nx)] === 0) {
            player.x = nx;
            player.y = ny;
          }
        }
        if (keys.down || keys.num8) {
          const nx = player.x - dirX * moveSpeed;
          const ny = player.y - dirY * moveSpeed;
          if (dungeonMap.current[Math.floor(ny) * 8 + Math.floor(nx)] === 0) {
            player.x = nx;
            player.y = ny;
          }
        }

        // Draw Ceiling & Floor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 240, 160);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 160, 240, 160);

        // Raycast 240 columns
        for (let x = 0; x < 240; x++) {
          const cameraX = (2 * x) / 240 - 1;
          const rayDirX = dirX + planeX * cameraX;
          const rayDirY = dirY + planeY * cameraX;

          let mapX = Math.floor(player.x);
          let mapY = Math.floor(player.y);

          const deltaDistX = Math.abs(1 / (rayDirX || 1e-30));
          const deltaDistY = Math.abs(1 / (rayDirY || 1e-30));

          let sideDistX = 0;
          let sideDistY = 0;
          let stepX = 0;
          let stepY = 0;
          let hit = 0;
          let side = 0;
          let hitTile = 1;

          if (rayDirX < 0) {
            stepX = -1;
            sideDistX = (player.x - mapX) * deltaDistX;
          } else {
            stepX = 1;
            sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
          }

          if (rayDirY < 0) {
            stepY = -1;
            sideDistY = (player.y - mapY) * deltaDistY;
          } else {
            stepY = 1;
            sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
          }

          while (hit === 0) {
            if (sideDistX < sideDistY) {
              sideDistX += deltaDistX;
              mapX += stepX;
              side = 0;
            } else {
              sideDistY += deltaDistY;
              mapY += stepY;
              side = 1;
            }

            if (mapX < 0 || mapX >= 8 || mapY < 0 || mapY >= 8) {
              hit = 1;
              hitTile = 1;
            } else {
              const t = dungeonMap.current[mapY * 8 + mapX];
              if (t > 0) {
                hit = 1;
                hitTile = t;
              }
            }
          }

          const perpWallDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
          const distClamped = Math.max(perpWallDist, 0.05);
          const lineHeight = Math.floor(320 / distClamped);
          const drawStart = Math.max(0, -lineHeight / 2 + 160);
          const drawEnd = Math.min(320, lineHeight / 2 + 160);

          let color = hitTile === 1 ? '#0284c7' : hitTile === 2 ? '#e11d48' : '#10b981';
          if (side === 1) {
            // Shadow side
            color = hitTile === 1 ? '#0369a1' : hitTile === 2 ? '#be123c' : '#047857';
          }

          ctx.fillStyle = color;
          ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
        }

        // Mini-Map overlay
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(8, 8, 48, 48);
        for (let my = 0; my < 8; my++) {
          for (let mx = 0; mx < 8; mx++) {
            const tile = dungeonMap.current[my * 8 + mx];
            if (tile > 0) {
              ctx.fillStyle = '#64748b';
              ctx.fillRect(8 + mx * 6, 8 + my * 6, 5, 5);
            }
          }
        }
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(8 + Math.floor(player.x * 6) - 1, 8 + Math.floor(player.y * 6) - 1, 4, 4);

        // Crosshair
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(118, 158, 4, 4);

        // HUD Text
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px monospace';
        ctx.fillText('2.5D RAYCASTER (Wolf3D)', 10, 290);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('D-Pad: Move  Fire: Action', 10, 305);
      }

      // --------------------------------------------------
      // Mode 2: 2.5D Mode 7 Racer
      // --------------------------------------------------
      else if (activeMode === 'mode7') {
        const car = carRef.current;
        if (keys.up || keys.num2) car.speed = Math.min(car.speed + 160 * dt, 240);
        else car.speed = Math.max(car.speed - 90 * dt, 0);

        if (keys.left || keys.num4) car.angle -= 2.6 * dt;
        if (keys.right || keys.num6) car.angle += 2.6 * dt;

        car.x += Math.cos(car.angle) * car.speed * dt;
        car.y += Math.sin(car.angle) * car.speed * dt;

        // Sky & Horizon
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 0, 240, 130);
        // Sun
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(120 - Math.sin(car.angle) * 40, 50, 16, 0, Math.PI * 2);
        ctx.fill();

        // Mode 7 Ground Plane Perspective
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 130, 240, 190);

        // Grid lines to create depth
        for (let i = 0; i < 14; i++) {
          const y = 130 + Math.pow(i, 2) * 1.0;
          if (y < 320) {
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = Math.max(1, i * 0.2);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(240, y);
            ctx.stroke();
          }
        }

        // Longitudinal track lines
        for (let lane = -3; lane <= 3; lane++) {
          ctx.strokeStyle = lane === 0 ? '#f59e0b' : '#475569';
          ctx.beginPath();
          ctx.moveTo(120 + lane * 4, 130);
          ctx.lineTo(120 + lane * 90 - Math.sin(car.angle) * 60, 320);
          ctx.stroke();
        }

        // Player Car Sprite
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(108, 250, 24, 16);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(112, 245, 16, 6);
        ctx.fillStyle = '#000000';
        ctx.fillRect(104, 254, 4, 9);
        ctx.fillRect(132, 254, 4, 9);

        // HUD
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px monospace';
        ctx.fillText('2.5D MODE 7 RACER', 10, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`SPEED: ${Math.floor(car.speed)} KM/H`, 10, 35);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Up/Down: Throttle  Left/Right: Steer', 10, 305);
      }

      // --------------------------------------------------
      // Mode 3: 2D Action Platformer
      // --------------------------------------------------
      else if (activeMode === 'platformer') {
        const hero = heroRef.current;
        const speed = 130;

        if (keys.left || keys.num4) hero.vx = -speed;
        else if (keys.right || keys.num6) hero.vx = speed;
        else hero.vx = 0;

        if ((keys.up || keys.fire || keys.num5) && hero.grounded) {
          hero.vy = -270;
          hero.grounded = false;
          playSfx('jump');
        }

        hero.vy += 650 * dt;
        hero.x += hero.vx * dt;
        hero.y += hero.vy * dt;

        // Ground floor
        if (hero.y >= 240) {
          hero.y = 240;
          hero.vy = 0;
          hero.grounded = true;
        }

        // Floating platforms
        const platforms = [
          { x: 30, y: 195, w: 50, h: 8 },
          { x: 100, y: 155, w: 50, h: 8 },
          { x: 170, y: 195, w: 50, h: 8 }
        ];

        for (const p of platforms) {
          if (
            hero.vy >= 0 &&
            hero.x >= p.x - 6 &&
            hero.x <= p.x + p.w + 6 &&
            hero.y >= p.y &&
            hero.y <= p.y + 10
          ) {
            hero.y = p.y;
            hero.vy = 0;
            hero.grounded = true;
          }
        }

        if (hero.x < 16) hero.x = 16;
        if (hero.x > 224) hero.x = 224;

        // Coins
        for (const c of coinsRef.current) {
          if (!c.collected) {
            const dx = hero.x - c.x;
            const dy = hero.y - c.y;
            if (Math.hypot(dx, dy) < 18) {
              c.collected = true;
              hero.coins++;
              playSfx('coin');
            }
          }
        }

        // Draw Background
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, 240, 320);

        // Ground
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 248, 240, 72);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, 248, 240, 2);

        // Platforms
        ctx.fillStyle = '#334155';
        for (const p of platforms) {
          ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.fillStyle = '#64748b';
          ctx.fillRect(p.x, p.y, p.w, 2);
          ctx.fillStyle = '#334155';
        }

        // Coins
        for (const c of coinsRef.current) {
          if (!c.collected) {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Hero Sprite
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(hero.x - 8, hero.y - 16, 16, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hero.x - 4, hero.y - 12, 3, 3);
        ctx.fillRect(hero.x + 2, hero.y - 12, 3, 3);

        // HUD
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px monospace';
        ctx.fillText('2D ACTION PLATFORMER', 10, 20);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`COINS: ${hero.coins} / 3`, 10, 35);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('D-Pad: Move   Fire/Up: Jump', 10, 305);
      }

      // --------------------------------------------------
      // Mode 4: 2D Box2D Rigid Body Physics Engine
      // --------------------------------------------------
      else if (activeMode === 'box2d') {
        const p = box2dRef.current;
        const gravity = 480;

        // Aim Up / Down
        if (keys.up || keys.num2) p.aimAngle -= 1.8 * dt;
        if (keys.down || keys.num8) p.aimAngle += 1.8 * dt;
        p.aimAngle = Math.max(-1.4, Math.min(0.2, p.aimAngle));

        // Fire Cannonball
        if (keys.fire || keys.num5) {
          if (!p.ball.isFired) {
            p.ball.isFired = true;
            p.ball.x = 40;
            p.ball.y = 240;
            p.ball.vx = Math.cos(p.aimAngle) * p.power;
            p.ball.vy = Math.sin(p.aimAngle) * p.power;
            playSfx('laser');
          }
        }

        // Reset Ball if fallen below screen
        if (p.ball.isFired) {
          p.ball.vy += gravity * dt;
          p.ball.x += p.ball.vx * dt;
          p.ball.y += p.ball.vy * dt;

          // Ground bounce
          if (p.ball.y >= 272) {
            p.ball.y = 272;
            p.ball.vy = -p.ball.vy * 0.6;
            p.ball.vx *= 0.85;
          }

          // Wall bounce
          if (p.ball.x >= 232) {
            p.ball.x = 232;
            p.ball.vx = -p.ball.vx * 0.6;
          }

          // Ball-Crate Impulse Collision Resolution
          for (const crate of p.crates) {
            const dx = p.ball.x - crate.x;
            const dy = p.ball.y - crate.y;
            const dist = Math.hypot(dx, dy);
            if (dist < p.ball.radius + crate.w * 0.6) {
              const nx = dx / (dist || 1);
              const ny = dy / (dist || 1);
              crate.vx += -nx * p.ball.vx * 0.7;
              crate.vy += -ny * p.ball.vy * 0.7;
              crate.va += (Math.random() - 0.5) * 8;
              p.ball.vx *= 0.4;
              p.ball.vy *= 0.4;
              playSfx('explosion');
            }
          }
        }

        // Update Crates with simulated physics, damping, and floor constraints
        for (const crate of p.crates) {
          crate.vy += gravity * dt;
          crate.x += crate.vx * dt;
          crate.y += crate.vy * dt;
          crate.angle += crate.va * dt;

          crate.vx *= 0.98;
          crate.va *= 0.95;

          // Ground contact
          if (crate.y >= 271) {
            crate.y = 271;
            crate.vy = -crate.vy * 0.2;
            crate.vx *= 0.8;
            crate.va *= 0.8;
          }

          // Right wall contact
          if (crate.x >= 230) {
            crate.x = 230;
            crate.vx = -crate.vx * 0.5;
          }
        }

        // Draw Sky Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 240, 320);

        // Draw Ground Floor
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 280, 240, 40);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, 280, 240, 2);

        // Draw Crates with Rotations
        for (const crate of p.crates) {
          ctx.save();
          ctx.translate(crate.x, crate.y);
          ctx.rotate(crate.angle);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-crate.w / 2, -crate.h / 2, crate.w, crate.h);
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-crate.w / 2, -crate.h / 2, crate.w, crate.h);
          // Diagonal brace on crate
          ctx.beginPath();
          ctx.moveTo(-crate.w / 2, -crate.h / 2);
          ctx.lineTo(crate.w / 2, crate.h / 2);
          ctx.stroke();
          ctx.restore();
        }

        // Draw Cannon Stand & Trajectory
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(40, 245, 12, Math.PI, 0);
        ctx.fill();

        // Cannon Barrel
        ctx.save();
        ctx.translate(40, 240);
        ctx.rotate(p.aimAngle);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(0, -5, 24, 10);
        ctx.restore();

        // Draw Ball
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(p.ball.x, p.ball.y, p.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(p.ball.x - 2, p.ball.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // HUD
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px monospace';
        ctx.fillText('BOX2D RIGID BODY PHYSICS', 10, 18);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Up/Down: Aim   OK: Fire Cannon', 10, 32);
        ctx.fillStyle = '#64748b';
        ctx.fillText('RSK / Reset to Reload', 10, 305);
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [activeMode, playSfx]);

  const resetGame = () => {
    rayPlayerRef.current = { x: 3.5, y: 3.5, angle: 0.0, score: 0 };
    carRef.current = { x: 0, y: 0, speed: 0, angle: 0 };
    heroRef.current = { x: 120, y: 240, vx: 0, vy: 0, grounded: true, coins: 0 };
    coinsRef.current.forEach(c => (c.collected = false));
    playSfx('powerup');
  };

  return (
    <div id="phone-simulator-container" className="flex flex-col items-center">
      {/* Simulator Action Bar */}
      <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-700/60">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-medium text-slate-300">KaiOS 2.5 Hardware Target</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            240×320 QVGA · {fps} FPS
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-1.5 rounded-lg border transition-colors ${
              audioEnabled
                ? 'bg-sky-950/60 border-sky-600 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Audio"
          >
            {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button
            onClick={resetGame}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            title="Reset Game State"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Mode Quick Switcher */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full mb-4">
        <button
          onClick={() => { onModeChange('box2d'); playSfx('coin'); }}
          className={`py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center space-x-1.5 border transition-all ${
            activeMode === 'box2d'
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm font-semibold'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Zap size={13} className="text-amber-400" />
          <span>Box2D</span>
        </button>

        <button
          onClick={() => { onModeChange('raycast'); playSfx('coin'); }}
          className={`py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center space-x-1.5 border transition-all ${
            activeMode === 'raycast'
              ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Compass size={13} />
          <span>Raycaster</span>
        </button>

        <button
          onClick={() => { onModeChange('mode7'); playSfx('coin'); }}
          className={`py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center space-x-1.5 border transition-all ${
            activeMode === 'mode7'
              ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Layers size={13} />
          <span>Mode 7</span>
        </button>

        <button
          onClick={() => { onModeChange('platformer'); playSfx('coin'); }}
          className={`py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center space-x-1.5 border transition-all ${
            activeMode === 'platformer'
              ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm'
              : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Gamepad2 size={13} />
          <span>Platformer</span>
        </button>
      </div>

      {/* Realistic KaiOS Phone Body */}
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-4 rounded-[32px] border-2 border-slate-700 shadow-2xl w-[284px] select-none flex flex-col items-center">
        {/* Speaker & Sensor */}
        <div className="w-16 h-1.5 bg-slate-800 rounded-full mb-3 flex items-center justify-center">
          <div className="w-8 h-0.5 bg-slate-700 rounded-full"></div>
        </div>

        {/* 240x320 Screen Bezel */}
        <div className="w-[244px] h-[324px] bg-black p-[2px] rounded-lg border border-slate-800 shadow-inner overflow-hidden relative">
          <canvas
            ref={canvasRef}
            width={240}
            height={320}
            className="w-[240px] h-[320px] bg-black block"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Phone Keypad Area */}
        <div className="w-full mt-4 space-y-2.5">
          {/* Top Row: SoftLeft, D-Pad Center Top, SoftRight */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onMouseDown={() => handleKeyDown('softLeft')}
              onMouseUp={() => handleKeyUp('softLeft')}
              className={`py-2 px-1 rounded-lg text-[10px] font-semibold tracking-wider text-slate-300 border transition-all active:scale-95 ${
                pressedKey === 'softLeft' ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-800/90 border-slate-700 hover:bg-slate-750'
              }`}
            >
              [F1] L-SOFT
            </button>

            {/* D-Pad Up Button */}
            <button
              onMouseDown={() => handleKeyDown('up')}
              onMouseUp={() => handleKeyUp('up')}
              className={`py-2 rounded-lg text-xs font-bold text-slate-200 border transition-all active:scale-95 ${
                pressedKey === 'up' ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-750'
              }`}
            >
              ▲
            </button>

            <button
              onMouseDown={() => handleKeyDown('softRight')}
              onMouseUp={() => handleKeyUp('softRight')}
              className={`py-2 px-1 rounded-lg text-[10px] font-semibold tracking-wider text-slate-300 border transition-all active:scale-95 ${
                pressedKey === 'softRight' ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-800/90 border-slate-700 hover:bg-slate-750'
              }`}
            >
              R-SOFT [F2]
            </button>
          </div>

          {/* Middle Row: Call, D-Pad Horizontal + Center, End/Back */}
          <div className="grid grid-cols-5 gap-1.5 items-center">
            <button
              onMouseDown={() => handleKeyDown('call')}
              onMouseUp={() => handleKeyUp('call')}
              className="py-2.5 rounded-lg text-[10px] font-bold bg-emerald-950/80 border border-emerald-700 text-emerald-400 hover:bg-emerald-900 active:scale-95"
            >
              CALL
            </button>

            <button
              onMouseDown={() => handleKeyDown('left')}
              onMouseUp={() => handleKeyUp('left')}
              className={`py-2.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                pressedKey === 'left' ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
              }`}
            >
              ◀
            </button>

            <button
              onMouseDown={() => handleKeyDown('fire')}
              onMouseUp={() => handleKeyUp('fire')}
              className={`py-2.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                pressedKey === 'fire' ? 'bg-sky-400 text-slate-950 border-sky-300 ring-2 ring-sky-500' : 'bg-sky-950/70 border-sky-600 text-sky-300 hover:bg-sky-900'
              }`}
            >
              OK
            </button>

            <button
              onMouseDown={() => handleKeyDown('right')}
              onMouseUp={() => handleKeyUp('right')}
              className={`py-2.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                pressedKey === 'right' ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
              }`}
            >
              ▶
            </button>

            <button
              onMouseDown={() => handleKeyDown('back')}
              onMouseUp={() => handleKeyUp('back')}
              className="py-2.5 rounded-lg text-[10px] font-bold bg-rose-950/80 border border-rose-700 text-rose-400 hover:bg-rose-900 active:scale-95"
            >
              BACK
            </button>
          </div>

          {/* D-Pad Down Center */}
          <div className="flex justify-center">
            <button
              onMouseDown={() => handleKeyDown('down')}
              onMouseUp={() => handleKeyUp('down')}
              className={`w-1/3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                pressedKey === 'down' ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
              }`}
            >
              ▼
            </button>
          </div>

          {/* 12-Key Numeric Keypad */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {[
              { label: '1', sub: 'RAYCAST', key: 'num1' as const },
              { label: '2', sub: 'MODE 7', key: 'num2' as const },
              { label: '3', sub: '2D ACT', key: 'num3' as const },
              { label: '4', sub: 'LEFT', key: 'num4' as const },
              { label: '5', sub: 'ACTION', key: 'num5' as const },
              { label: '6', sub: 'RIGHT', key: 'num6' as const },
              { label: '7', sub: 'PQRS', key: 'num7' as const },
              { label: '8', sub: 'DOWN', key: 'num8' as const },
              { label: '9', sub: 'WXYZ', key: 'num9' as const },
              { label: '*', sub: 'SFX', key: 'star' as const },
              { label: '0', sub: 'SPACE', key: 'num0' as const },
              { label: '#', sub: 'MUTE', key: 'hash' as const },
            ].map(btn => (
              <button
                key={btn.key}
                onMouseDown={() => handleKeyDown(btn.key)}
                onMouseUp={() => handleKeyUp(btn.key)}
                className={`py-1.5 px-1 rounded-lg border flex flex-col items-center justify-center transition-all active:scale-95 ${
                  pressedKey === btn.key
                    ? 'bg-sky-500 text-white border-sky-400'
                    : 'bg-slate-850/80 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="text-xs font-bold leading-tight">{btn.label}</span>
                <span className="text-[8px] text-slate-400 font-mono scale-90">{btn.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-1.5">
        <Sparkles size={12} className="text-sky-400" />
        <span>Keyboard: <b>Arrow Keys</b> / <b>WASD</b>, <b>Enter</b> (Fire), <b>F1/F2</b></span>
      </div>
    </div>
  );
};
