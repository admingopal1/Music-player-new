import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Equalizer from './Equalizer.jsx';

const formatTime = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function EQPanel({ open, onClose, engine }) {
  return <Drawer open={open} onClose={onClose} title="Equalizer"><Equalizer engine={engine} onClose={onClose} /></Drawer>;
}

export function QueuePanel({ open, onClose, tracks = [], currentTrack, onPlayTrack, engine }) {
  return <Drawer open={open} onClose={onClose} title="Play queue">
    <div className="flex items-center justify-between px-5 pb-3 text-xs text-white/45"><span>{tracks.length} tracks</span><span>UP NEXT</span></div>
    <div className="max-h-[70vh] overflow-y-auto px-3 pb-4">{tracks.map((track, i) => <button key={track.id ?? i} onClick={() => onPlayTrack?.(track.id, i) ?? engine?.playTrack?.(track.id)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${track.id === currentTrack?.id ? 'bg-[#D4AF37]/10' : 'hover:bg-white/[.04]'}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-xs" style={{ color: track.color || '#D4AF37', background: `${track.color || '#D4AF37'}18` }}>{track.id === currentTrack?.id ? '♫' : String(i + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1"><span className={`block truncate text-sm ${track.id === currentTrack?.id ? 'text-[#D4AF37]' : 'text-white/85'}`}>{track.title}</span><span className="mt-1 block truncate text-xs text-white/40">{track.artist || 'Unknown artist'}</span></span><span className="text-xs tabular-nums text-white/35">{formatTime(track.duration)}</span></button>)}</div>
  </Drawer>;
}

export function LyricsPanel({ open, onClose, track }) {
  const lyrics = track?.lyrics?.trim();
  return <Drawer open={open} onClose={onClose} title="Lyrics"><div className="max-h-[70vh] overflow-y-auto px-6 pb-8 text-center">{lyrics ? <><p className="mb-6 text-xs uppercase tracking-[.22em] text-[#D4AF37]">{track.title} · {track.artist}</p><p className="whitespace-pre-line text-base leading-8 text-white/75">{lyrics}</p></> : <div className="flex min-h-44 flex-col items-center justify-center"><span className="mb-3 text-3xl text-white/15">♪</span><p className="text-sm text-white/50">No lyrics</p><p className="mt-1 text-xs text-white/25">Lyrics for this track aren’t available.</p></div>}</div></Drawer>;
}

export function Panels({ panel, onClose, engine, tracks, currentTrack, onPlayTrack }) {
  return <><EQPanel open={panel === 'eq'} onClose={onClose} engine={engine} /><QueuePanel open={panel === 'queue'} onClose={onClose} tracks={tracks} currentTrack={currentTrack} onPlayTrack={onPlayTrack} /><LyricsPanel open={panel === 'lyrics'} onClose={onClose} track={currentTrack} /></>;
}
export default Panels;

function Drawer({ open, onClose, title, children }) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  if (!mounted && !open) return null;
  return <AnimatePresence onExitComplete={() => { if (!open) setMounted(false); }}><div className="fixed inset-0 z-50" aria-hidden={!open}>
    <motion.button aria-label="Close panel" className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: open ? 1 : 0 }} exit={{ opacity: 0 }} />
    <motion.aside role="dialog" aria-modal="true" aria-label={title} className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0A0A0C]/95 shadow-2xl backdrop-blur-3xl" initial={{ x: '100%' }} animate={{ x: open ? 0 : '100%' }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }}><header className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-[10px] uppercase tracking-[.3em] text-[#D4AF37]">Obsidian audio</p><h2 className="mt-1 text-lg text-white">{title}</h2></div><button onClick={onClose} aria-label="Close panel" className="h-9 w-9 rounded-full border border-white/10 text-xl text-white/60 hover:text-white">×</button></header><div className="min-h-0 flex-1 overflow-y-auto py-4">{children}</div></motion.aside>
  </div></AnimatePresence>;
}
