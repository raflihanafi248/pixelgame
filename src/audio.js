// Audio engine: everything is synthesised live with the Web Audio API.
//
// The goal is a modern, grounded soundscape rather than chiptune bleeps, so
// each sound is built the way a sound designer would layer one:
//
//   transient  - the click/slap that gives an impact its punch
//   body       - the pitched or resonant part that gives it weight
//   tail       - noise wash and reverb that place it in the room
//
// Three things do most of the work for realism:
//   * convolution reverb, with an impulse response generated per environment
//     (an open wood sounds nothing like a crystal cave)
//   * per-play randomisation of pitch, level and timing, so a sound never
//     repeats identically - identical repeats are the giveaway of cheap audio
//   * stereo placement and distance filtering from the world position, so
//     things off to the left actually sound off to the left, and muffled

const REVERBS = {
  autumn: { dur: 1.2, decay: 2.6, tone: 0.55, wet: 0.22 },
  night: { dur: 1.9, decay: 2.2, tone: 0.40, wet: 0.28 },
  cave: { dur: 3.4, decay: 1.7, tone: 0.20, wet: 0.42 },
  snow: { dur: 0.9, decay: 3.4, tone: 0.62, wet: 0.16 },
  lair: { dur: 3.9, decay: 1.5, tone: 0.16, wet: 0.38 },
  title: { dur: 2.2, decay: 2.0, tone: 0.45, wet: 0.3 },
  ending: { dur: 2.6, decay: 2.0, tone: 0.5, wet: 0.34 },
};

// Footstep timbre per ground surface.
const SURFACES = {
  autumn: { freq: 900, q: 0.8, dur: 0.14, vol: 0.20, crunch: 0.55 },  // leaf litter
  night: { freq: 620, q: 0.9, dur: 0.13, vol: 0.17, crunch: 0.35 },   // damp earth
  cave: { freq: 1500, q: 2.2, dur: 0.10, vol: 0.22, crunch: 0.18 },   // bare stone
  snow: { freq: 2600, q: 1.1, dur: 0.17, vol: 0.20, crunch: 0.85 },   // squeaking snow
  lair: { freq: 760, q: 1.4, dur: 0.15, vol: 0.20, crunch: 0.6 },     // ash and grit
};

// Cinematic score: slow chord beds with an arpeggio on top, not a note grid.
// Chords are MIDI note numbers; each entry lasts `barsPerChord` bars.
const MUSIC = {
  title: {
    bpm: 72, barsPerChord: 2, padWave: "sawtooth", arpWave: "triangle",
    chords: [[45, 57, 60, 64], [41, 53, 57, 60], [43, 55, 59, 62], [45, 57, 60, 64]],
    arp: [0, 2, 3, 2, 1, 2, 3, 2], perc: null, arpVol: 0.1, padVol: 0.085,
  },
  autumn: {
    bpm: 84, barsPerChord: 2, padWave: "sawtooth", arpWave: "triangle",
    chords: [[45, 57, 64, 69], [50, 62, 65, 69], [43, 55, 62, 67], [41, 53, 60, 65]],
    arp: [0, 2, 3, 2, 1, 3, 2, 1], perc: null, arpVol: 0.095, padVol: 0.08,
  },
  night: {
    bpm: 66, barsPerChord: 2, padWave: "sawtooth", arpWave: "sine",
    chords: [[38, 50, 57, 62], [36, 48, 55, 60], [41, 53, 60, 65], [38, 50, 57, 63]],
    arp: [0, 3, 2, 3, 1, 3, 2, 3], perc: "soft", arpVol: 0.075, padVol: 0.095,
  },
  cave: {
    bpm: 60, barsPerChord: 2, padWave: "sawtooth", arpWave: "sine",
    chords: [[40, 52, 59, 64], [38, 50, 57, 62], [43, 55, 62, 67], [40, 52, 59, 66]],
    arp: [0, 2, 1, 3, 0, 3, 1, 2], perc: "drip", arpVol: 0.085, padVol: 0.1,
  },
  snow: {
    bpm: 58, barsPerChord: 2, padWave: "triangle", arpWave: "sine",
    chords: [[48, 60, 67, 72], [46, 58, 65, 70], [43, 55, 62, 69], [48, 60, 67, 74]],
    arp: [3, 2, 1, 2, 3, 2, 1, 0], perc: null, arpVol: 0.09, padVol: 0.085,
  },
  lair: {
    bpm: 96, barsPerChord: 1, padWave: "sawtooth", arpWave: "sawtooth",
    chords: [[31, 43, 50, 55], [31, 43, 50, 56], [34, 46, 53, 58], [29, 41, 48, 53]],
    arp: [0, 0, 1, 0, 2, 0, 1, 3], perc: "taiko", arpVol: 0.07, padVol: 0.12,
  },
  ending: {
    bpm: 62, barsPerChord: 2, padWave: "sawtooth", arpWave: "triangle",
    chords: [[48, 60, 64, 67], [43, 55, 59, 62], [45, 57, 60, 64], [41, 53, 57, 60]],
    arp: [0, 1, 2, 3, 2, 1, 0, 1], perc: null, arpVol: 0.09, padVol: 0.09,
  },
};

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

