// Temple Audio Engine with robust Mobile SpeechSynthesis fixes and authentic bell audio
class TempleAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isPlayingSpeech = false;
    this.speechUtterances = [];
    this.currentChunkIndex = 0;
    this.heartbeatTimer = null;
    this.voices = [];

    // Load authentic temple bell sound from YouTube Short
    this.bellAudio = new Audio();
    const canPlayWebm = this.bellAudio.canPlayType('audio/webm; codecs="opus"');
    this.bellAudio.src = canPlayWebm ? 'assets/temple_bell.webm' : 'assets/temple_bell.m4a';
    this.bellAudio.preload = 'auto';

    // Preload speech synthesis voices
    if ('speechSynthesis' in window) {
      this.populateVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => this.populateVoices();
      }
    }
  }

  populateVoices() {
    if ('speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices() || [];
    }
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

  // Split text into short, mobile-friendly sentence chunks to prevent OS timeout bug
  splitIntoSentences(text) {
    if (!text) return [];
    // Match Kannada purna virama (।) or English punctuation or line breaks
    const chunks = text.match(/[^.!?|।\n]+[.!?|।\n]*/g) || [text];
    return chunks.map(c => c.trim()).filter(c => c.length > 0);
  }

  // Show a non-intrusive floating notice on mobile screens
  showVoiceNotice(message) {
    let notice = document.getElementById('voice-notice-toast');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'voice-notice-toast';
      notice.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(35, 23, 16, 0.96);
        border: 2px solid #e2b036;
        color: #ffd466;
        padding: 12px 18px;
        border-radius: 30px;
        font-size: 0.84rem;
        font-family: inherit;
        z-index: 1000000;
        box-shadow: 0 8px 30px rgba(0,0,0,0.8);
        max-width: 90vw;
        text-align: center;
        transition: opacity 0.4s ease;
      `;
      document.body.appendChild(notice);
    }
    notice.innerHTML = `<i class="fa-solid fa-volume-high" style="margin-right:8px; color:#ffb703;"></i> ${message}`;
    notice.style.display = 'block';
    notice.style.opacity = '1';

    setTimeout(() => {
      notice.style.opacity = '0';
      setTimeout(() => { notice.style.display = 'none'; }, 400);
    }, 4500);
  }

  // Robust Mobile Text-To-Speech with Voice Detection & Fallback
  speakText(text, lang = 'kn', onEndCallback, fallbackText = '') {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported on this browser.");
      if (onEndCallback) onEndCallback();
      return;
    }

    // Crucial fix: Cancel any existing speech, and wait 80ms before starting
    // to avoid the mobile WebKit/Blink bug where immediate speak() after cancel() gets aborted with an error sound
    this.stopSpeech();

    setTimeout(() => {
      this.populateVoices();
      const allVoices = this.voices.length > 0 ? this.voices : window.speechSynthesis.getVoices();

      let targetLang = lang;
      let textToUse = text;
      let chosenVoice = null;

      if (lang === 'kn') {
        // Look for installed Kannada voice
        chosenVoice = allVoices.find(v => {
          const l = (v.lang || '').toLowerCase().replace('_', '-');
          const n = (v.name || '').toLowerCase();
          return l.startsWith('kn') || n.includes('kannada');
        });

        // Many phones (iOS, Samsung, Xiaomi) do NOT have Kannada voice installed by default
        if (!chosenVoice) {
          console.warn("No Kannada TTS voice found on this device. Falling back to English story.");
          targetLang = 'en';
          textToUse = fallbackText || text;

          // Notify the user gently on mobile
          this.showVoiceNotice(
            "ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿ ಕನ್ನಡ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲದ ಕಾರಣ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಓದಲಾಗುತ್ತಿದೆ.<br><small>(Kannada voice not installed on device; reading in English)</small>"
          );
        }
      }

      // If language is English or fell back to English
      if (targetLang === 'en' && !chosenVoice) {
        chosenVoice = allVoices.find(v => {
          const l = (v.lang || '').toLowerCase().replace('_', '-');
          const n = (v.name || '').toLowerCase();
          return l.includes('en-in') || n.includes('india') || l.startsWith('en');
        }) || allVoices[0];
      }

      // Split into sentences to prevent Android 200-character speech cutoff bug
      const chunks = this.splitIntoSentences(textToUse);
      if (chunks.length === 0) {
        if (onEndCallback) onEndCallback();
        return;
      }

      this.isPlayingSpeech = true;
      this.currentChunkIndex = 0;

      // Chrome mobile heartbeat fix: keep synthesizer alive during long speech
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(this.heartbeatTimer);
        } else {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      const speakNextChunk = () => {
        if (!this.isPlayingSpeech || this.currentChunkIndex >= chunks.length) {
          this.isPlayingSpeech = false;
          clearInterval(this.heartbeatTimer);
          if (onEndCallback) onEndCallback();
          return;
        }

        const chunkText = chunks[this.currentChunkIndex];
        const utterance = new SpeechSynthesisUtterance(chunkText);
        utterance.lang = targetLang === 'kn' ? 'kn-IN' : 'en-IN';
        utterance.rate = 0.90; // Natural pace
        utterance.pitch = 1.0;

        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }

        utterance.onend = () => {
          this.currentChunkIndex++;
          speakNextChunk();
        };

        utterance.onerror = (e) => {
          console.warn("Speech chunk error:", e);
          this.currentChunkIndex++;
          speakNextChunk();
        };

        window.speechSynthesis.speak(utterance);
      };

      // Start first chunk
      speakNextChunk();
    }, 90);
  }

  stopSpeech() {
    this.isPlayingSpeech = false;
    clearInterval(this.heartbeatTimer);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

const templeAudio = new TempleAudioEngine();
