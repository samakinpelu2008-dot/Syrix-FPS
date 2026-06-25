export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.isUnlocked = false;
    }

    // --- Unlock Browser Audio Thread Constraints ---
    unlock() {
        if (this.isUnlocked) return;
        
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            this.ctx = new AudioContextClass();
            this.isUnlocked = true;
            
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }
    }

    // --- Procedural Audio Synthesizer Engine ---
    play(soundType) {
        if (!this.isUnlocked || !this.ctx) return;
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;

        switch (soundType) {
            case 'shoot': // Automated Rifle Fire Synthesis
                this.synthesizeRifleShot(now);
                break;
                
            case 'laser': // Heavy Sniper Bolt
                this.synthesizeSniperLaser(now);
                break;
                
            case 'reload': // Mechanical Magazine Click
                this.synthesizeMechanicalReload(now);
                break;
                
            case 'damage': // Low-Frequency Impact Thud
                this.synthesizeImpactThud(now);
                break;
        }
    }

    synthesizeRifleShot(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(360, time);
        osc.frequency.exponentialRampToValueAtTime(20, time + 0.1);
        
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.11);
    }

    synthesizeSniperLaser(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(750, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.3);
        
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.31);
    }

    synthesizeMechanicalReload(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, time);
        
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.09);
    }

    synthesizeImpactThud(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, time);
        
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.16);
    }
}
