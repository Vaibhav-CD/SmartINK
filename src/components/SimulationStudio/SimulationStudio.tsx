import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Pin,
  FlaskConical,
  Timer,
  MoveHorizontal,
  Orbit,
  Rocket,
  Waves,
  Sparkles,
} from 'lucide-react';
import {
  LivingInkPhysicsEngine,
  WAVE_HALF_LENGTH,
  WAVE_PROBE_X,
  type PhysicsParams,
  type PhysicsState,
  type PhysicsSystemType,
} from '../../services/physics/livingInkPhysics';
import {
  SIM_CATALOG,
  applyParamValue,
  getSimParamDescriptors,
  matchRequirement,
  readParamValue,
} from '../../services/simulations/simCatalog';

export interface SimulationStudioProps {
  onBack: () => void;
  onPinToCanvas: (type: PhysicsSystemType, params: PhysicsParams, title: string) => void;
}

const SYSTEM_ICONS: Record<PhysicsSystemType, React.ReactNode> = {
  pendulum: <Timer className="w-4 h-4" />,
  spring: <MoveHorizontal className="w-4 h-4" />,
  orbit: <Orbit className="w-4 h-4" />,
  projectile: <Rocket className="w-4 h-4" />,
  wave: <Waves className="w-4 h-4" />,
};

const GRAVITY_PRESETS = [
  { name: 'Earth', val: 9.81 },
  { name: 'Moon', val: 1.62 },
  { name: 'Mars', val: 3.72 },
  { name: 'Jupiter', val: 24.79 },
];

const STAGE_W = 760;
const STAGE_H = 460;

