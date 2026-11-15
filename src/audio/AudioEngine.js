const BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const DEMOS = [
  { id: 'obsidian-pulse', title: 'Obsidian Pulse', artist: 'Obsidian Audio', color: '#b88a35', root: 55, bpm: 92 },
  { id: 'velvet-circuit', title: 'Velvet Circuit', artist: 'Obsidian Audio', color: '#7652aa', root: 65, bpm: 108 },
  { id: 'titanium-drift', title: 'Titanium Drift', artist: 'Obsidian Audio', color: '#3e8192', root: 49, bpm: 78 },
];

/** Web Audio playback, DSP, analysis, file decoding, and bundled procedural demos. */
export default class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.analyser = null;
    this.filters = [];
    this.source = null;
    this.startedAt = 0;
    this.pausedAt = 0;
    this.currentIndex = 0;
    this.queue = DEMOS.map((track) => ({ ...track, duration: 24, buffer: null, lyrics: '' }));
    this.eq = Array(BANDS.length).fill(0);
    this.effects = { dsee: false, clearBass: false, vinyl: false, spatial: false };
    this.nodes = {};
    this.listeners = new Set();
  }

  ensureContext() {
    if (this.context) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('Web Audio is not supported by this browser.');
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = 0.82;
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;
    this.filters = BANDS.map((frequency, index) => {
      const filter = this.context.createBiquadFilter();
      filter.type = index === 0 ? 'lowshelf' : index === BANDS.length - 1 ? 'highshelf' : 'peaking';
      filter.frequency.value = frequency;
      filter.Q.value = 1.05;
      filter.gain.value = this.eq[index];
      if (index) this.filters[index - 1].connect(filter);
      return filter;
    });
    this.nodes.clearBass = this.context.createBiquadFilter();
    this.nodes.clearBass.type = 'peaking'; this.nodes.clearBass.frequency.value = 58; this.nodes.clearBass.Q.value = 0.8;
    this.nodes.dsee = this.context.createWaveShaper();
    this.nodes.dsee.curve = this.makeCurve(1.7); this.nodes.dsee.oversample = '4x';
    this.nodes.vinyl = this.context.createWaveShaper();
    this.nodes.vinyl.curve = this.makeCurve(1.08); this.nodes.vinyl.oversample = '2x';
    this.nodes.vinylLowpass = this.context.createBiquadFilter();
    this.nodes.vinylLowpass.type = 'lowpass'; this.nodes.vinylLowpass.frequency.value = 19000;
    this.nodes.delay = this.context.createDelay(0.08); this.nodes.delay.delayTime.value = 0.018;
    this.nodes.wet = this.context.createGain(); this.nodes.wet.gain.value = 0;
    this.nodes.dry = this.context.createGain(); this.nodes.dry.gain.value = 1;
    this.nodes.panner = this.context.createStereoPanner(); this.nodes.panner.pan.value = 0;
    const first = this.filters[0];
    first.connect(this.nodes.clearBass);
    this.nodes.clearBass.connect(this.nodes.dsee);
    this.nodes.dsee.connect(this.nodes.vinyl);
    this.nodes.vinyl.connect(this.nodes.vinylLowpass);
    this.nodes.vinylLowpass.connect(this.nodes.dry);
    this.nodes.dry.connect(this.nodes.panner);
    this.nodes.vinylLowpass.connect(this.nodes.delay);
    this.nodes.delay.connect(this.nodes.wet);
    this.nodes.wet.connect(this.nodes.panner);
    this.nodes.panner.connect(this.analyser);
    this.analyser.connect(this.master);
    this.master.connect(this.context.destination);
    this.applyEffects();
  }

  makeCurve(amount) {
    const curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / (curve.length - 1) - 1;
      curve[i] = Math.tanh(amount * x) / Math.tanh(amount);
    }
    return curve;
  }

  getTracks() { return this.queue.map(({ buffer, ...track }) => track); }
  getCurrentTrack() { return this.queue[this.currentIndex] ?? null; }
  getAnalyser() { this.ensureContext(); return this.analyser; }
  getCurrentTime() {
    if (!this.context || !this.source) return this.pausedAt;
    return Math.max(0, this.context.currentTime - this.startedAt);
  }
  getDuration() { return this.getCurrentTrack()?.duration ?? 0; }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  notify() { for (const listener of this.listeners) listener(); }

  async makeDemoBuffer(track) {
    this.ensureContext();
    if (track.buffer) return track.buffer;
    const sampleRate = this.context.sampleRate;
    const length = Math.floor(sampleRate * track.duration);
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const beat = 60 / track.bpm;
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const beatPhase = (t % beat) / beat;
        const kick = Math.sin(2 * Math.PI * track.root * t) * Math.exp(-beatPhase * 12);
        const bass = 0.22 * Math.sin(2 * Math.PI * track.root * 0.5 * t);
        const pad = 0.12 * (Math.sin(2 * Math.PI * track.root * 1.5 * t) + Math.sin(2 * Math.PI * track.root * 2 * t));
        const pulse = Math.sin(2 * Math.PI * (track.root * 4) * t + channel * 0.24) * (0.035 + 0.035 * Math.sin(2 * Math.PI * 0.17 * t));
        const fade = Math.min(1, t * 1.5, (track.duration - t) * 1.5);
        data[i] = (kick * 0.38 + bass + pad + pulse) * Math.max(0, fade) * 0.62;
      }
    }
    track.buffer = buffer;
    return buffer;
  }

  async play(index = this.currentIndex) {
    this.ensureContext();
    if (this.context.state === 'suspended') await this.context.resume();
    if (index !== this.currentIndex || !this.source) {
      this.stopSource();
      this.currentIndex = Math.max(0, Math.min(index, this.queue.length - 1));
      const track = this.queue[this.currentIndex];
      if (!track) return;
      const buffer = track.buffer || await this.makeDemoBuffer(track);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.filters[0]);
      source.onended = () => {
        if (this.source === source && this.pausedAt === 0) this.next();
      };
      this.source = source;
      this.pausedAt = 0;
      this.startedAt = this.context.currentTime;
      source.start(0);
    } else if (this.pausedAt > 0) {
      const track = this.getCurrentTrack();
      const source = this.context.createBufferSource();
      source.buffer = track.buffer || await this.makeDemoBuffer(track);
      source.connect(this.filters[0]);
      source.onended = () => { if (this.source === source && this.pausedAt === 0) this.next(); };
      this.source = source;
      this.startedAt = this.context.currentTime - this.pausedAt;
      source.start(0, this.pausedAt % track.duration);
    }
    this.notify();
  }

  stopSource() {
    if (!this.source) return;
    const old = this.source;
    this.source = null;
    old.onended = null;
    try { old.stop(); } catch { /* already stopped */ }
  }
  pause() { if (!this.source) return; this.pausedAt = this.getCurrentTime(); this.stopSource(); this.notify(); }
  togglePlayback() { return this.source ? this.pause() : this.play(); }
  next() { if (!this.queue.length) return; this.pausedAt = 0; return this.play((this.currentIndex + 1) % this.queue.length); }
  previous() {
    if (this.getCurrentTime() > 3) { this.seek(0); return; }
    this.pausedAt = 0; return this.play((this.currentIndex - 1 + this.queue.length) % this.queue.length);
  }
  seek(seconds) {
    const wasPlaying = Boolean(this.source);
    this.pausedAt = Math.max(0, Math.min(seconds, this.getDuration() - 0.05));
    if (wasPlaying) { this.stopSource(); this.play(this.currentIndex); }
    else this.notify();
  }
  setEQ(values) {
    this.eq = BANDS.map((_, i) => Math.max(-12, Math.min(12, Number(values[i] ?? 0))));
    if (this.context) this.filters.forEach((filter, i) => { filter.gain.setTargetAtTime(this.eq[i], this.context.currentTime, 0.025); });
  }
  setEffect(name, enabled) {
    const key = ({ dseeUltimate: 'dsee', clearBass: 'clearBass', vinylProcessor: 'vinyl', reality360: 'spatial' })[name] || name;
    if (!(key in this.effects)) return;
    this.effects[key] = Boolean(enabled);
    if (this.context) this.applyEffects();
  }
  setDSEEUltimate(enabled) { this.setEffect('dsee', enabled); }
  setClearBass(enabled) { this.setEffect('clearBass', enabled); }
  setVinylProcessor(enabled) { this.setEffect('vinyl', enabled); }
  set360RealityAudio(enabled) { this.setEffect('spatial', enabled); }
  applyEffects() {
    const now = this.context.currentTime;
    this.nodes.clearBass.gain.setTargetAtTime(this.effects.clearBass ? 5 : 0, now, 0.03);
    this.nodes.wet.gain.setTargetAtTime(this.effects.spatial ? 0.22 : 0, now, 0.05);
    this.nodes.panner.pan.setTargetAtTime(0, now, 0.05);
    // A small, fixed, harmonically rich saturation is always available; toggle controls the corresponding stage's output.
    this.nodes.dsee.curve = this.makeCurve(this.effects.dsee ? 2 : 1);
    this.nodes.vinyl.curve = this.makeCurve(this.effects.vinyl ? 1.18 : 1);
    this.nodes.vinylLowpass.frequency.setTargetAtTime(this.effects.vinyl ? 16500 : 20000, now, 0.05);
  }

  async addFiles(files) {
    this.ensureContext();
    const accepted = [];
    const errors = [];
    for (const file of files) {
      if (!/\.(mp3|wav|flac|ogg)$/i.test(file.name)) { errors.push(`${file.name}: unsupported format`); continue; }
      try {
        const buffer = await this.context.decodeAudioData(await file.arrayBuffer());
        const track = { id: `file-${crypto.randomUUID()}`, title: file.name.replace(/\.[^.]+$/, ''), artist: 'Local file', duration: buffer.duration, color: '#a88747', buffer, lyrics: '', format: file.name.split('.').pop().toUpperCase(), sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels };
        this.queue.push(track); accepted.push(track);
      } catch { errors.push(`${file.name}: could not decode audio`); }
    }
    this.notify();
    return { tracks: accepted, errors };
  }
  playTrack(id) { const index = this.queue.findIndex((track) => track.id === id); if (index >= 0) return this.play(index); }
  destroy() { this.stopSource(); this.listeners.clear(); if (this.context && this.context.state !== 'closed') this.context.close(); this.context = null; }
}
