"use client";

import confetti from "canvas-confetti";

/**
 * Web Audio API Synthesizer untuk BukuDompet (Tanpa MP3 Eksternal).
 * Menyediakan efek suara:
 * 1. tactileClick - Klik tombol 3D renyah
 * 2. coinChime - Suara koin masuk celengan
 * 3. comboFanfare - Arpeggio ceria saat Misi Rinci ("COMBO DETAIL!")
 * 4. mysteryDrumroll - Drumroll & fanfare saat membuka peti Gacha
 * 5. detectiveBuzz - Sirine / buzz lembut saat Spending Detective mendeteksi boros
 */
class BukuDompetSynthesizer {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined" || this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * 1. Tactile 3D Button Click (Pop/Click kayu hangat)
   */
  tactileClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.055);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * 2. Coin Collect Chime (Suara koin emas klasik)
   */
  coinChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [987.77, 1318.51]; // B5 -> E6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      const start = now + i * 0.075;
      const duration = i === 1 ? 0.35 : 0.09;

      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.28, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    });
  }

  /**
   * 3. Combo Fanfare ("COMBO DETAIL!" +35 Poin Misi Rinci)
   */
  comboFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C5 -> E5 -> G5 -> B5 -> C6
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === notes.length - 1 ? "triangle" : "sine";
      const start = now + idx * 0.07;
      const dur = idx === notes.length - 1 ? 0.45 : 0.12;

      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.26, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + dur);
    });
  }

  /**
   * 4. Mystery Box Drumroll & Jackpot Reveal
   */
  mysteryDrumroll() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Rapid low-mid percussive ticks followed by magical chime
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.055;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(180 + i * 25, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.05);
    }

    // Reveal chord
    const revealStart = now + 0.48;
    [587.33, 880, 1174.66, 1760].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const st = revealStart + idx * 0.05;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.22, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(st);
      osc.stop(st + 0.52);
    });
  }

  /**
   * 5. Detective Alert Buzz (Saat pengeluaran boros / Bengkak terdeteksi)
   */
  detectiveBuzz() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [310, 230]; // Two-tone detective alert

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.14;

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.14);
    });
  }
}

export const soundEffects = new BukuDompetSynthesizer();

export function fireCozyConfetti(variant: "normal" | "combo" | "jackpot" = "normal") {
  if (typeof window === "undefined") return;

  const colors = ["#58CC02", "#FFC800", "#38B6FF", "#FF8B7B", "#CE82FF"];

  if (variant === "jackpot") {
    confetti({
      particleCount: 110,
      spread: 90,
      origin: { y: 0.6 },
      colors,
    });
    return;
  }

  if (variant === "combo") {
    confetti({
      particleCount: 80,
      spread: 75,
      origin: { y: 0.68 },
      colors,
    });
    return;
  }

  confetti({
    particleCount: 45,
    spread: 60,
    origin: { y: 0.72 },
    colors,
  });
}
