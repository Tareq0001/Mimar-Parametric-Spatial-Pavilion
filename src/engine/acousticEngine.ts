import { AcousticResult, MaterialProperties } from '../types';

export class AcousticEngine {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = true;
  private masterGain: GainNode | null = null;
  private ambientOscillators: OscillatorNode[] = [];
  private ambientGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  /**
   * Sabine Equation: RT60 = 0.161 * V / A
   */
  public calculateRT60(volumeM3: number, surfaceAreaM2: number, material: MaterialProperties): AcousticResult {
    // Total absorption in Sabins (surface area * material alpha + ground absorption)
    const groundArea = surfaceAreaM2 * 0.45;
    const groundAlpha = 0.04; // compact desert earth / stone pavers
    const pavilionAbs = surfaceAreaM2 * material.avgAlpha;
    const groundAbs = groundArea * groundAlpha;
    const totalSabins = Math.max(5.0, Math.round((pavilionAbs + groundAbs) * 10) / 10);

    // Sabine RT60
    const rt60 = Math.round((0.161 * volumeM3 / totalSabins) * 100) / 100;

    // Octave band RT60
    const oct125 = Math.round((0.161 * volumeM3 / Math.max(4, surfaceAreaM2 * material.alpha125 + groundArea * 0.02)) * 100) / 100;
    const oct250 = Math.round((0.161 * volumeM3 / Math.max(4, surfaceAreaM2 * material.alpha250 + groundArea * 0.03)) * 100) / 100;
    const oct500 = Math.round((0.161 * volumeM3 / Math.max(4, surfaceAreaM2 * material.alpha500 + groundArea * 0.04)) * 100) / 100;
    const oct1000 = Math.round((0.161 * volumeM3 / Math.max(4, surfaceAreaM2 * material.alpha1000 + groundArea * 0.05)) * 100) / 100;
    const oct2000 = Math.round((0.161 * volumeM3 / Math.max(4, surfaceAreaM2 * material.alpha2000 + groundArea * 0.05)) * 100) / 100;
    const oct4000 = Math.round((0.161 * volumeM3 / Math.max(4, surfaceAreaM2 * material.alpha4000 + groundArea * 0.06)) * 100) / 100;

    let badgeAr = '';
    let badgeEn = '';

    if (rt60 < 0.7) {
      badgeAr = 'فناء خارجي مفتوح | نقاء كلام فائق (Speech Intelligibility)';
      badgeEn = 'Open Courtyard | Optimal Speech Clarity';
    } else if (rt60 < 1.3) {
      badgeAr = 'مساحة مؤتمرات وخطابة متوازنة (Acoustic Chamber)';
      badgeEn = 'Balanced Chamber | Conference & Dialogue Precision';
    } else if (rt60 < 2.1) {
      badgeAr = 'قاعة موسيقى أوركسترالية وسيمفونية (Symphonic Resonance)';
      badgeEn = 'Symphonic Concert Hall | Rich Harmonic Warmth';
    } else {
      badgeAr = 'صدى كاتدرائي أثري ممتد (Cathedral Monumental Reverb)';
      badgeEn = 'Monumental Reverberant Void | Cinematic Echo';
    }

    return {
      volumeM3,
      surfaceAreaM2,
      totalSabins,
      rt60Seconds: rt60,
      qualityBadgeAr: badgeAr,
      qualityBadgeEn: badgeEn,
      octaveRT60: {
        hz125: oct125,
        hz250: oct250,
        hz500: oct500,
        hz1000: oct1000,
        hz2000: oct2000,
        hz4000: oct4000
      }
    };
  }

  /**
   * Initializes Web Audio API Context
   */
  public initAudio(): void {
    if (this.audioCtx) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    this.masterGain.connect(this.audioCtx.destination);

    this.filterNode = this.audioCtx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(1200, this.audioCtx.currentTime);
    this.filterNode.connect(this.masterGain);

    this.ambientGain = this.audioCtx.createGain();
    this.ambientGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
    this.ambientGain.connect(this.filterNode);
  }

  public toggleMute(): boolean {
    this.initAudio();
    if (!this.audioCtx || !this.ambientGain) return this.isMuted;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.isMuted = !this.isMuted;

    if (this.isMuted) {
      this.ambientGain.gain.setTargetAtTime(0.0, this.audioCtx.currentTime, 0.2);
      this.stopAmbient();
    } else {
      this.startAmbient();
      this.ambientGain.gain.setTargetAtTime(0.18, this.audioCtx.currentTime, 0.3);
    }

    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays an acoustic impulse response ping using dynamic synthetic reverb matching current RT60
   */
  public triggerImpulsePing(rt60Seconds: number): void {
    this.initAudio();
    if (!this.audioCtx || !this.masterGain) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;
    const duration = Math.min(6.0, Math.max(0.5, rt60Seconds));

    // Create click impulse
    const osc = this.audioCtx.createOscillator();
    const oscGain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

    oscGain.gain.setValueAtTime(0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(oscGain);

    // Create dynamic reverberation decay buffer
    const reverbBuffer = this.createReverbBuffer(duration);
    const convolver = this.audioCtx.createConvolver();
    convolver.buffer = reverbBuffer;

    const convolverGain = this.audioCtx.createGain();
    convolverGain.gain.setValueAtTime(0.65, now);

    oscGain.connect(convolver);
    convolver.connect(convolverGain);
    convolverGain.connect(this.masterGain);

    // Also dry signal
    oscGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  private createReverbBuffer(decayDuration: number): AudioBuffer {
    if (!this.audioCtx) throw new Error('AudioContext missing');
    const sampleRate = this.audioCtx.sampleRate;
    const length = Math.floor(sampleRate * decayDuration);
    const buffer = this.audioCtx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay envelope matching RT60 (-60dB = 0.001 at decayDuration)
        const t = i / sampleRate;
        const decay = Math.exp(-6.908 * t / decayDuration);
        const noise = (Math.random() * 2 - 1) * decay;
        channelData[i] = noise * 0.8;
      }
    }
    return buffer;
  }

  /**
   * Generates a spatial architectural harmonic drone
   */
  private startAmbient(): void {
    if (!this.audioCtx || !this.ambientGain) return;
    this.stopAmbient();

    // Harmonic frequencies for spatial atmosphere: F#2, C#3, A#3, E4 (Pentatonic warmth)
    const freqs = [92.50, 138.59, 233.08, 329.63];

    for (const f of freqs) {
      const osc = this.audioCtx.createOscillator();
      const panner = this.audioCtx.createStereoPanner();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, this.audioCtx.currentTime);

      panner.pan.setValueAtTime((Math.random() * 1.6) - 0.8, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.ambientGain);

      osc.start();
      this.ambientOscillators.push(osc);
    }
  }

  private stopAmbient(): void {
    for (const osc of this.ambientOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    }
    this.ambientOscillators = [];
  }

  public updateFilterWithSolar(solarAltitudeDeg: number): void {
    if (!this.filterNode || !this.audioCtx) return;
    // Modulate cutoff between 600Hz (morning/evening) and 2400Hz (noon peak)
    const targetFreq = 600 + (solarAltitudeDeg / 90.0) * 1800;
    this.filterNode.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.4);
  }
}
