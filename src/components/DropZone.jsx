import { useRef, useState } from 'react';

export default function DropZone({ engine, onTracksAdded }) {
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState('Drop audio files to add them to your queue');
  const [error, setError] = useState(false);
  const inputRef = useRef(null);
  const accept = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const invalid = files.filter((file) => !/\.(mp3|wav|flac|ogg)$/i.test(file.name));
    if (invalid.length) { setError(true); setMessage(`Unsupported: ${invalid.map((file) => file.name).join(', ')}. Use MP3, WAV, FLAC, or OGG.`); }
    const valid = files.filter((file) => /\.(mp3|wav|flac|ogg)$/i.test(file.name));
    if (!valid.length) return;
    setError(false); setMessage('Decoding audio…');
    try {
      const result = await engine.addFiles(valid);
      onTracksAdded?.(result.tracks);
      if (result.errors.length) { setError(true); setMessage(result.errors.join(' · ')); }
      else { setError(false); setMessage(`${result.tracks.length} ${result.tracks.length === 1 ? 'track' : 'tracks'} added to queue`); }
    } catch (reason) { setError(true); setMessage(reason?.message || 'Unable to decode these files.'); }
  };
  const onDrop = (event) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files); };
  return <section onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={onDrop} className={`rounded-2xl border border-dashed p-4 text-center transition duration-200 ${dragging ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_32px_#D4AF3730]' : 'border-white/15 bg-white/[.02] hover:border-white/30'} ${error ? 'border-red-400/40' : ''}`}>
    <input ref={inputRef} type="file" multiple accept=".mp3,.wav,.flac,.ogg,audio/mpeg,audio/wav,audio/flac,audio/ogg" className="hidden" onChange={(event) => { accept(event.target.files); event.target.value = ''; }} />
    <button onClick={() => inputRef.current?.click()} className="w-full"><span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-[#D4AF37]/30 text-lg text-[#D4AF37]">＋</span><span className="block text-xs text-white/70">{message}</span><span className="mt-1 block text-[10px] text-white/30">MP3 · WAV · FLAC · OGG · Browse files</span></button>
    <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[9px]">{['Hi-Res Audio', 'FLAC · 96kHz / 24-bit', 'LDAC'].map((badge) => <span key={badge} className="rounded-full border border-white/[.08] px-2 py-1 text-white/30">{badge}</span>)}</div>
  </section>;
}
