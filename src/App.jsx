import { useCallback, useEffect, useRef, useState } from 'react';
import AudioEngine from './audio/AudioEngine.js';
import DropZone from './components/DropZone.jsx';
import Panels from './components/Panels.jsx';

const time = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export default function App() {
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = new AudioEngine();
  const engine = engineRef.current;
  const [tracks, setTracks] = useState(() => engine.getTracks());
  const [currentTrack, setCurrentTrack] = useState(() => engine.getCurrentTrack());
  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState(null);
  const [position, setPosition] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const canvasRef = useRef(null);
  const artworkRef = useRef(null);
  const [peaks, setPeaks] = useState(Array(42).fill(0.12));

  const sync = useCallback(() => {
    setCurrentTrack(engine.getCurrentTrack()); setTracks(engine.getTracks()); setPosition(engine.getCurrentTime()); setPlaying(Boolean(engine.source));
  }, [engine]);
  useEffect(() => {
    const unsubscribe = engine.subscribe(sync);
    const timer = window.setInterval(sync, 120);
    return () => { unsubscribe(); window.clearInterval(timer); engine.destroy(); };
  }, [engine, sync]);

  useEffect(() => {
    let frame;
    let analyser;
    try { analyser = engine.getAnalyser(); } catch { return undefined; }
    const data = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const draw = () => {
      frame = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      if (!canvas || !ctx) return;
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (canvas.width !== width * ratio || canvas.height !== height * ratio) { canvas.width = width * ratio; canvas.height = height * ratio; }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
      const bars = 56, gap = 3, barWidth = (width - gap * (bars - 1)) / bars;
      for (let i = 0; i < bars; i++) {
        const value = data[Math.floor((i / bars) ** 1.8 * (data.length * 0.72))] / 255;
        const barHeight = Math.max(2, value * height * 0.9);
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, 'rgba(212,175,55,.28)'); gradient.addColorStop(1, 'rgba(240,218,148,.95)');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(i * (barWidth + gap), height - barHeight, barWidth, barHeight, 3); ctx.fill();
      }
    };
    draw(); return () => cancelAnimationFrame(frame);
  }, [engine]);

  useEffect(() => {
    if (!playing) { setPeaks(Array(42).fill(0.08)); return undefined; }
    const timer = window.setInterval(() => setPeaks(Array.from({ length: 42 }, () => 0.12 + Math.random() * 0.82)), 75);
    return () => window.clearInterval(timer);
  }, [playing, currentTrack]);

  const playTrack = (id, index) => { const found = tracks.findIndex((track) => track.id === id); engine.play(found >= 0 ? found : index ?? 0); };
  const next = () => {
    if (shuffle && tracks.length > 1) { let index; do { index = Math.floor(Math.random() * tracks.length); } while (index === tracks.findIndex((track) => track.id === currentTrack?.id)); engine.play(index); }
    else if (repeat && currentTrack && tracks.length === 1) engine.play(0);
    else engine.next();
  };
  const progress = currentTrack?.duration ? Math.min(100, position / currentTrack.duration * 100) : 0;
  const artColor = currentTrack?.color || '#98783a';

  return <main className="relative min-h-screen overflow-hidden bg-[#0A0A0C] text-white selection:bg-[#D4AF37]/30">
    <div className="pointer-events-none absolute -left-40 -top-40 h-[38rem] w-[38rem] rounded-full opacity-[.14] blur-[120px] transition-colors duration-1000" style={{ backgroundColor: artColor }} />
    <div className="pointer-events-none absolute -bottom-48 -right-40 h-[36rem] w-[36rem] rounded-full opacity-[.1] blur-[130px] transition-colors duration-1000" style={{ backgroundColor: artColor }} />
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8"><a href="#home" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/30 text-[#D4AF37]">◈</span><span><span className="block text-sm font-medium tracking-[.14em]">OBSIDIAN</span><span className="block text-[9px] tracking-[.3em] text-white/35">HI-FI PLAYER</span></span></a><span className="hidden items-center gap-2 text-[10px] uppercase tracking-[.2em] text-white/35 sm:flex"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Lossless listening, reimagined</span><button onClick={() => setPanel('queue')} className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60 hover:border-[#D4AF37]/40 hover:text-white">Queue <span className="ml-1 text-[#D4AF37]">{tracks.length}</span></button></header>
    <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 pb-10 pt-5 md:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)] md:px-8 md:pt-12">
      <section className="flex flex-col items-center">
        <div className="relative aspect-square w-[min(76vw,420px)]" ref={artworkRef}>
          <div className="absolute inset-0 rounded-[2rem] blur-2xl transition-colors" style={{ backgroundColor: artColor, opacity: .23 }} />
          <div className="album-art relative flex h-full w-full items-center justify-center overflow-hidden rounded-[1.7rem] border border-white/15 shadow-[0_32px_90px_rgba(0,0,0,.7)]" style={{ background: `radial-gradient(circle at 50% 40%, ${artColor}a0, #111115 62%, #080809)` }}>
            <div className={`vinyl-disc absolute h-[79%] w-[79%] rounded-full border border-white/15 ${playing ? 'vinyl-running' : ''}`} style={{ background: 'repeating-radial-gradient(circle,#111 0px,#18181a 2px,#111 3px,#131315 5px)', boxShadow: '0 12px 35px #000a' }}><div className="absolute inset-[34%] rounded-full border border-white/10" style={{ background: `radial-gradient(circle,${artColor},#151519 68%)` }}><span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ddd]" /></div></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[.16] via-transparent to-black/25" />
            <span className="absolute bottom-5 left-5 text-[9px] uppercase tracking-[.28em] text-white/65">{currentTrack?.format || 'OBSIDIAN EDITION'} · STEREO</span><span className="absolute right-5 top-5 rounded-full border border-white/20 bg-black/20 px-2.5 py-1 font-mono text-[9px] text-white/60">{currentTrack?.sampleRate ? `${(currentTrack.sampleRate / 1000).toFixed(1)} kHz` : '24 BIT · HI-RES'}</span>
          </div>
        </div>
        <div className="mt-5 grid w-[min(76vw,420px)] grid-cols-3 gap-2">
          {['eq', 'queue', 'lyrics'].map((item) => <button key={item} onClick={() => setPanel(item)} className="rounded-xl border border-white/[.08] bg-white/[.03] py-3 text-[10px] uppercase tracking-[.18em] text-white/55 transition hover:border-[#D4AF37]/35 hover:text-[#D4AF37]">{item === 'eq' ? '◉  Equalizer' : item === 'queue' ? '≡  Queue' : '♫  Lyrics'}</button>)}
        </div>
      </section>
      <section className="mx-auto w-full max-w-xl">
        <p className="text-[10px] uppercase tracking-[.3em] text-[#D4AF37]">Now playing · {currentTrack?.artist || 'Obsidian Audio'}</p><h1 className="mt-3 text-3xl font-light tracking-tight sm:text-5xl">{currentTrack?.title || 'Obsidian Pulse'}</h1><p className="mt-2 text-sm text-white/40">A procedural stereo listening experience</p>
        <div className="mt-8 rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[.2em] text-white/35"><span>Live spectrum</span><span>20 Hz — 20 kHz</span></div><canvas ref={canvasRef} className="h-16 w-full" /></div>
        <div className="mt-6"><div className="relative flex h-11 items-end gap-[2px] overflow-hidden" aria-label="Waveform scrubber">{peaks.map((peak, i) => <button key={i} aria-label={`Seek to ${Math.round((i / peaks.length) * (currentTrack?.duration || 0))} seconds`} onClick={() => engine.seek((i / peaks.length) * (currentTrack?.duration || 0))} className="relative flex h-full flex-1 items-center justify-center"><span className="w-full rounded-full transition-colors" style={{ height: `${Math.max(8, peak * 80)}%`, background: i / peaks.length * 100 <= progress ? '#D4AF37' : 'rgba(255,255,255,.19)' }} /></button>)}<div className="pointer-events-none absolute bottom-0 top-0 w-px bg-white shadow-[0_0_8px_white]" style={{ left: `${progress}%` }} /></div><div className="mt-2 flex justify-between font-mono text-[10px] text-white/35"><span>{time(position)}</span><span>{time(currentTrack?.duration || 0)}</span></div></div>
        <div className="mt-7 flex items-center justify-center gap-5 sm:gap-8"><button aria-label="Shuffle" aria-pressed={shuffle} onClick={() => setShuffle(!shuffle)} className={`text-lg ${shuffle ? 'text-[#D4AF37]' : 'text-white/35 hover:text-white'}`}>⤨</button><button aria-label="Previous" onClick={() => engine.previous()} className="text-2xl text-white/75 hover:text-white">|◀</button><button aria-label={playing ? 'Pause' : 'Play'} onClick={() => playing ? engine.pause() : engine.play()} className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D4AF37] text-xl text-[#111] shadow-[0_8px_35px_#D4AF3740] transition hover:scale-105">{playing ? 'Ⅱ' : '▶'}</button><button aria-label="Next" onClick={next} className="text-2xl text-white/75 hover:text-white">▶|</button><button aria-label="Repeat" aria-pressed={repeat} onClick={() => setRepeat(!repeat)} className={`text-lg ${repeat ? 'text-[#D4AF37]' : 'text-white/35 hover:text-white'}`}>↻</button></div>
        <div className="mt-8"><DropZone engine={engine} onTracksAdded={(added) => { setTracks(engine.getTracks()); if (!currentTrack && added[0]) engine.playTrack(added[0].id); }} /></div>
        <p className="mt-5 text-center text-[9px] uppercase tracking-[.22em] text-white/25">Built for the details you can hear</p>
      </section>
    </div>
    <footer className="relative z-10 mx-auto flex max-w-7xl justify-between border-t border-white/[.06] px-5 py-5 text-[9px] tracking-[.12em] text-white/25 sm:px-8"><span>OBSIDIAN · HI-FI PLAYER</span><span>WEB AUDIO · STEREO</span></footer>
    <Panels panel={panel} onClose={() => setPanel(null)} engine={engine} tracks={tracks} currentTrack={currentTrack} onPlayTrack={playTrack} />
    <style>{`@keyframes spin-vinyl{to{transform:rotate(360deg)}}.vinyl-running{animation:spin-vinyl 8s linear infinite}.album-art{isolation:isolate}button{cursor:pointer}button:focus-visible,input:focus-visible{outline:2px solid #D4AF37;outline-offset:3px}@media(prefers-reduced-motion:reduce){.vinyl-running{animation-duration:30s}}`}</style>
  </main>;
}
