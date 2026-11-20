class SoundService {
  private ctx: AudioContext | null = null;
  private currentInterval: number | null = null;
  private isPlaying = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play a single synthesized chime
  private playNote(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.2) {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback not allowed or failed:', e);
    }
  }

  // Level 1: Gentle pleasant harmonic chime (C5 -> E5 -> G5)
  playLevel1Gentle() {
    this.stop();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playNote(freq, 0.8, 'sine', 0.2);
      }, idx * 180);
    });
  }

  // Level 2: Louder pulse tone with vibration
  playLevel2Louder() {
    this.stop();
    this.isPlaying = true;

    // Vibrate device if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }

    const pattern = () => {
      this.playNote(659.25, 0.3, 'triangle', 0.4);
      setTimeout(() => this.playNote(880.0, 0.4, 'sine', 0.45), 200);
    };

    pattern();
    this.currentInterval = window.setInterval(pattern, 3000);
  }

  // Level 3 & 4: Urgent alternating alarm tone + repeating vibrate
  playLevel3Urgent() {
    this.stop();
    this.isPlaying = true;

    if ('vibrate' in navigator) {
      navigator.vibrate([300, 150, 300, 150, 600]);
    }

    let toggle = false;
    const playAlarmTick = () => {
      const freq = toggle ? 950 : 720;
      this.playNote(freq, 0.35, 'sawtooth', 0.5);
      toggle = !toggle;
    };

    playAlarmTick();
    this.currentInterval = window.setInterval(() => {
      playAlarmTick();
      if ('vibrate' in navigator && Math.random() > 0.5) {
        navigator.vibrate(250);
      }
    }, 800);
  }

  // Play based on escalation level (1, 2, 3, 4)
  playAlarmByLevel(level: number) {
    if (level === 1) this.playLevel1Gentle();
    else if (level === 2) this.playLevel2Louder();
    else this.playLevel3Urgent();
  }

  // Caregiver critical alert notification sound
  playCaregiverCriticalAlert() {
    try {
      const ctx = this.getContext();
      [880, 1174.66, 1760].forEach((freq, i) => {
        setTimeout(() => this.playNote(freq, 0.4, 'square', 0.25), i * 150);
      });
    } catch {
      // ignore
    }
  }

  // Success celebration tone when medicine is taken
  playSuccessTune() {
    this.stop();
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playNote(freq, 0.5, 'sine', 0.3);
      }, idx * 120);
    });
  }

  stop() {
    this.isPlaying = false;
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }
  }
}

export const soundService = new SoundService();

