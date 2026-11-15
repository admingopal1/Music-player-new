import { useState } from 'react';

const FREQUENCIES = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
const PRESETS = {
  'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Sony ClearAudio+': [3, 4, 2, 0, -1, 1, 3, 4, 3, 2],
  'Bass Boost': [8, 7, 5, 3, 1, 0, 0, 0, 0, 0],
  'Vocal': [-3, -2, 0, 3, 5, 4, 2, 1, 0, -1],
  'Jazz': [4, 2, 1, 2, -2, -1, 1, 2, 3, 4],
  'Studio Reference': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};
const FX = [
  ['dsee', 'DSEE Ultimate', 'Harmonic restoration'],
  ['clearBass', 'Clear Bass', '40–80 Hz low-end focus'],
  ['vinyl', 'Vinyl Processor', 'Analog warmth'],
  ['spatial', '360 Reality Audio', 'Spatial ambience'],
];
const GOLD = '#D4AF37';

export default function Equalizer({ engine, onClose }) {
  const [values, setValues] = useState(Array(10).fill(0));
  const [preset, setPreset] = useState('Flat');
  const [effects, setEffects] = useState({ dsee: false, clearBass: false, vinyl: false, spatial: false });
  const update = (index, value) => {
    const next = values.slice(); next[index] = Number(value); setValues(next); setPreset('Custom'); engine?.setEQ(next);
  };
  const selectPreset = (name) => { setPreset(name); setValues(PRESETS[name]); engine?.setEQ(PRESETS[name]); };
  const toggleFx = (key) => {
    const enabled = !effects[key]; setEffects((old) => ({ ...old, [key]: enabled }));
    const methods = { dsee: 'setDSEEUltimate', clearBass: 'setClearBass', vinyl: 'setVinylProcessor', spatial: 'set360RealityAudio' };
    if (engine?.[methods[key]]) engine[methods[key]](enabled);
    else engine?.setEffect?.(key, enabled);
  };
  return (
    <section className="eq-shell" aria-label="Audio equalizer">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div><p className="text-[10px] uppercase tracking-[.34em] text-[#D4AF37]">Sound shaping</p><h2 className="mt-1 text-xl font-medium text-white">10-band equalizer</h2></div>
        {onClose && <button aria-label="Close equalizer" onClick={onClose} className="rounded-full border border-white/10 px-3 py-1 text-white/60 hover:text-white">×</button>}
      </header>
      <div className="flex flex-wrap gap-2 px-5 pt-4">{Object.keys(PRESETS).map((name) => <button key={name} onClick={() => selectPreset(name)} className={`rounded-full border px-3 py-1.5 text-xs transition ${preset === name ? 'border-[#D4AF37]/70 bg-[#D4AF37]/15 text-[#D4AF37]' : 'border-white/10 text-white/55 hover:border-white/30 hover:text-white'}`}>{name}</button>)}</div>
      <div className="eq-bands mx-5 mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {values.map((value, i) => <label key={FREQUENCIES[i]} className="flex min-w-0 flex-col items-center">
          <span className="mb-1 font-mono text-[10px] tabular-nums text-[#D4AF37]">{value > 0 ? '+' : ''}{value.toFixed(1)}<small className="ml-0.5 text-[8px] text-white/35">dB</small></span>
          <div className="eq-track"><div className="eq-center" /><input aria-label={`${FREQUENCIES[i]} Hz gain`} type="range" min="-12" max="12" step="0.5" value={value} onChange={(event) => update(i, event.target.value)} /></div>
          <span className="mt-2 text-[10px] text-white/45">{FREQUENCIES[i]}</span>
        </label>)}
      </div>
      <div className="mx-5 mt-5 flex justify-between font-mono text-[9px] text-white/30"><span>−12 dB</span><span>0</span><span>+12 dB</span></div>
      <div className="mx-5 mb-5 mt-5 border-t border-white/10 pt-4">
        <p className="mb-3 text-[10px] uppercase tracking-[.25em] text-white/45">Digital signal processing</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{FX.map(([key, title, detail]) => <button key={key} onClick={() => toggleFx(key)} aria-pressed={effects[key]} className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${effects[key] ? 'border-[#D4AF37]/45 bg-[#D4AF37]/[.07]' : 'border-white/[.08] bg-white/[.02] hover:bg-white/[.05]'}`}><span><span className="block text-xs text-white/85">{title}</span><span className="mt-1 block text-[10px] text-white/35">{detail}</span></span><span className={`relative h-5 w-9 rounded-full transition ${effects[key] ? 'bg-[#D4AF37]' : 'bg-white/15'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${effects[key] ? 'left-[18px]' : 'left-0.5'}`} /></span></button>)}</div>
      </div>
      <style>{`.eq-shell{background:rgba(10,10,12,.92);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.08);border-radius:20px;color:#fff}.eq-track{height:142px;width:34px;position:relative;display:flex;align-items:center;justify-content:center;border-radius:20px;background:linear-gradient(90deg,#131316,#242428 48%,#101013);border:1px solid rgba(255,255,255,.09);box-shadow:inset 2px 0 4px #000,inset -1px 0 2px #ffffff12}.eq-center{position:absolute;height:1px;width:9px;background:${GOLD};opacity:.65}.eq-track input{appearance:none;position:absolute;z-index:1;writing-mode:vertical-lr;direction:rtl;width:142px;height:34px;transform:rotate(180deg);background:transparent;cursor:pointer}.eq-track input::-webkit-slider-runnable-track{height:3px;border-radius:5px;background:linear-gradient(90deg,#09090a,#38383b,#09090a)}.eq-track input::-webkit-slider-thumb{appearance:none;width:24px;height:14px;border:1px solid #e7d285;border-radius:3px;background:linear-gradient(180deg,#eee7cf,#77736b 48%,#c9c4b8);box-shadow:0 2px 5px #000b; margin-top:-5.5px}.eq-track input::-moz-range-thumb{width:24px;height:14px;border:1px solid #e7d285;border-radius:3px;background:linear-gradient(180deg,#eee7cf,#77736b 48%,#c9c4b8);box-shadow:0 2px 5px #000b}`}</style>
    </section>
  );
}