const Sound = {
  ctx: null,
  master: null, limiter: null,
  musicBus: null, sfxBus: null, ambBus: null,
  reverb: null, reverbWet: null,
  noiseBuf: null, distCurve: null,
  muted: false,
  listenerX: 0,
  env: "autumn",

  _music: null, _musicTimer: null, _bar: 0, _nextBarTime: 0, _chordIdx: 0,
  _amb: [], _ambTimer: null,

  // ------------------------------------------------------------------ setup
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // no Web Audio: every method below turns into a no-op
    this.ctx = new AC();

    // A limiter on the end of the chain keeps layered hits from clipping.
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -8;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.18;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.8;
    this.musicBus.connect(this.master);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);

    this.ambBus = this.ctx.createGain();
    this.ambBus.gain.value = 0.6;
    this.ambBus.connect(this.master);

    this.reverb = this.ctx.createConvolver();
    this.reverbWet = this.ctx.createGain();
    this.reverbWet.gain.value = 0.25;
    this.reverb.connect(this.reverbWet);
    this.reverbWet.connect(this.master);

    const len = Math.floor(this.ctx.sampleRate * 2);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.distCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i * 2) / 1024 - 1;
      this.distCurve[i] = ((3 + 18) * x * 20 * Math.PI) / 180 / (Math.PI + 18 * Math.abs(x));
    }

    this.setEnvironment("autumn");
  },

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.9;
    return this.muted;
  },

  // A synthetic impulse response: exponentially decaying noise, darkened by a
  // one-pole filter. Short and bright reads as open air, long and dark as stone.
  makeIR(dur, decay, tone) {
    const rate = this.ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * dur));
    const ir = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const s = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
        lp += (s - lp) * tone;
        data[i] = lp * (1 - t * 0.2);
      }
    }
    return ir;
  },

  setEnvironment(theme) {
    if (!this.ctx) return;
    const cfg = REVERBS[theme] || REVERBS.autumn;
    if (this.env === theme && this.reverb.buffer) return;
    this.env = theme;
    this.reverb.buffer = this.makeIR(cfg.dur, cfg.decay, cfg.tone);
    this.reverbWet.gain.value = cfg.wet;
  },

  setListener(x) { this.listenerX = x; },

  // ------------------------------------------------------------- primitives
  // Where a sound sits in the stereo field, how loud it is and how much high
  // end survives the trip, given where it happened in the world.
  _place(opts) {
    if (opts.x == null) return { pan: 0, gain: 1, lp: 18000 };
    const dx = opts.x - this.listenerX;
    const dist = Math.abs(dx);
    if (dist > 1200) return null; // too far away to bother rendering
    return {
      pan: Math.max(-0.9, Math.min(0.9, dx / 560)),
      gain: Math.max(0, 1 - dist / 1200),
      lp: Math.max(900, 18000 - dist * 13),
    };
  },

  // Builds the per-sound output chain: [source] -> lowpass -> pan -> dry + send.
  _chain(place, bus, sendAmount = 0.35) {
    const out = this.ctx.createGain();
    out.gain.value = place.gain;

    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = place.lp;

    const pan = this.ctx.createStereoPanner
      ? this.ctx.createStereoPanner()
      : null;

    out.connect(lp);
    if (pan) {
      pan.pan.value = place.pan;
      lp.connect(pan);
      pan.connect(bus || this.sfxBus);
      if (sendAmount > 0) {
        const send = this.ctx.createGain();
        send.gain.value = sendAmount;
        pan.connect(send);
        send.connect(this.reverb);
      }
    } else {
      lp.connect(bus || this.sfxBus);
      if (sendAmount > 0) {
        const send = this.ctx.createGain();
        send.gain.value = sendAmount;
        lp.connect(send);
        send.connect(this.reverb);
      }
    }
    return out;
  },

  _adsr(param, t0, peak, a, d, sus, hold, r) {
    param.setValueAtTime(0.0001, t0);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak * sus), t0 + a + d);
    param.setValueAtTime(Math.max(0.0002, peak * sus), t0 + a + d + hold);
    param.exponentialRampToValueAtTime(0.0001, t0 + a + d + hold + r);
  },

  _osc({ type = "sine", freq, to, dur, vol, t0, dest, detune = 0, curve }) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(Math.max(1, freq), t0);
    if (to) {
      if (curve === "linear") osc.frequency.linearRampToValueAtTime(Math.max(1, to), t0 + dur);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
    return osc;
  },

  _noise({ dur, vol, freq, to, q = 1, type = "bandpass", t0, dest, attack = 0.004 }) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = rand(0.85, 1.15);
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (to) f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t0, rand(0, 1));
    src.stop(t0 + dur + 0.05);
    return src;
  },

  // Struck-metal and bell tones: inharmonic partials, each decaying at its own
  // rate. This is what separates a real clang from a plain beep.
  _metal({ base, partials, dur, vol, t0, dest, type = "triangle" }) {
    partials.forEach((ratio, i) => {
      const d = dur * (1 - i * 0.13);
      this._osc({
        type, freq: base * ratio, dur: Math.max(0.05, d),
        vol: vol / (1.5 + i * 0.9), t0: t0 + i * 0.002, dest,
        detune: rand(-12, 12),
      });
    });
  },

  // ------------------------------------------------------------------ sfx
  play(name, opts = {}) {
    if (!this.ctx || this.muted) return;
    const place = this._place(opts);
    if (!place) return;
    const t0 = this.ctx.currentTime + (opts.delay || 0);
    const v = opts.vol == null ? 1 : opts.vol;

    switch (name) {
      // ---- movement
      case "jump": {
        const out = this._chain(place, this.sfxBus, 0.2);
        // armour rustle + a short effort breath
        this._noise({ dur: 0.13, vol: 0.16 * v, freq: rand(1600, 2100), to: 700, q: 1.1, t0, dest: out });
        this._noise({ dur: 0.18, vol: 0.09 * v, freq: rand(700, 900), q: 4, t0: t0 + 0.01, dest: out });
        this._osc({ type: "sine", freq: rand(160, 200), to: 110, dur: 0.1, vol: 0.06 * v, t0, dest: out });
        break;
      }
      case "land": {
        const out = this._chain(place, this.sfxBus, 0.3);
        const heavy = Math.min(1.4, 0.7 + (opts.force || 0));
        this._osc({ type: "sine", freq: 150 * heavy, to: 48, dur: 0.16, vol: 0.28 * v * heavy, t0, dest: out, curve: "linear" });
        this._noise({ dur: 0.12, vol: 0.2 * v * heavy, freq: 800, to: 180, q: 0.7, type: "lowpass", t0, dest: out });
        this._noise({ dur: 0.22, vol: 0.09 * v, freq: 3200, to: 1400, q: 0.8, t0: t0 + 0.02, dest: out });
        break;
      }
      case "step": {
        const s = SURFACES[opts.surface] || SURFACES.autumn;
        const out = this._chain(place, this.sfxBus, 0.22);
        this._noise({
          dur: s.dur * rand(0.85, 1.15), vol: s.vol * v * rand(0.75, 1.1),
          freq: s.freq * rand(0.82, 1.22), to: s.freq * 0.35, q: s.q, t0, dest: out,
        });
        // grit/crunch layer on top of the body of the step
        if (s.crunch > 0) {
          this._noise({
            dur: s.dur * 1.5, vol: s.vol * s.crunch * 0.55 * v,
            freq: rand(4000, 7000), q: 0.7, type: "highpass",
            t0: t0 + 0.006, dest: out,
          });
        }
        this._osc({ type: "sine", freq: rand(80, 110), to: 55, dur: 0.07, vol: 0.06 * v, t0, dest: out });
        break;
      }
      case "dash": {
        const out = this._chain(place, this.sfxBus, 0.34);
        this._noise({ dur: 0.34, vol: 0.22 * v, freq: 300, to: 3000, q: 1.3, t0, dest: out });
        this._noise({ dur: 0.3, vol: 0.14 * v, freq: 1800, to: 400, q: 0.8, t0: t0 + 0.05, dest: out });
        this._osc({ type: "sine", freq: 180, to: 70, dur: 0.22, vol: 0.1 * v, t0, dest: out });
        break;
      }

      // ---- sword
      case "swing1": case "swing2": case "swing3": {
        const heavy = name === "swing3";
        const out = this._chain(place, this.sfxBus, heavy ? 0.4 : 0.26);
        const top = heavy ? rand(3600, 4200) : rand(2800, 3400);
        this._noise({ dur: heavy ? 0.26 : 0.17, vol: (heavy ? 0.26 : 0.2) * v, freq: top, to: top * 0.22, q: 1.6, t0, dest: out });
        this._noise({ dur: 0.1, vol: 0.08 * v, freq: rand(900, 1300), q: 3, t0, dest: out }); // cloth
        if (heavy) {
          this._osc({ type: "sawtooth", freq: 300, to: 110, dur: 0.24, vol: 0.12 * v, t0, dest: out });
        }
        break;
      }
      case "hit": { // blade into a creature: slap + dull body + blade ring
        const out = this._chain(place, this.sfxBus, 0.3);
        this._noise({ dur: 0.06, vol: 0.34 * v, freq: 2600, to: 900, q: 0.8, t0, dest: out });
        this._noise({ dur: 0.16, vol: 0.22 * v, freq: 420, to: 140, q: 0.9, type: "lowpass", t0, dest: out });
        this._osc({ type: "triangle", freq: rand(150, 190), to: 70, dur: 0.18, vol: 0.2 * v, t0, dest: out });
        this._metal({ base: rand(1500, 1900), partials: [1, 2.41, 3.77], dur: 0.2, vol: 0.06 * v, t0, dest: out });
        break;
      }
      case "clang": { // blade on stone or armour
        const out = this._chain(place, this.sfxBus, 0.45);
        this._noise({ dur: 0.05, vol: 0.3 * v, freq: 5000, q: 0.7, type: "highpass", t0, dest: out });
        this._metal({ base: rand(1700, 2300), partials: [1, 2.76, 5.4, 8.9], dur: 0.7, vol: 0.2 * v, t0, dest: out });
        break;
      }

      // ---- damage
      case "hurt": {
        const out = this._chain(place, this.sfxBus, 0.3);
        this._noise({ dur: 0.07, vol: 0.3 * v, freq: 3000, to: 1000, q: 0.8, t0, dest: out });
        this._metal({ base: rand(900, 1200), partials: [1, 2.3, 4.1], dur: 0.35, vol: 0.14 * v, t0, dest: out });
        this._osc({ type: "sawtooth", freq: rand(300, 360), to: 130, dur: 0.3, vol: 0.14 * v, t0: t0 + 0.02, dest: out });
        this._noise({ dur: 0.25, vol: 0.1 * v, freq: 800, q: 5, t0: t0 + 0.04, dest: out }); // gasp
        break;
      }
      case "death": {
        const out = this._chain(place, this.sfxBus, 0.5);
        this._osc({ type: "sawtooth", freq: 220, to: 55, dur: 1.2, vol: 0.2 * v, t0, dest: out });
        this._osc({ type: "sine", freq: 90, to: 32, dur: 1.6, vol: 0.28 * v, t0, dest: out, curve: "linear" });
        this._noise({ dur: 0.5, vol: 0.18 * v, freq: 900, to: 160, q: 0.7, type: "lowpass", t0: t0 + 0.05, dest: out });
        this._metal({ base: 700, partials: [1, 2.6, 4.9], dur: 1.1, vol: 0.1 * v, t0: t0 + 0.12, dest: out });
        break;
      }
      case "enemyDie": {
        const out = this._chain(place, this.sfxBus, 0.4);
        this._noise({ dur: 0.34, vol: 0.2 * v, freq: 1600, to: 200, q: 0.6, t0, dest: out });
        this._osc({ type: "sawtooth", freq: rand(380, 460), to: 80, dur: 0.4, vol: 0.16 * v, t0, dest: out });
        this._osc({ type: "sine", freq: 120, to: 45, dur: 0.3, vol: 0.14 * v, t0: t0 + 0.02, dest: out });
        break;
      }

      // ---- pickups and UI
      case "pickup": { // crystal: inharmonic bell with a shimmer tail
        const out = this._chain(place, this.sfxBus, 0.5);
        const base = rand(1150, 1320);
        this._metal({ base, partials: [1, 2.02, 3.01, 4.7], dur: 0.6, vol: 0.14 * v, t0, dest: out, type: "sine" });
        this._osc({ type: "sine", freq: base * 2, dur: 0.25, vol: 0.05 * v, t0: t0 + 0.04, dest: out });
        break;
      }
      case "checkpoint": {
        const out = this._chain(place, this.sfxBus, 0.6);
        [523.25, 659.25, 783.99].forEach((f, i) => {
          this._metal({ base: f, partials: [1, 2.01, 3.04], dur: 1.6 - i * 0.2, vol: 0.12 * v, t0: t0 + i * 0.08, dest: out, type: "sine" });
        });
        this._noise({ dur: 0.7, vol: 0.05 * v, freq: 6000, q: 0.8, type: "highpass", t0, dest: out });
        break;
      }
      case "levelClear": {
        const out = this._chain(place, this.sfxBus, 0.55);
        // a short orchestral-style swell: stacked fifths with a slow attack
        [261.6, 392.0, 523.25, 784.0].forEach((f, i) => {
          for (const det of [-8, 8]) {
            const g = this.ctx.createGain();
            g.connect(out);
            this._adsr(g.gain, t0 + i * 0.1, 0.07 * v, 0.35, 0.3, 0.6, 0.5, 0.9);
            this._osc({ type: "sawtooth", freq: f, dur: 2.0, vol: 1, t0: t0 + i * 0.1, dest: g, detune: det });
          }
        });
        this._osc({ type: "sine", freq: 90, to: 60, dur: 1.4, vol: 0.2 * v, t0, dest: out }); // timpani
        this._noise({ dur: 1.2, vol: 0.06 * v, freq: 4000, q: 0.6, type: "highpass", t0, dest: out });
        break;
      }
      case "select": {
        const out = this._chain(place, this.sfxBus, 0.3);
        this._metal({ base: 880, partials: [1, 2.4], dur: 0.3, vol: 0.1 * v, t0, dest: out, type: "sine" });
        break;
      }

      // ---- dragon
      case "fire": { // fireball: gas ignition whoosh over a low rumble
        const out = this._chain(place, this.sfxBus, 0.4);
        this._noise({ dur: 0.45, vol: 0.24 * v, freq: 480, to: 1800, q: 0.7, type: "lowpass", t0, dest: out });
        this._noise({ dur: 0.35, vol: 0.14 * v, freq: 2600, to: 600, q: 1.2, t0: t0 + 0.03, dest: out });
        this._osc({ type: "sawtooth", freq: 140, to: 60, dur: 0.4, vol: 0.12 * v, t0, dest: out });
        break;
      }
      case "roar": {
        const out = this._chain(place, this.sfxBus, 0.6);
        // distorted growl through vowel-like formants, plus a breath layer
        const shaper = this.ctx.createWaveShaper();
        shaper.curve = this.distCurve;
        shaper.connect(out);
        const growl = this.ctx.createGain();
        growl.gain.value = 0.35 * v;
        growl.connect(shaper);
        for (const [f, det] of [[70, 0], [70, 14], [104, -9]]) {
          this._osc({ type: "sawtooth", freq: f * rand(0.95, 1.06), to: f * 0.62, dur: 1.1, vol: 0.5, t0, dest: growl, detune: det, curve: "linear" });
        }
        for (const ff of [520, 1180, 2400]) {
          const form = this.ctx.createBiquadFilter();
          form.type = "bandpass";
          form.frequency.value = ff * rand(0.9, 1.1);
          form.Q.value = 6;
          const fg = this.ctx.createGain();
          fg.gain.value = 0.5 * v;
          form.connect(fg); fg.connect(out);
          this._noise({ dur: 1.0, vol: 0.5, freq: ff, to: ff * 0.7, q: 6, t0, dest: form });
        }
        this._osc({ type: "sine", freq: 46, to: 28, dur: 1.5, vol: 0.3 * v, t0, dest: out, curve: "linear" });
        break;
      }
      case "bossHit": {
        const out = this._chain(place, this.sfxBus, 0.5);
        this._noise({ dur: 0.07, vol: 0.34 * v, freq: 3200, to: 900, q: 0.7, t0, dest: out });
        this._noise({ dur: 0.24, vol: 0.24 * v, freq: 400, to: 120, q: 0.8, type: "lowpass", t0, dest: out });
        this._osc({ type: "sine", freq: 110, to: 40, dur: 0.3, vol: 0.3 * v, t0, dest: out, curve: "linear" });
        this._metal({ base: rand(600, 780), partials: [1, 2.7, 4.3], dur: 0.4, vol: 0.1 * v, t0, dest: out });
        break;
      }
      case "bossDie": {
        const out = this._chain(place, this.sfxBus, 0.7);
        this._osc({ type: "sawtooth", freq: 150, to: 34, dur: 2.6, vol: 0.26 * v, t0, dest: out, curve: "linear" });
        this._osc({ type: "sine", freq: 60, to: 22, dur: 3.2, vol: 0.32 * v, t0, dest: out, curve: "linear" });
        this._noise({ dur: 2.4, vol: 0.2 * v, freq: 900, to: 90, q: 0.5, type: "lowpass", t0, dest: out });
        for (let i = 0; i < 7; i++) { // collapsing debris
          this._noise({ dur: 0.2, vol: 0.12 * v, freq: rand(300, 900), to: 120, q: 1.2, t0: t0 + 0.4 + i * rand(0.12, 0.3), dest: out });
        }
        [392, 349.2, 293.7].forEach((f, i) => {
          this._metal({ base: f, partials: [1, 2.01, 3.02], dur: 2.2, vol: 0.1 * v, t0: t0 + 1.0 + i * 0.4, dest: out, type: "sine" });
        });
        break;
      }
      case "gameOver": {
        const out = this._chain(place, this.sfxBus, 0.6);
        [196, 174.6, 155.6].forEach((f, i) => {
          for (const det of [-7, 7]) {
            const g = this.ctx.createGain();
            g.connect(out);
            this._adsr(g.gain, t0 + i * 0.5, 0.08, 0.4, 0.4, 0.5, 0.4, 1.2);
            this._osc({ type: "sawtooth", freq: f, dur: 2.4, vol: 1, t0: t0 + i * 0.5, dest: g, detune: det });
          }
        });
        this._osc({ type: "sine", freq: 70, to: 40, dur: 2.5, vol: 0.22, t0, dest: out, curve: "linear" });
        break;
      }
    }
  },

  // -------------------------------------------------------------- ambience
  startAmbience(theme) {
    this.init();
    if (!this.ctx) return;
    this.stopAmbience();
    this._ambTheme = theme;

    const mkBed = ({ freq, q, type, vol, lfoRate, lfoDepth }) => {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const filt = this.ctx.createBiquadFilter();
      filt.type = type;
      filt.frequency.value = freq;
      filt.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      // a slow LFO on the filter keeps the bed breathing instead of hissing
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = lfoRate;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(filt.frequency);
      src.connect(filt); filt.connect(g); g.connect(this.ambBus);
      const send = this.ctx.createGain();
      send.gain.value = 0.3;
      g.connect(send); send.connect(this.reverb);
      src.start();
      lfo.start();
      this._amb.push(src, lfo);
    };

    if (theme === "autumn") {
      mkBed({ freq: 700, q: 0.6, type: "bandpass", vol: 0.1, lfoRate: 0.08, lfoDepth: 380 });
      mkBed({ freq: 2600, q: 0.5, type: "bandpass", vol: 0.035, lfoRate: 0.13, lfoDepth: 900 });
    } else if (theme === "night") {
      mkBed({ freq: 380, q: 0.6, type: "lowpass", vol: 0.12, lfoRate: 0.05, lfoDepth: 150 });
      mkBed({ freq: 5200, q: 8, type: "bandpass", vol: 0.02, lfoRate: 0.7, lfoDepth: 400 }); // crickets
    } else if (theme === "cave") {
      mkBed({ freq: 180, q: 0.7, type: "lowpass", vol: 0.14, lfoRate: 0.04, lfoDepth: 60 });
    } else if (theme === "snow") {
      mkBed({ freq: 1100, q: 0.5, type: "bandpass", vol: 0.14, lfoRate: 0.11, lfoDepth: 700 }); // wind
      mkBed({ freq: 300, q: 0.6, type: "lowpass", vol: 0.07, lfoRate: 0.06, lfoDepth: 120 });
    } else if (theme === "lair") {
      mkBed({ freq: 120, q: 0.8, type: "lowpass", vol: 0.16, lfoRate: 0.03, lfoDepth: 40 });
      mkBed({ freq: 900, q: 0.6, type: "bandpass", vol: 0.04, lfoRate: 0.09, lfoDepth: 300 });
    }

    // Occasional one-shots on top of the bed: a bird, a water drip, an ember.
    const oneShot = () => {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime + 0.05;
      const place = { pan: rand(-0.8, 0.8), gain: rand(0.3, 0.7), lp: 16000 };
      const out = this._chain(place, this.ambBus, 0.5);
      if (theme === "autumn") {
        const f = rand(1900, 3200);
        this._osc({ type: "sine", freq: f, to: f * rand(1.1, 1.5), dur: 0.11, vol: 0.1, t0, dest: out });
        this._osc({ type: "sine", freq: f * 1.4, to: f, dur: 0.09, vol: 0.06, t0: t0 + 0.13, dest: out });
      } else if (theme === "night") {
        this._osc({ type: "sine", freq: rand(380, 460), to: rand(300, 360), dur: 0.5, vol: 0.09, t0, dest: out });
      } else if (theme === "cave") {
        const f = rand(1400, 2400);
        this._metal({ base: f, partials: [1, 2.1], dur: 0.45, vol: 0.1, t0, dest: out, type: "sine" });
      } else if (theme === "snow") {
        this._noise({ dur: rand(1.2, 2.2), vol: 0.07, freq: rand(1400, 2600), to: 700, q: 0.8, t0, dest: out });
      } else if (theme === "lair") {
        this._noise({ dur: 0.1, vol: 0.09, freq: rand(2500, 5000), q: 1.4, t0, dest: out });
      }
    };
    const schedule = () => {
      this._ambTimer = setTimeout(() => { oneShot(); schedule(); }, rand(2600, 7000));
    };
    schedule();
  },

  stopAmbience() {
    if (this._ambTimer) clearTimeout(this._ambTimer);
    this._ambTimer = null;
    for (const node of this._amb) {
      try { node.stop(); } catch (e) { /* already stopped */ }
    }
    this._amb = [];
  },

  // ----------------------------------------------------------------- music
  startMusic(key) {
    this.init();
    if (!this.ctx || !MUSIC[key]) return;
    if (this._musicKey === key && this._musicTimer) return;
    this.stopMusic();
    this.setEnvironment(REVERBS[key] ? key : this.env);
    this._musicKey = key;
    this._music = MUSIC[key];
    this._bar = 0;
    this._chordIdx = 0;
    this._nextBarTime = this.ctx.currentTime + 0.15;
    this._musicTimer = setInterval(() => this._scheduleMusic(), 120);
    this._scheduleMusic();
  },

  stopMusic() {
    if (this._musicTimer) clearInterval(this._musicTimer);
    this._musicTimer = null;
    this._musicKey = null;
    this._music = null;
  },

  // Bar-level lookahead: whenever the next bar falls inside the next second,
  // lay down its pad, bass, arpeggio and percussion.
  _scheduleMusic() {
    const m = this._music;
    if (!m || !this.ctx) return;
    const barDur = (60 / m.bpm) * 4;
    while (this._nextBarTime < this.ctx.currentTime + 1.0) {
      this._playBar(this._nextBarTime, m, barDur);
      this._nextBarTime += barDur;
      this._bar++;
      if (this._bar % m.barsPerChord === 0) {
        this._chordIdx = (this._chordIdx + 1) % m.chords.length;
      }
    }
  },

  _playBar(t0, m, barDur) {
    const chord = m.chords[this._chordIdx];
    const newChord = this._bar % m.barsPerChord === 0;
    const bus = this.musicBus;

    if (newChord) {
      // Pad: two detuned saws per note, slow attack, fed to the reverb so it
      // blooms into the space rather than sitting flat in front of it.
      const chordDur = barDur * m.barsPerChord;
      chord.forEach((note, i) => {
        if (i === 0) return; // the root is handled by the sub below
        for (const det of [-7, 7]) {
          const g = this.ctx.createGain();
          const lp = this.ctx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.setValueAtTime(500, t0);
          lp.frequency.linearRampToValueAtTime(1700, t0 + chordDur * 0.5);
          lp.frequency.linearRampToValueAtTime(700, t0 + chordDur);
          g.connect(lp); lp.connect(bus);
          const send = this.ctx.createGain();
          send.gain.value = 0.5;
          lp.connect(send); send.connect(this.reverb);
          this._adsr(g.gain, t0, m.padVol, chordDur * 0.28, chordDur * 0.2, 0.75, chordDur * 0.2, chordDur * 0.35);
          this._osc({ type: m.padWave, freq: midiHz(note), dur: chordDur * 1.05, vol: 1, t0, dest: g, detune: det });
        }
      });
      // Sub bass on the root.
      const sub = this.ctx.createGain();
      sub.connect(bus);
      this._adsr(sub.gain, t0, 0.16, 0.08, 0.3, 0.6, chordDur * 0.4, chordDur * 0.4);
      this._osc({ type: "sine", freq: midiHz(chord[0] - 12), dur: chordDur, vol: 1, t0, dest: sub });
    }

    // Arpeggio: eighth notes across the chord, lightly humanised.
    const stepDur = barDur / 8;
    m.arp.forEach((idx, i) => {
      const note = chord[idx % chord.length] + 12;
      const at = t0 + i * stepDur + rand(-0.006, 0.006);
      const g = this.ctx.createGain();
      g.connect(bus);
      const send = this.ctx.createGain();
      send.gain.value = 0.45;
      g.connect(send); send.connect(this.reverb);
      this._adsr(g.gain, at, m.arpVol * rand(0.75, 1.1), 0.01, 0.12, 0.25, 0.05, stepDur * 1.6);
      this._osc({ type: m.arpWave, freq: midiHz(note), dur: stepDur * 2.2, vol: 1, t0: at, dest: g });
    });

    // Percussion.
    if (m.perc === "taiko") {
      for (const beat of [0, 2]) {
        const at = t0 + beat * (barDur / 4);
        this._osc({ type: "sine", freq: 130, to: 52, dur: 0.3, vol: 0.28, t0: at, dest: bus, curve: "linear" });
        this._noise({ dur: 0.12, vol: 0.1, freq: 1400, to: 400, q: 0.8, t0: at, dest: bus });
      }
      const at = t0 + 3 * (barDur / 4);
      this._noise({ dur: 0.2, vol: 0.12, freq: 2200, to: 900, q: 0.9, t0: at, dest: bus });
    } else if (m.perc === "soft") {
      const at = t0 + 2 * (barDur / 4);
      this._osc({ type: "sine", freq: 110, to: 48, dur: 0.35, vol: 0.14, t0: at, dest: bus, curve: "linear" });
    } else if (m.perc === "drip") {
      const at = t0 + rand(0, barDur);
      this._metal({ base: rand(1600, 2600), partials: [1, 2.1], dur: 0.4, vol: 0.06, t0: at, dest: bus, type: "sine" });
    }
  },
};
