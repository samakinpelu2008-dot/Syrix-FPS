export class AudioEngine {
    constructor() {
        this.ctx = null;
    }

    unlock() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    play(type) {
        if (!this.ctx) return;
        this.unlock();

        const now = this.ctx.currentTime;

        if (type === 'shoot') {
            // Realistic High-Frequency Gunshot Explosion
            const bufferSize = this.ctx.sampleRate * 0.12;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.exponentialRampToValueAtTime(150, now + 0.1);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);

        } else if (type === 'laser') {
            // Heavy Shotgun Blast Impact Frequencies
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(45, now + 0.22);

            gain.gain.setValueAtTime(1.0, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);

        } else if (type === 'reload') {
            // Mechanical Metallic Weapon Cocking Sounds
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.setValueAtTime(300, now + 0.15);
            osc.frequency.setValueAtTime(750, now + 0.35);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.setValueAtTime(0, now + 0.1);
            gain.gain.setValueAtTime(0.25, now + 0.15);
            gain.gain.setValueAtTime(0, now + 0.25);
            gain.gain.setValueAtTime(0.3, now + 0.35);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.5);

        } else if (type === 'damage') {
            // Solid Meat-Impact Punch frequencies
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(95, now);
            osc.frequency.linearRampToValueAtTime(30, now + 0.08);

            gain.gain.setValueAtTime(0.6, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        }
    }
                }
