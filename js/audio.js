// Temple Audio Engine utilizing authentic recorded temple bell audio and Web Audio API fallback
class TempleAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.currentUtterance = null;
    this.isPlayingSpeech = false;

    // Load authentic temple bell sound from YouTube Short (positive energy temple bell)
    this.bellAudio = new Audio();
    const canPlayWebm = this.bellAudio.canPlayType('audio/webm; codecs="opus"');
    this.bellAudio.src = canPlayWebm ? 'assets/temple_bell.webm' : 'assets/temple_bell.m4a';
    this.bellAudio.preload = 'auto';
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play the authentic Temple Bell from the YouTube Short
  playTempleBell() {
    if (this.isMuted) return;
    this.init();

    try {
      // Use cloneNode so rapid clicks create overlapping natural bell reverberations
      const sound = this.bellAudio.cloneNode();
      sound.volume = 0.95;
      const playPromise = sound.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Autoplay blocked or playback error, using synth bell fallback:", err);
          this.playSynthesizedBell();
        });
      }
    } catch (err) {
      this.playSynthesizedBell();
    }
  }

  // Synthesized Temple Brass Bell fallback (Web Audio API)
  playSynthesizedBell() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, now);
    masterGain.connect(this.ctx.destination);

    const baseFreq = 659.25; // E5
    const partials = [
      { ratio: 1.0, gain: 0.5, decay: 3.2 },
      { ratio: 1.503, gain: 0.35, decay: 2.6 },
      { ratio: 2.0, gain: 0.25, decay: 2.0 },
      { ratio: 2.76, gain: 0.2, decay: 1.4 },
      { ratio: 3.51, gain: 0.15, decay: 1.0 },
      { ratio: 5.42, gain: 0.08, decay: 0.6 }
    ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = p.ratio > 2.5 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq * p.ratio, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + p.decay + 0.1);
    });
  }

  // Soft Chime for Flower Showering
  playFlowerChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const delay = idx * 0.06;
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.3);
    });
  }

  // Text-To-Speech for Elder Pilgrims
  speakText(text, lang = 'kn-IN', onEndCallback) {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported on this browser.");
      return;
    }

    this.stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    if (lang === 'en') {
      const voices = window.speechSynthesis.getVoices();
      const inVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.name.includes('India'));
      if (inVoice) utterance.voice = inVoice;
    }

    utterance.onend = () => {
      this.isPlayingSpeech = false;
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = () => {
      this.isPlayingSpeech = false;
      if (onEndCallback) onEndCallback();
    };

    this.currentUtterance = utterance;
    this.isPlayingSpeech = true;
    window.speechSynthesis.speak(utterance);
  }

  stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isPlayingSpeech = false;
    }
  }
}

const templeAudio = new TempleAudioEngine();
