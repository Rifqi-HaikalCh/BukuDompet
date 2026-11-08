"use client";

import { useEffect, useState } from "react";

/**
 * Cozy Background Music (BGM) Synthesizer — BukuDompet v4.0
 * Menggunakan Web Audio API murni tanpa file MP3 eksternal.
 * Memainkan progresi akor hangat (Fmaj7 -> Em7 -> Dm7 -> Cmaj7) ~70 BPM
 * dengan perpaduan suara Warm Electric Piano Pad & Cozy Kalimba Pluck.
 */

type BgmListener = (playing: boolean) => void;

/** Versi 5.2: "cozy" untuk semua halaman, "arcade" (lebih cepat & ceria) saat mengerjakan tantangan game. */
export type BgmMode = "cozy" | "arcade";

const PREF_KEY = "bukudompet-bgm";

function readPref(): "on" | "off" | null {
  try {
    const v = typeof window === "undefined" ? null : window.localStorage.getItem(PREF_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

function writePref(v: "on" | "off") {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(PREF_KEY, v);
  } catch {
    // abaikan: preferensi hanya kenyamanan
  }
}

class CozyBgmSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private playing = false;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private stepIndex = 0;
  private listeners = new Set<BgmListener>();
  private mode: BgmMode = "cozy";
  private noiseBuf: AudioBuffer | null = null;

  // ── Arcade: C – Am – F – G, 128 BPM, 8 langkah per akor ──
  private readonly arcadeBass: number[] = [130.81, 110.0, 87.31, 98.0];
  private readonly arcadeChords: number[][] = [
    [523.25, 659.25, 783.99, 659.25],
    [440.0, 523.25, 659.25, 523.25],
    [349.23, 440.0, 523.25, 440.0],
    [392.0, 493.88, 587.33, 493.88],
  ];
  private readonly arcadeLead: number[] = [
    // C
    1046.5, 0, 783.99, 0, 1046.5, 1174.66, 1318.51, 0,
    // Am
    1318.51, 0, 1046.5, 0, 880.0, 1046.5, 1318.51, 0,
    // F
    1174.66, 0, 880.0, 0, 1046.5, 880.0, 698.46, 0,
    // G
    783.99, 987.77, 1174.66, 0, 1318.51, 1174.66, 987.77, 0,
  ];

  // Progresi Fmaj7 -> Em7 -> Dm7 -> Cmaj7 (masing-masing 8 ketukan 8th-note pada ~70 BPM)
  private readonly chords: number[][] = [
    // Fmaj7: F3, A3, C4, E4
    [174.61, 220.0, 261.63, 329.63],
    // Em7: E3, G3, B3, D4
    [164.81, 196.0, 246.94, 293.66],
    // Dm7: D3, F3, A3, C4
    [146.83, 174.61, 220.0, 261.63],
    // Cmaj7: C3, E3, G3, B3
    [130.81, 164.81, 196.0, 246.94],
  ];

  // Pola petikan kalimba lembut (frekuensi dalam Hz, 0 = istirahat)
  private readonly kalimbaMelody: number[] = [
    // Bar 1 (Fmaj7)
    523.25, 0, 659.25, 587.33, 523.25, 0, 440.0, 523.25,
    // Bar 2 (Em7)
    493.88, 0, 587.33, 523.25, 493.88, 0, 392.0, 440.0,
    // Bar 3 (Dm7)
    440.0, 0, 523.25, 587.33, 659.25, 0, 523.25, 440.0,
    // Bar 4 (Cmaj7)
    392.0, 440.0, 523.25, 0, 659.25, 587.33, 523.25, 0,
  ];

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.16; // Volume cozy lembut agar tidak mengganggu
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playWarmPadChord(freqs: number[], durationSec: number) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + durationSec + 0.05);
    });
  }

  private playKalimbaNote(freq: number) {
    if (freq <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    const overtoneGain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);

    // Harmonik kalimba lembut (oktaf ke-2 tipis)
    overtone.type = "sine";
    overtone.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

    overtoneGain.gain.setValueAtTime(0.001, now);
    overtoneGain.gain.linearRampToValueAtTime(0.025, now + 0.015);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    overtone.connect(overtoneGain);
    gain.connect(this.masterGain);
    overtoneGain.connect(this.masterGain);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 1.2);
    overtone.stop(now + 0.4);
  }

  private chip(freq: number, dur: number, type: OscillatorType, vol: number) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || freq <= 0) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  private hat(vol: number) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (!this.noiseBuf) {
      // derau deterministik (LCG), tanpa Math.random
      const len = Math.floor(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let x = 12345;
      for (let i = 0; i < len; i++) {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        data[i] = (x / 4294967296) * 2 - 1;
      }
      this.noiseBuf = buf;
    }
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = this.noiseBuf;
    filter.type = "highpass";
    filter.frequency.value = 6500;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  private tickArcade() {
    const step = this.stepIndex % 32;
    const chord = Math.floor(step / 8);
    const inBar = step % 8;
    // bass: akar di ketukan 1, 3, 5, 7 (oktaf naik di ketukan 7)
    if (inBar % 2 === 0) this.chip(inBar === 6 ? this.arcadeBass[chord] * 2 : this.arcadeBass[chord], 0.22, "triangle", 0.22);
    // arpeggio chiptune
    this.chip(this.arcadeChords[chord][inBar % 4], 0.14, "square", 0.045);
    // melodi
    const lead = this.arcadeLead[step];
    if (lead > 0) this.chip(lead, 0.2, "square", 0.07);
    // perkusi: tik di langkah ganjil, "kick" di ketukan 1 dan 5
    if (inBar % 2 === 1) this.hat(0.05);
    if (inBar === 0 || inBar === 4) this.chip(70, 0.1, "sine", 0.3);
    this.stepIndex = (this.stepIndex + 1) % 32;
  }

  private intervalMs(): number {
    // cozy: ±70 BPM (8th = 428 ms); arcade: 128 BPM (8th = 234 ms)
    return this.mode === "arcade" ? 234 : 428;
  }

  private tick() {
    if (!this.playing) return;
    if (this.mode === "arcade") {
      this.tickArcade();
      return;
    }
    const step = this.stepIndex % 32;
    const chordIdx = Math.floor(step / 8);

    // Setiap awal bar (8 step), mainkan warm electric piano chord pad
    if (step % 8 === 0) {
      this.playWarmPadChord(this.chords[chordIdx], 3.3);
    }

    // Mainkan petikan kalimba sesuai step
    const noteFreq = this.kalimbaMelody[step];
    if (noteFreq > 0) {
      this.playKalimbaNote(noteFreq);
    }

    this.stepIndex = (this.stepIndex + 1) % 32;
  }

  /** `persist` = true berarti pilihan pengguna ("nyala") diingat untuk muat ulang berikutnya. */
  public start(persist = true) {
    if (persist) writePref("on");
    if (this.playing) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.playing = true;
    this.stepIndex = 0;
    this.tick();
    this.timerId = setInterval(() => {
      this.tick();
    }, this.intervalMs());

    this.notify();
  }

  public stop(persist = true) {
    if (persist) writePref("off");
    this.playing = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.notify();
  }

  public toggle(): boolean {
    if (this.playing) {
      this.stop();
    } else {
      this.start();
    }
    return this.playing;
  }

  /** Ganti suasana musik (cozy ↔ arcade); bila sedang menyala, langsung berganti tanpa putus. */
  public setMode(mode: BgmMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.stepIndex = 0;
    if (this.playing && this.timerId) {
      clearInterval(this.timerId);
      this.timerId = setInterval(() => this.tick(), this.intervalMs());
      this.tick();
    }
  }

  public getMode(): BgmMode {
    return this.mode;
  }

  /** Pilihan tersimpan: musik dinyalakan pengguna (default nyala bila belum pernah memilih). */
  public wantsMusic(): boolean {
    return readPref() !== "off";
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public subscribe(listener: BgmListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.playing));
  }
}

export const cozyBgm = new CozyBgmSynthesizer();

export function useCozyBgm() {
  const [isPlaying, setIsPlaying] = useState<boolean>(() =>
    cozyBgm.isPlaying()
  );

  useEffect(() => {
    setIsPlaying(cozyBgm.isPlaying());
    return cozyBgm.subscribe((playing) => {
      setIsPlaying(playing);
    });
  }, []);

  return {
    isPlaying,
    toggleBgm: () => cozyBgm.toggle(),
    startBgm: () => cozyBgm.start(),
    stopBgm: () => cozyBgm.stop(),
    setBgmMode: (m: BgmMode) => cozyBgm.setMode(m),
  };
}
