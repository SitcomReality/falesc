/**
 * A tiny procedural soundscape. No audio files and no gameplay timers: a warm
 * two-oscillator pad, a few short envelopes for building and pages, and a
 * persisted on/off preference. Browsers only let us start after a gesture, so
 * the context is created and resumed from the toggle/unlock path.
 */
const PREF_KEY = 'falesc.audio.v1';

export class Soundscape {
    constructor() {
        this.enabled = false;
        this.context = null;
        this.master = null;
        this.pad = null;
        this.unlocked = false;
        this.readPreference();
    }

    readPreference() {
        try {
            this.enabled = localStorage.getItem(PREF_KEY) === 'on';
        } catch {
            this.enabled = false;
        }
    }

    persist() {
        try {
            localStorage.setItem(PREF_KEY, this.enabled ? 'on' : 'off');
        } catch {
            // Storage can be unavailable; the toggle still works this session.
        }
    }

    ensureContext() {
        if (this.context) return this.context;
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return null;
        try {
            this.context = new AudioCtor();
            this.master = this.context.createGain();
            this.master.gain.value = 0.16;
            this.master.connect(this.context.destination);
        } catch {
            this.context = null;
            this.master = null;
        }
        return this.context;
    }

    unlock() {
        this.unlocked = true;
        if (!this.enabled) return;
        const context = this.ensureContext();
        if (!context) return;
        context.resume?.();
        this.startPad();
    }

    toggle() {
        this.enabled = !this.enabled;
        this.persist();
        if (this.enabled) {
            const context = this.ensureContext();
            context?.resume?.();
            this.startPad();
            this.play('mint');
        } else {
            this.stopPad();
            this.context?.suspend?.();
        }
        return this.enabled;
    }

    startPad() {
        if (!this.context || this.pad) return;
        const now = this.context.currentTime;
        const padGain = this.context.createGain();
        padGain.gain.setValueAtTime(0, now);
        padGain.gain.linearRampToValueAtTime(0.05, now + 2.5);
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 620;
        padGain.connect(filter);
        filter.connect(this.master);
        const oscillators = [];
        for (const [frequency, type, gainValue] of [[110, 'sine', 0.5], [164.81, 'triangle', 0.22], [220, 'sine', 0.12]]) {
            const oscillator = this.context.createOscillator();
            const gain = this.context.createGain();
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            gain.gain.value = gainValue;
            oscillator.connect(gain);
            gain.connect(padGain);
            oscillator.start();
            oscillators.push(oscillator);
        }
        this.pad = { padGain, oscillators };
    }

    stopPad() {
        if (!this.pad || !this.context) return;
        const now = this.context.currentTime;
        this.pad.padGain.gain.cancelScheduledValues(now);
        this.pad.padGain.gain.setValueAtTime(this.pad.padGain.gain.value || 0.05, now);
        this.pad.padGain.gain.linearRampToValueAtTime(0, now + 0.35);
        for (const oscillator of this.pad.oscillators) {
            try {
                oscillator.stop(now + 0.4);
            } catch {
                // Already stopped.
            }
        }
        this.pad = null;
    }

    play(kind = 'mint') {
        if (!this.enabled || !this.context || this.context.state !== 'running') return;
        const frequencies = {
            mint: 523.25,
            build: 392,
            day: 329.63,
            report: 440,
            low: 196
        };
        const now = this.context.currentTime;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = kind === 'low' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(frequencies[kind] || 440, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(kind === 'low' ? 0.05 : 0.09, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'low' ? 0.45 : 0.22));
        oscillator.connect(gain);
        gain.connect(this.master);
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }
}
