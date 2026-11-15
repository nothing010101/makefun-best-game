// All sound is synthesised with WebAudio — no audio files, no network. The
// context is created only after the first user interaction, so nothing plays
// before the player touches the game. M toggles mute.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.3;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, seconds, type, volume, slideTo) {
    if (!ensure() || muted) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  function noise(seconds, volume, lowpass) {
    if (!ensure() || muted) return;
    const now = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  return {
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.3;
      return muted;
    },
    ring() { tone(880, 0.18, 'sine', 0.16, 880); tone(1318, 0.3, 'sine', 0.12, 1318); },
    star() { tone(1568, 0.12, 'sine', 0.12, 2093); },
    hit() { tone(140, 0.3, 'sawtooth', 0.2, 55); noise(0.2, 0.16, 800); },
    gust() { noise(0.5, 0.14, 1200); },
    boost() { noise(0.18, 0.07, 2400); },
    click() { tone(660, 0.05, 'sine', 0.1, 660); },
    stall() { tone(330, 0.5, 'triangle', 0.16, 110); },
    win() {
      [523, 659, 784, 1047, 1319].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.35, 'triangle', 0.16, freq), i * 130);
      });
    },
    lose() {
      [392, 330, 262, 196].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.4, 'triangle', 0.14, freq * 0.94), i * 170);
      });
    },
  };
}
