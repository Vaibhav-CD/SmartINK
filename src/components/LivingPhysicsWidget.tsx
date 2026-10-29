import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SlidersHorizontal,
  X,
  Activity,
  Maximize2,
  Minimize2,
  Atom,
} from 'lucide-react';
import {
  LivingInkPhysicsEngine,
  type PhysicsSystemType,
  type PhysicsParams,
  type PhysicsState,
} from '../services/physics/livingInkPhysics';
import type { Point } from '../types';

export interface LivingPhysicsWidgetProps {
  id: string;
  initialType?: PhysicsSystemType;
  title?: string;
  position: Point;
  onClose: () => void;
  onPositionChange?: (newPos: Point) => void;
}

export const LivingPhysicsWidget: React.FC<LivingPhysicsWidgetProps> = ({
  id: _id,
  initialType = 'pendulum',
  title = 'Living Ink Physics Simulation',
  position,
  onClose,
  onPositionChange,
}) => {
  const [systemType, setSystemType] = useState<PhysicsSystemType>(initialType);
  const [params, setParams] = useState<PhysicsParams>(() =>
    LivingInkPhysicsEngine.getDefaultParams(initialType)
  );
  const [state, setState] = useState<PhysicsState>(() =>
    LivingInkPhysicsEngine.createInitialState(initialType, params)
  );

  const [isRunning, setIsRunning] = useState(true);
  const [timeScale, setTimeScale] = useState<number>(1.0); // 1.0 = normal, 0.5 = slow mo
  const [showVectors, setShowVectors] = useState(true);
  const [showEnergy, setShowEnergy] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Dragging the physical bob/mass in the simulation
  const [isDraggingBob, setIsDraggingBob] = useState(false);

  // Widget container dragging on canvas
  const [isDraggingWidget, setIsDraggingWidget] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [widgetPos, setWidgetPos] = useState<Point>(position);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Reset simulation to initial conditions
  const handleReset = useCallback(() => {
    setState(LivingInkPhysicsEngine.createInitialState(systemType, params));
  }, [systemType, params]);

  // Switch physical system type
  const handleSwitchType = (type: PhysicsSystemType) => {
    setSystemType(type);
    const newParams = LivingInkPhysicsEngine.getDefaultParams(type);
    setParams(newParams);
    setState(LivingInkPhysicsEngine.createInitialState(type, newParams));
  };

  // Main 60 FPS Physics Simulation Loop
  useEffect(() => {
    const loop = (currentTime: number) => {
      const dtMs = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // Cap delta time to prevent explosion on tab backgrounding
      const dt = Math.min(0.05, (dtMs / 1000) * timeScale);

      if (isRunning && !isDraggingBob && dt > 0) {
        setState((prevState) =>
          LivingInkPhysicsEngine.stepSimulation(systemType, prevState, params, dt)
        );
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRunning, isDraggingBob, systemType, params, timeScale]);

  // Render 60 FPS Canvas Graphics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Coordinate origin at center of top region
    const originX = width / 2;
    const originY = systemType === 'pendulum' ? 85 : systemType === 'spring' ? 140 : height / 2;

    // 1. Draw subtle coordinate grid & anchor
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Trail path (Motion History)
    if (state.trail.length > 1) {
      const scale = systemType === 'pendulum' ? 120 : systemType === 'spring' ? 100 : 70;
      ctx.beginPath();
      for (let i = 0; i < state.trail.length; i++) {
        const pt = state.trail[i];
        const tx = originX + pt.x * scale;
        const ty = originY + pt.y * scale;
        if (i === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.strokeStyle = 'rgba(163, 230, 53, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 3. System Specific Rendering
    if (systemType === 'pendulum') {
      const L_px = (params.length || 1.5) * 115;
      const bobX = originX + L_px * Math.sin(state.angle);
      const bobY = originY + L_px * Math.cos(state.angle);

      // Ceiling anchor
      ctx.fillStyle = '#334155';
      ctx.fillRect(originX - 45, originY - 10, 90, 8);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(originX - 45, originY - 10, 90, 8);

      // Hanging string (organic vector ink styling)
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(bobX, bobY);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Pivot joint
      ctx.beginPath();
      ctx.arc(originX, originY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();

      // Pendulum Bob (Spherical mass with glow)
      const bobRadius = Math.max(14, Math.min(28, (params.mass || 1) * 16));
      const bobGlow = ctx.createRadialGradient(bobX, bobY, 2, bobX, bobY, bobRadius * 1.5);
      bobGlow.addColorStop(0, '#a3e635');
      bobGlow.addColorStop(0.7, '#65a30d');
      bobGlow.addColorStop(1, 'rgba(101, 163, 13, 0)');

      ctx.beginPath();
      ctx.arc(bobX, bobY, bobRadius * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = bobGlow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bobX, bobY, bobRadius, 0, Math.PI * 2);
      ctx.fillStyle = isDraggingBob ? '#facc15' : '#a3e635';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vectors (Velocity in Cyan, Gravity in Rose)
      if (showVectors) {
        const vx = state.velocity.x * 25;
        const vy = state.velocity.y * 25;

        // Tangential Velocity
        ctx.beginPath();
        ctx.moveTo(bobX, bobY);
        ctx.lineTo(bobX + vx, bobY + vy);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Arrow head for velocity
        const vAngle = Math.atan2(vy, vx);
        ctx.beginPath();
        ctx.moveTo(bobX + vx, bobY + vy);
        ctx.lineTo(bobX + vx - 8 * Math.cos(vAngle - 0.4), bobY + vy - 8 * Math.sin(vAngle - 0.4));
        ctx.lineTo(bobX + vx - 8 * Math.cos(vAngle + 0.4), bobY + vy - 8 * Math.sin(vAngle + 0.4));
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
      }
    } else if (systemType === 'spring') {
      const massX = originX + state.position.x * 90;
      const springY = originY;

      // Wall Anchor on left
      const wallX = 50;
      ctx.fillStyle = '#334155';
      ctx.fillRect(wallX - 10, springY - 50, 10, 100);

      // Spring Zigzag Coil
      const coils = 12;
      const coilLength = massX - wallX - 25;
      const segmentWidth = coilLength / coils;
      ctx.beginPath();
      ctx.moveTo(wallX, springY);
      for (let i = 0; i < coils; i++) {
        const cx = wallX + i * segmentWidth + segmentWidth / 2;
        const cy = springY + (i % 2 === 0 ? -18 : 18);
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(massX - 25, springY);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Mass Block
      const blockSize = 50;
      ctx.fillStyle = isDraggingBob ? '#facc15' : '#a3e635';
      ctx.fillRect(massX - 25, springY - blockSize / 2, blockSize, blockSize);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(massX - 25, springY - blockSize / 2, blockSize, blockSize);

      // Label on block
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${params.mass}kg`, massX, springY + 4);
    } else if (systemType === 'orbit') {
      const scale = 75;
      const satX = originX + state.position.x * scale;
      const satY = originY + state.position.y * scale;

      // Central Sun / Planet with corona glow
      const sunRadius = 24;
      const sunGlow = ctx.createRadialGradient(originX, originY, 4, originX, originY, 60);
      sunGlow.addColorStop(0, '#f59e0b');
      sunGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
      sunGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.beginPath();
      ctx.arc(originX, originY, 60, 0, Math.PI * 2);
      ctx.fillStyle = sunGlow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(originX, originY, sunRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      // Orbiting Satellite / Moon
      ctx.beginPath();
      ctx.arc(satX, satY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#a3e635';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (systemType === 'projectile') {
      const scale = 14;
      const groundY = height - 50;
      const projX = 60 + state.position.x * scale;
      const projY = groundY - state.position.y * scale;

      // Ground plane
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, groundY, width, 50);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();

      // Projectile ball
      ctx.beginPath();
      ctx.arc(projX, projY, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#a3e635';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }
  }, [state, systemType, params, isDraggingBob, showVectors]);

  // Pointer Down to Drag Bob / Mass in Simulation
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const originX = canvas.width / 2;
    const originY = systemType === 'pendulum' ? 85 : systemType === 'spring' ? 140 : canvas.height / 2;

    if (systemType === 'pendulum') {
      const L_px = (params.length || 1.5) * 115;
      const bobX = originX + L_px * Math.sin(state.angle);
      const bobY = originY + L_px * Math.cos(state.angle);

      if (Math.hypot(mouseX - bobX, mouseY - bobY) < 35) {
        setIsDraggingBob(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    } else if (systemType === 'spring') {
      const massX = originX + state.position.x * 90;
      if (Math.hypot(mouseX - massX, mouseY - originY) < 35) {
        setIsDraggingBob(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
  };

  // Dragging Bob / Mass Updates Angle / Position
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingBob) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const originX = canvas.width / 2;
    const originY = systemType === 'pendulum' ? 85 : systemType === 'spring' ? 140 : canvas.height / 2;

    if (systemType === 'pendulum') {
      const dx = mouseX - originX;
      const dy = mouseY - originY;
      const newAngle = Math.atan2(dx, Math.max(10, dy));
      setState((prev) => ({
        ...prev,
        angle: newAngle,
        angularVelocity: 0,
        position: {
          x: (params.length || 1.5) * Math.sin(newAngle),
          y: (params.length || 1.5) * Math.cos(newAngle),
        },
      }));
    } else if (systemType === 'spring') {
      const newX = (mouseX - originX) / 90;
      setState((prev) => ({
        ...prev,
        position: { x: Math.max(-2, Math.min(2.5, newX)), y: 0 },
        velocity: { x: 0, y: 0 },
      }));
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingBob) {
      setIsDraggingBob(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // safe ignore
      }
    }
  };

  // Header Dragging for Moving the Whole Widget
  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingWidget(true);
    setDragOffset({
      x: e.clientX - widgetPos.x,
      y: e.clientY - widgetPos.y,
    });
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!isDraggingWidget) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      setWidgetPos({ x: newX, y: newY });
      onPositionChange?.({ x: newX, y: newY });
    };

    const handleUp = () => setIsDraggingWidget(false);

    if (isDraggingWidget) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDraggingWidget, dragOffset, onPositionChange]);

  // Derived Physical Metrics
  const period =
    systemType === 'pendulum'
      ? 2 * Math.PI * Math.sqrt((params.length || 1.5) / (params.gravity || 9.8))
      : systemType === 'spring'
      ? 2 * Math.PI * Math.sqrt(params.mass / (params.springK || 24))
      : null;

  return (
    <div
      style={{ transform: `translate(${widgetPos.x}px, ${widgetPos.y}px)` }}
      className={`absolute z-30 select-none rounded-2xl bg-white/95 dark:bg-slate-950/95 border border-slate-200 dark:border-lime-500/40 text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-xl transition-shadow ${
        isMinimized ? 'w-80' : 'w-[440px]'
      }`}
    >
      {/* Widget Header with Drag Handle */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800/80 cursor-grab active:cursor-grabbing rounded-t-2xl bg-slate-50 dark:bg-slate-900/60"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 dark:bg-lime-500/20 border border-emerald-500/30 dark:border-lime-500/30 flex items-center justify-center text-emerald-600 dark:text-lime-400">
            <Atom className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 font-mono">
              <span>{title}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 dark:bg-lime-500/10 text-emerald-600 dark:text-lime-400 border border-emerald-500/20 dark:border-lime-500/20 uppercase">
                {systemType}
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
            title="Close Living Physics"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3 space-y-3">
          {/* System Selection Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono">
            {(['pendulum', 'spring', 'orbit', 'projectile'] as PhysicsSystemType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleSwitchType(type)}
                className={`flex-1 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                  systemType === type
                    ? 'bg-lime-500 text-slate-950 shadow-md shadow-lime-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Interactive 60 FPS Physics Canvas */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-inner">
            <canvas
              ref={canvasRef}
              width={414}
              height={260}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              className="w-full h-[260px] cursor-crosshair touch-none"
              title="Click and drag the bob or mass with stylus or mouse to interact!"
            />

            {/* Drag hint overlay */}
            <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-800 backdrop-blur-md pointer-events-none">
              👆 Drag bob to release
            </div>

            {/* Real-Time Formula Overlay (Apple Math Notes / Desmos Style) */}
            <div className="absolute top-2 right-2 text-[10px] font-mono text-lime-300 bg-slate-900/80 px-2 py-0.5 rounded-full border border-lime-500/30 backdrop-blur-md pointer-events-none">
              {systemType === 'pendulum' && `T = ${period?.toFixed(2)}s | θ = ${(state.angle * (180 / Math.PI)).toFixed(1)}°`}
              {systemType === 'spring' && `T = ${period?.toFixed(2)}s | x = ${state.position.x.toFixed(2)}m`}
              {systemType === 'orbit' && `v = ${Math.hypot(state.velocity.x, state.velocity.y).toFixed(2)} km/s`}
              {systemType === 'projectile' && `y = ${state.position.y.toFixed(1)}m | x = ${state.position.x.toFixed(1)}m`}
            </div>
          </div>

          {/* Real-time Energy Gauge Bar */}
          {showEnergy && (
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-[11px] font-mono space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-lime-400" />
                  Energy Conservation:
                </span>
                <span className="text-slate-200 font-bold">{state.totalEnergy.toFixed(2)} J</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, (state.kineticEnergy / (state.totalEnergy || 1)) * 100))}%`,
                  }}
                  className="bg-cyan-400 h-full transition-all duration-75"
                  title={`Kinetic Energy: ${state.kineticEnergy.toFixed(2)} J`}
                />
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, (state.potentialEnergy / (state.totalEnergy || 1)) * 100))}%`,
                  }}
                  className="bg-lime-400 h-full transition-all duration-75"
                  title={`Potential Energy: ${state.potentialEnergy.toFixed(2)} J`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-cyan-400">Kinetic (K): {state.kineticEnergy.toFixed(1)} J</span>
                <span className="text-lime-400">Potential (U): {state.potentialEnergy.toFixed(1)} J</span>
              </div>
            </div>
          )}

          {/* Quick Playback Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`p-2 rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer transition-all ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/25'
                    : 'bg-lime-500 hover:bg-lime-400 text-slate-950 shadow-md shadow-lime-500/25'
                }`}
                title={isRunning ? 'Pause Simulation' : 'Play 60 FPS Simulation'}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
              <button
                onClick={handleReset}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Reset Simulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTimeScale(timeScale === 1.0 ? 0.25 : 1.0)}
                className={`px-2 py-1.5 rounded-xl border text-[11px] font-mono cursor-pointer transition-colors ${
                  timeScale < 1.0
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Slow Motion (0.25x)"
              >
                {timeScale === 1.0 ? '1x' : '0.25x'}
              </button>
              <button
                onClick={() => setShowVectors(!showVectors)}
                className={`px-2 py-1.5 rounded-xl border text-[11px] font-mono cursor-pointer transition-colors ${
                  showVectors
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Velocity & Acceleration Vectors"
              >
                Vectors
              </button>
              <button
                onClick={() => setShowEnergy(!showEnergy)}
                className={`px-2 py-1.5 rounded-xl border text-[11px] font-mono cursor-pointer transition-colors ${
                  showEnergy
                    ? 'bg-lime-500/20 border-lime-500/40 text-lime-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Live Energy Conservation Bar"
              >
                Energy
              </button>
            </div>

            <button
              onClick={() => setShowControls(!showControls)}
              className={`p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                showControls
                  ? 'bg-lime-500/20 border-lime-500/40 text-lime-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700'
              }`}
              title="Tune Physical Parameters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Collapsible STEM Parameter Sliders */}
          {showControls && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2.5 text-xs font-mono animate-in fade-in duration-150">
              {/* Gravity Environment Presets */}
              <div>
                <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                  <span>Gravity (g): {params.gravity.toFixed(2)} m/s²</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  {[
                    { name: 'Earth', val: 9.81 },
                    { name: 'Moon', val: 1.62 },
                    { name: 'Mars', val: 3.72 },
                    { name: 'Jupiter', val: 24.79 },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setParams((p) => ({ ...p, gravity: preset.val }))}
                      className={`py-1 rounded border text-center transition-all cursor-pointer ${
                        Math.abs(params.gravity - preset.val) < 0.1
                          ? 'bg-lime-500/20 border-lime-500 text-lime-400 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Slider (for pendulum) */}
              {systemType === 'pendulum' && (
                <div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Length (L): {(params.length || 1.5).toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={params.length || 1.5}
                    onChange={(e) => setParams((p) => ({ ...p, length: parseFloat(e.target.value) }))}
                    className="w-full accent-lime-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Spring Constant Slider */}
              {systemType === 'spring' && (
                <div>
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Spring Constant (k): {(params.springK || 24).toFixed(1)} N/m</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="1"
                    value={params.springK || 24}
                    onChange={(e) => setParams((p) => ({ ...p, springK: parseFloat(e.target.value) }))}
                    className="w-full accent-lime-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Damping / Air Resistance Slider */}
              <div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Air Friction / Damping: {(params.damping || 0.015).toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.1"
                  step="0.005"
                  value={params.damping}
                  onChange={(e) => setParams((p) => ({ ...p, damping: parseFloat(e.target.value) }))}
                  className="w-full accent-lime-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
