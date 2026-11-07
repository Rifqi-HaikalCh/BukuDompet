"use client";

import { useEffect, useState } from "react";

/**
 * Cozy Background Music (BGM) Synthesizer — BukuDompet v4.0
 * Menggunakan Web Audio API murni tanpa file MP3 eksternal.
 * Memainkan progresi akor hangat (Fmaj7 -> Em7 -> Dm7 -> Cmaj7) ~70 BPM
 * dengan perpaduan suara Warm Electric Piano Pad & Cozy Kalimba Pluck.
 */

type BgmListener = (playing: boolean) => void;

class CozyBgmSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private playing = false;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private stepIndex = 0;
  private listeners = new Set<BgmListener>();

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

  private tick() {
    if (!this.playing) return;
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

  public start() {
    if (this.playing) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.playing = true;
    this.stepIndex = 0;
    this.tick();

    // ~70 BPM, 8th note = ~428ms
    this.timerId = setInterval(() => {
      this.tick();
    }, 428);

    this.notify();
  }

  public stop() {
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
  };
}