export const SimulationStudio: React.FC<SimulationStudioProps> = ({ onBack, onPinToCanvas }) => {
  const [system, setSystem] = useState<PhysicsSystemType>('projectile');
  const [params, setParams] = useState<PhysicsParams>(() =>
    LivingInkPhysicsEngine.getDefaultParams('projectile')
  );
  const [state, setState] = useState<PhysicsState>(() =>
    LivingInkPhysicsEngine.createInitialState(
      'projectile',
      LivingInkPhysicsEngine.getDefaultParams('projectile')
    )
  );

  const [requirement, setRequirement] = useState('');
  const [matchNote, setMatchNote] = useState<{ text: string; ok: boolean } | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(() =>
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
      ? true
      : !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [timeScale, setTimeScale] = useState(1.0);
  const [showVectors, setShowVectors] = useState(true);
  const [showEnergy, setShowEnergy] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const resetSim = useCallback(
    (nextParams: PhysicsParams = params, nextSystem: PhysicsSystemType = system) => {
      setState(LivingInkPhysicsEngine.createInitialState(nextSystem, nextParams));
    },
    [params, system]
  );

  const switchSystem = useCallback((type: PhysicsSystemType) => {
    const fresh = LivingInkPhysicsEngine.getDefaultParams(type);
    setSystem(type);
    setParams(fresh);
    setState(LivingInkPhysicsEngine.createInitialState(type, fresh));
    setMatchNote(null);
  }, []);

  const runRequirement = useCallback(
    (text: string) => {
      const match = matchRequirement(text);
      if (!match) {
        setMatchNote({
          text: 'No confident match — try words like pendulum, spring, orbit, projectile or wave, or pick a system.',
          ok: false,
        });
        return;
      }
      setSystem(match.system);
      setParams(match.params);
      setState(LivingInkPhysicsEngine.createInitialState(match.system, match.params));
      setMatchNote({ text: `Matched: ${match.label}`, ok: true });
    },
    []
  );

  const updateParam = useCallback(
    (key: string, value: number) => {
      setParams((prev) => {
        const next = applyParamValue(prev, system, key, value);
        // Structural params restart the motion so the effect is immediate.
        if (key === 'releaseAngleDeg' || key === 'launchSpeed' || key === 'launchAngleDeg' || key === 'orbitalVelocity' || key === 'initialDisplacement') {
          setState(LivingInkPhysicsEngine.createInitialState(system, next));
        }
        return next;
      });
    },
    [system]
  );

  // 60 FPS simulation loop
  useEffect(() => {
    lastTimeRef.current = performance.now();
    const loop = (currentTime: number) => {
      const dtMs = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      const dt = Math.min(0.05, (dtMs / 1000) * timeScale);
      if (isRunning && dt > 0) {
        setState((prev) => LivingInkPhysicsEngine.stepSimulation(system, prev, params, dt));
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    if (typeof requestAnimationFrame !== 'function') return;
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRunning, system, params, timeScale]);

  // Stage renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const originX = width / 2;
    const originY = system === 'pendulum' ? 110 : system === 'spring' ? height / 2 : height / 2;

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const drawArrow = (x1: number, y1: number, x2: number, y2: number, color: string) => {
      if (Math.hypot(x2 - x1, y2 - y1) < 4) return;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 9 * Math.cos(a - 0.4), y2 - 9 * Math.sin(a - 0.4));
      ctx.lineTo(x2 - 9 * Math.cos(a + 0.4), y2 - 9 * Math.sin(a + 0.4));
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Trail
    if (state.trail.length > 1 && system !== 'wave') {
      const scale = system === 'pendulum' ? 100 : system === 'spring' ? 140 : system === 'orbit' ? 110 : 15;
      const baseX = system === 'projectile' ? 70 : originX;
      const baseY = system === 'projectile' ? height - 56 : originY;
      ctx.beginPath();
      for (let i = 0; i < state.trail.length; i++) {
        const pt = state.trail[i];
        const tx = baseX + pt.x * scale;
        const ty = system === 'projectile' ? baseY - pt.y * scale : baseY + pt.y * scale;
        if (i === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.strokeStyle = 'rgba(163, 230, 53, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (system === 'pendulum') {
      const L = params.length || 1.5;
      const Lpx = L * 100;
      const bobX = originX + Lpx * Math.sin(state.angle);
      const bobY = originY + Lpx * Math.cos(state.angle);
      ctx.fillStyle = '#334155';
      ctx.fillRect(originX - 55, originY - 12, 110, 9);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.strokeRect(originX - 55, originY - 12, 110, 9);
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(bobX, bobY);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(originX, originY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      const bobR = Math.max(12, Math.min(26, params.mass * 14));
      const glow = ctx.createRadialGradient(bobX, bobY, 2, bobX, bobY, bobR * 1.6);
      glow.addColorStop(0, '#a3e635');
      glow.addColorStop(0.7, '#65a30d');
      glow.addColorStop(1, 'rgba(101, 163, 13, 0)');
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobR * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
      ctx.fillStyle = '#a3e635';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (showVectors) {
        drawArrow(bobX, bobY, bobX + state.velocity.x * 30, bobY + state.velocity.y * 30, '#38bdf8');
      }
    } else if (system === 'spring') {
      const massX = originX + state.position.x * 140;
      const cy = originY;
      const wallX = 60;
      ctx.fillStyle = '#334155';
      ctx.fillRect(wallX - 12, cy - 60, 12, 120);
      const coils = 14;
      const coilLen = Math.max(30, massX - 27 - wallX);
      const seg = coilLen / coils;
      ctx.beginPath();
      ctx.moveTo(wallX, cy);
      for (let i = 0; i < coils; i++) {
        ctx.lineTo(wallX + i * seg + seg / 2, cy + (i % 2 === 0 ? -20 : 20));
      }
      ctx.lineTo(massX - 27, cy);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(massX - 27, cy - 27, 54, 54);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(massX - 27, cy - 27, 54, 54);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${params.mass}kg`, massX, cy + 5);
      if (showVectors) {
        drawArrow(massX, cy - 40, massX + state.velocity.x * 40, cy - 40, '#38bdf8');
      }
    } else if (system === 'orbit') {
      const scale = 110;
      const satX = originX + state.position.x * scale;
      const satY = originY + state.position.y * scale;
      const sunGlow = ctx.createRadialGradient(originX, originY, 4, originX, originY, 80);
      sunGlow.addColorStop(0, '#f59e0b');
      sunGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
      sunGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.beginPath();
      ctx.arc(originX, originY, 80, 0, Math.PI * 2);
      ctx.fillStyle = sunGlow;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(originX, originY, 26, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(satX, satY, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#a3e635';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (showVectors) {
        drawArrow(satX, satY, satX + state.velocity.x * 22, satY + state.velocity.y * 22, '#38bdf8');
      }
    } else if (system === 'projectile') {
      const scale = 15;
      const groundY = height - 56;
      const px = 70 + state.position.x * scale;
      const py = groundY - state.position.y * scale;
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, groundY, width, 56);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();
      // Launch pad marker
      ctx.fillStyle = '#475569';
      ctx.fillRect(58, groundY - 14, 24, 14);
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#a3e635';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      if (showVectors) {
        drawArrow(px, py, px + state.velocity.x * 4, py - state.velocity.y * 4, '#38bdf8');
      }
    } else if (system === 'wave') {
      const padX = 50;
      const pxPerM = (width - padX * 2) / (2 * WAVE_HALF_LENGTH);
      const pyPerM = 130;
      const cy = height / 2;
      const snap = LivingInkPhysicsEngine.waveSnapshot(params, state.time);
      // Equilibrium line
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(padX, cy);
      ctx.lineTo(width - padX, cy);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      // String
      ctx.beginPath();
      for (let i = 0; i <= 160; i++) {
        const x = -WAVE_HALF_LENGTH + (i / 160) * 2 * WAVE_HALF_LENGTH;
        const y = snap.amp * Math.sin(snap.k * x - snap.omega * state.time);
        const sx = padX + (x + WAVE_HALF_LENGTH) * pxPerM;
        const sy = cy - y * pyPerM;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = '#a3e635';
      ctx.lineWidth = 3;
      ctx.stroke();
      // Fixed-end anchors
      ctx.fillStyle = '#334155';
      ctx.fillRect(padX - 12, cy - 40, 12, 80);
      ctx.fillRect(width - padX, cy - 40, 12, 80);
      // Probe particle
      const probeSx = padX + (WAVE_PROBE_X + WAVE_HALF_LENGTH) * pxPerM;
      const probeSy = cy - snap.probeY * pyPerM;
      ctx.beginPath();
      ctx.arc(probeSx, probeSy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (showVectors) {
        drawArrow(probeSx, probeSy, probeSx, probeSy - snap.probeVy * 8, '#f472b6');
      }
    }
  }, [state, system, params, showVectors]);

  const descriptors = getSimParamDescriptors(system);
  const hasGravity = descriptors.some((d) => d.key === 'gravity');
  const entry = SIM_CATALOG.find((e) => e.type === system)!;

  const period =
    system === 'pendulum'
      ? 2 * Math.PI * Math.sqrt((params.length || 1.5) / Math.max(0.01, params.gravity))
      : system === 'spring'
      ? 2 * Math.PI * Math.sqrt(params.mass / (params.springK || 24))
      : system === 'wave'
      ? 1 / (params.frequency || 1.2)
      : null;

  const readout =
    system === 'pendulum'
      ? `T = ${period!.toFixed(2)}s · θ = ${((state.angle * 180) / Math.PI).toFixed(1)}°`
      : system === 'spring'
      ? `T = ${period!.toFixed(2)}s · x = ${state.position.x.toFixed(2)} m`
      : system === 'orbit'
      ? `v = ${Math.hypot(state.velocity.x, state.velocity.y).toFixed(2)} · r = ${Math.hypot(
          state.position.x,
          state.position.y
        ).toFixed(2)}`
      : system === 'projectile'
      ? `x = ${state.position.x.toFixed(1)} m · y = ${state.position.y.toFixed(1)} m`
      : `f = ${(params.frequency || 1.2).toFixed(1)} Hz · T = ${period!.toFixed(2)}s · λ = ${(
          (params.waveSpeed || 2) /
          (params.frequency || 1.2)
        ).toFixed(2)} m`;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#06080d] text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:border-lime-500/40 hover:text-lime-500 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-lime-500" />
                Simulation Studio
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Describe what to simulate — then tune every parameter live.
              </p>
            </div>
          </div>
          <button
            onClick={() => onPinToCanvas(system, params, `${entry.title} — Studio`)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 text-xs font-bold shadow-md shadow-lime-500/20 transition-colors cursor-pointer"
            title="Spawn this simulation as a floating widget on your canvas"
          >
            <Pin className="w-3.5 h-3.5" />
            <span>Pin to canvas</span>
          </button>
        </div>

        {/* Requirement bar */}
        <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 space-y-2.5 shadow-sm">
          <div className="flex gap-2">
            <input
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runRequirement(requirement);
              }}
              placeholder='e.g. "Launch a projectile on the Moon at 20 m/s and 45 degrees"'
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:border-lime-500"
            />
            <button
              onClick={() => runRequirement(requirement)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold shadow-md shadow-emerald-500/20 transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Simulate</span>
            </button>
          </div>
          {matchNote && (
            <p
              className={`text-xs font-mono px-1 ${
                matchNote.ok ? 'text-emerald-600 dark:text-lime-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {matchNote.text}
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-mono px-1">Try:</span>
            {SIM_CATALOG.map((e) => (
              <button
                key={e.type}
                onClick={() => {
                  setRequirement(e.example);
                  runRequirement(e.example);
                }}
                className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 hover:border-lime-500/40 hover:text-lime-600 dark:hover:text-lime-400 transition-colors cursor-pointer"
              >
                {e.example}
              </button>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)_270px] gap-4 items-start">
          {/* Gallery */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            {SIM_CATALOG.map((e) => (
              <button
                key={e.type}
                onClick={() => switchSystem(e.type)}
                className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                  system === e.type
                    ? 'bg-lime-500/10 border-lime-500/50 shadow-md shadow-lime-500/10'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div
                  className={`flex items-center gap-2 text-sm font-bold ${
                    system === e.type ? 'text-lime-600 dark:text-lime-400' : ''
                  }`}
                >
                  {SYSTEM_ICONS[e.type]}
                  {e.title}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{e.blurb}</p>
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-1.5">{e.formula}</p>
              </button>
            ))}
          </div>

          {/* Stage */}
          <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="relative bg-slate-950">
              <canvas ref={canvasRef} width={STAGE_W} height={STAGE_H} className="w-full h-auto block" />
              <div className="absolute top-2.5 left-2.5 text-[11px] font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-700 backdrop-blur-md pointer-events-none">
                {entry.formula}
              </div>
              <div className="absolute top-2.5 right-2.5 text-[11px] font-mono text-lime-300 bg-slate-900/80 px-2.5 py-1 rounded-full border border-lime-500/30 backdrop-blur-md pointer-events-none">
                {readout}
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-3 flex-wrap">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`p-2 rounded-xl font-bold cursor-pointer transition-all ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-lime-500 hover:bg-lime-400 text-slate-950'
                }`}
                title={isRunning ? 'Pause' : 'Play'}
              >
                {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button
                onClick={() => resetSim()}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Restart simulation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTimeScale(timeScale === 1.0 ? 0.25 : 1.0)}
                className={`px-2.5 py-2 rounded-xl border text-[11px] font-mono cursor-pointer transition-colors ${
                  timeScale < 1.0
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-600 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                }`}
                title="Toggle slow motion"
              >
                {timeScale === 1.0 ? '1x' : '0.25x'}
              </button>
              <button
                onClick={() => setShowVectors(!showVectors)}
                className={`px-2.5 py-2 rounded-xl border text-[11px] font-mono cursor-pointer transition-colors ${
                  showVectors
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-600 dark:text-cyan-300'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                }`}
                title="Toggle velocity vectors"
              >
                Vectors
              </button>
              <button
                onClick={() => setShowEnergy(!showEnergy)}
                className={`px-2.5 py-2 rounded-xl border text-[11px] font-mono cursor-pointer transition-colors flex items-center gap-1 ${
                  showEnergy
                    ? 'bg-lime-500/20 border-lime-500/40 text-lime-600 dark:text-lime-400'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                }`}
                title="Toggle energy gauge"
              >
                <Activity className="w-3.5 h-3.5" />
                Energy
              </button>
            </div>
            {showEnergy && (
              <div className="mx-3 mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Energy conservation</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">
                    {state.totalEnergy.toFixed(2)} J
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, (state.kineticEnergy / (state.totalEnergy || 1)) * 100))}%`,
                    }}
                    className="bg-cyan-400 h-full"
                  />
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, (state.potentialEnergy / (state.totalEnergy || 1)) * 100))}%`,
                    }}
                    className="bg-lime-400 h-full"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-cyan-600 dark:text-cyan-400">Kinetic: {state.kineticEnergy.toFixed(1)} J</span>
                  <span className="text-lime-600 dark:text-lime-400">
                    Potential: {state.potentialEnergy.toFixed(1)} J
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Parameters */}
          <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold">Parameters</h2>
            {hasGravity && (
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-mono">World presets</div>
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  {GRAVITY_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => updateParam('gravity', preset.val)}
                      className={`py-1 rounded-lg border text-center transition-all cursor-pointer ${
                        Math.abs(params.gravity - preset.val) < 0.1
                          ? 'bg-lime-500/20 border-lime-500 text-lime-600 dark:text-lime-400 font-bold'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {descriptors.map((d) => (
              <div key={d.key}>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between font-mono">
                  <span>
                    {d.label}
                    {d.unit ? ` (${d.unit})` : ''}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {readParamValue(params, system, d.key).toFixed(d.step < 0.1 ? 2 : d.step < 1 ? 1 : 0)}
                  </span>
                </div>
                <input
                  type="range"
                  min={d.min}
                  max={d.max}
                  step={d.step}
                  value={readParamValue(params, system, d.key)}
                  onChange={(e) => updateParam(d.key, parseFloat(e.target.value))}
                  className="w-full accent-lime-500 h-1.5 cursor-pointer"
                />
              </div>
            ))}
            <button
              onClick={() => switchSystem(system)}
              className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
