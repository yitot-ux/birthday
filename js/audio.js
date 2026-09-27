/* audio.js — Web Audio API 现场合成 8-bit 芯片音乐 + 音效
 * 无外部音频文件依赖。首次用户手势后才 init（iOS 硬限制）。
 * 想换成 Howler 播放真实文件时，只改这里即可。
 */
(function (global) {
  'use strict';

  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let initialized = false;

  function init() {
    if (initialized) return;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(master);

    initialized = true;
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ---- 基础音色 ----
  function tone(freq, dur, type, vol, dest, when) {
    if (!initialized) return;
    const t = (when || ctx.currentTime);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol || 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // ---- 音效 ----
  const SFX = {
    pop: () => { tone(220, 0.08, 'square', 0.35); tone(440, 0.06, 'square', 0.2); },
    ding: () => { tone(880, 0.5, 'sine', 0.3); tone(1320, 0.4, 'sine', 0.15); },
    bloop: () => { tone(300, 0.1, 'triangle', 0.4); tone(180, 0.15, 'triangle', 0.3); },
    step: () => { tone(120, 0.05, 'square', 0.12); },
    click: () => { tone(600, 0.04, 'square', 0.2); },
    candleOut: () => { tone(500, 0.2, 'square', 0.25); tone(250, 0.3, 'square', 0.2); },
    jump: () => { tone(400, 0.12, 'square', 0.25); tone(700, 0.12, 'square', 0.2); },
    heart: () => { tone(523, 0.2, 'sine', 0.25); tone(659, 0.2, 'sine', 0.25); tone(784, 0.3, 'sine', 0.25); },
    fanfare: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'square', 0.25, sfxGain, ctx.currentTime + i * 0.12)); },
  };

  function play(name) {
    init();
    resume();
    const fn = SFX[name];
    if (fn) fn();
  }

  // ---- 背景芯片音乐（循环）----
  let musicTimer = null;
  let currentTrack = null;

  // 简短的 8-bit 旋律（音名 -> 频率）
  const TRACKS = {
    // 生日快乐主题，温柔版
    bday: {
      bpm: 90,
      notes: [
        'G4','G4','A4','G4','C5','B4',
        'G4','G4','A4','G4','D5','C5',
        'G4','G4','G5','E5','C5','B4','A4',
        'F5','F5','E5','C5','D5','C5',
      ],
    },
    // 轻快小调
    chill: {
      bpm: 100,
      notes: [
        'E4','G4','A4','G4','E4','D4','C4','D4',
        'E4','G4','A4','B4','G4','E4','D4','C4',
      ],
    },
  };

  const NOTE_FREQ = (() => {
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const map = {};
    for (let oct = 2; oct <= 6; oct++) {
      names.forEach((n, i) => {
        const midi = (oct + 1) * 12 + i;
        map[n + oct] = 440 * Math.pow(2, (midi - 69) / 12);
      });
    }
    return map;
  })();

  function startMusic(trackName) {
    stopMusic();
    if (!initialized) init();
    if (!initialized) return;
    const track = TRACKS[trackName || 'bday'] || TRACKS.bday;
    currentTrack = trackName || 'bday';
    const spb = 60 / track.bpm; // 秒每拍
    let i = 0;
    const step = () => {
      const note = track.notes[i % track.notes.length];
      const f = NOTE_FREQ[note];
      if (f) {
        tone(f, spb * 0.9, 'square', 0.16, musicGain);
        tone(f / 2, spb * 0.9, 'triangle', 0.12, musicGain);
      }
      i++;
    };
    step();
    musicTimer = setInterval(step, spb * 1000);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    currentTrack = null;
  }

  function switchMusic(trackName) {
    startMusic(trackName);
  }

  global.Audio8 = {
    init: init,
    resume: resume,
    play: play,
    startMusic: startMusic,
    stopMusic: stopMusic,
    switchMusic: switchMusic,
    get initialized() { return initialized; },
    get currentTrack() { return currentTrack; },
  };
})(window);
