let audioContext = null;

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

export async function primeGameAudio() {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    await context.resume();
  }
}

function scheduleTone(context, gainNode, options) {
  const oscillator = context.createOscillator();
  oscillator.type = options.type ?? "triangle";
  oscillator.frequency.setValueAtTime(options.startFrequency, options.startAt);
  oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, options.startAt + options.duration);
  oscillator.connect(gainNode);
  oscillator.start(options.startAt);
  oscillator.stop(options.startAt + options.duration);
}

export function playPieceDropSound(color = "red") {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const gainNode = context.createGain();
  gainNode.connect(context.destination);

  const startAt = context.currentTime + 0.005;
  const baseFrequency = color === "yellow" ? 310 : 260;
  const accentFrequency = color === "yellow" ? 620 : 520;

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.06, startAt + 0.012);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.22);

  scheduleTone(context, gainNode, {
    startAt,
    duration: 0.2,
    startFrequency: baseFrequency,
    endFrequency: Math.max(80, baseFrequency * 0.68),
    type: "triangle",
  });

  scheduleTone(context, gainNode, {
    startAt: startAt + 0.01,
    duration: 0.12,
    startFrequency: accentFrequency,
    endFrequency: Math.max(120, accentFrequency * 0.72),
    type: "sine",
  });
}
