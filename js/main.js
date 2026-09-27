/* main.js — 生日祝福页场景控制器（12 个场景流程） */
(function (global) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ===== 可自定义配置 =====
  const CONFIG = {
    petName: '咪',
    ownerCall: '',            // 生日者怎么叫我（桌宠摸头时优先冒）
    distance: '1024',         // 信号穿越公里数
    birthdayText: [
      '毛毛：',
      '生日快乐！',
      '又长一岁啦。',
      '谢谢你这些日子',
      '陪我上号、听我碎碎念。',
      '新的一岁，',
      '吃好睡好，少熬点夜，',
      '得劲地过每一天。',
      '—— 菲菲',
    ],
    bubbleNames: ['徐毛毛', '毛毛徐', '徐猫猫', '毛毛', '徐萌萌', '毛咪', '振儿'],
    specialBubbles: { '毛毛': 'heart', '振儿': 'adopt' },
    gamingLines: ['送我菜', '和我玩', '好样的', '03天才国服镜', '得劲'],
    easterMemes: ['得劲', '03天才', '国服镜', '上号', '想我莓', '生日快乐'], // 输入这些梗触发彩蛋
  };

  const App = {
    scene: 'loading',
    petInstalled: false,
    bubbleTimer: null,
    clickCount: 0,

    init() {
      this.bindGlobal();
      this.initLoading();
      this.initOpening();
      this.initGaming();
      this.initMusic();
      this.initScenery();
      this.initMinigame();
      this.initLetter();
      this.initCandle();
      this.initBubbles();
      this.initHeart();
      this.initAdopt();
      this.initEaster();
    },

    go(sceneId) {
      if (this.scene === sceneId) return;
      const old = $('scene-' + this.scene);
      const next = $('scene-' + sceneId);
      if (old) old.classList.remove('active');
      if (next) next.classList.add('active');
      this.scene = sceneId;
      this.onEnter(sceneId);
    },

    onEnter(sceneId) {
      switch (sceneId) {
        case 'gaming': this.startGaming(); break;
        case 'music': this.startMusic(); break;
        case 'scenery': this.startScenery(); break;
        case 'minigame': this.startMinigame(); break;
        case 'letter': this.startLetter(); break;
        case 'candle': this.startCandle(); break;
        case 'bubbles': this.startBubbles(); break;
        case 'heart': this.startHeart(); break;
        case 'adopt': this.startAdopt(); break;
      }
    },

    // ---- 全局 ----
    bindGlobal() {
      // 标题连点 10 次触发彩蛋
      const title = $('main-title');
      if (title) {
        title.addEventListener('click', () => {
          this.clickCount++;
          if (this.clickCount >= 10) { this.clickCount = 0; this.triggerEaster(); }
        });
      }
      // 键盘输入梗触发彩蛋
      let buf = '';
      window.addEventListener('keydown', (e) => {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          buf += e.key.toLowerCase();
          if (buf.length > 30) buf = buf.slice(-30);
          for (const meme of CONFIG.easterMemes) {
            if (buf.endsWith(meme)) { buf = ''; this.triggerEaster(); break; }
          }
        }
      });
    },

    // ===== 0 加载页 =====
    initLoading() {
      const fill = $('signal-fill');
      let p = 0;
      const timer = setInterval(() => {
        p += Math.random() * 7 + 2;
        if (p >= 100) {
          p = 100;
          clearInterval(timer);
          $('loading-hint').textContent = '点击进入 ▶';
          $('scene-loading').addEventListener('click', () => {
            Audio8.init(); Audio8.play('click');
            this.go('opening');
          });
        }
        fill.style.width = p + '%';
      }, 120);
    },

    // ===== 1 开场 =====
    initOpening() {
      const left = $('char-left'), right = $('char-right');
      left.appendChild(Pixel.makeSprite('birthday', 'idle', 3));
      right.appendChild(Pixel.makeSprite('pet', 'idle', 3));
      if (!this.openingPS) this.openingPS = new ParticleSystem($('opening-canvas'));
      $('btn-connect').addEventListener('click', () => {
        Audio8.init(); Audio8.play('jump');
        left.classList.add('meet');
        right.classList.add('meet');
        const fist = $('opening-fist');
        fist.textContent = '👊';
        fist.classList.add('show');
        setTimeout(() => { $('opening-link').classList.add('show'); }, 800);
        this.openingFloatTimer = setInterval(() => this.openingPS.floatDots(2), 500);
        setTimeout(() => {
          fist.textContent = '🎮';
          Audio8.play('fanfare');
        }, 1700);
        setTimeout(() => {
          if (this.openingFloatTimer) { clearInterval(this.openingFloatTimer); this.openingFloatTimer = null; }
          if (this.openingPS) this.openingPS.stop();
          this.go('gaming');
        }, 3000);
      });
    },

    // ===== 2 一起打游戏 =====
    initGaming() {
      const g1 = $('gamer-p1'), g2 = $('gamer-p2');
      g1.appendChild(Pixel.makeSprite('birthday', 'happy', 3));
      g2.appendChild(Pixel.makeSprite('pet', 'happy', 3));
      $('tv').addEventListener('click', () => { Audio8.play('click'); this.switchTV(); });
      $('btn-next-gaming').addEventListener('click', () => this.go('music'));
    },
    tvScreenIndex: 0,
    switchTV() {
      this.tvScreenIndex = (this.tvScreenIndex + 1) % 3;
      this.drawTV();
    },
    drawTV() {
      const cv = $('tv-screen');
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);
      if (this.tvScreenIndex === 0) {
        // 弹球
        ctx.fillStyle = '#6f6';
        ctx.fillRect(10, 20, 20, 20);
        ctx.fillRect(60, 60, 30, 6);
      } else if (this.tvScreenIndex === 1) {
        // 吃豆人
        ctx.fillStyle = '#ff0';
        ctx.beginPath(); ctx.arc(40, 40, 16, 0.2, Math.PI * 1.8); ctx.lineTo(40, 40); ctx.fill();
        ctx.fillStyle = '#f88';
        for (let i = 0; i < 5; i++) ctx.fillRect(70 + i * 18, 36, 6, 6);
      } else {
        // GG
        ctx.fillStyle = '#fff';
        ctx.font = '20px monospace';
        ctx.fillText('GG', 20, 50);
      }
    },
    startGaming() {
      const cv = $('tv-screen');
      cv.width = 160; cv.height = 100;
      this.tvScreenIndex = 0;
      this.drawTV();
      // 漂浮粒子
      if (!this.gamingPS) this.gamingPS = new ParticleSystem($('gaming-canvas'));
      this.gamingFloatTimer = setInterval(() => this.gamingPS.floatDots(2), 700);
      // 气泡（慢速，围绕两个小人）
      this.spawnGamingBubbles();
      this.gamingBubbleTimer = setInterval(() => this.spawnGamingBubble(), 4000);
      // 小人同步动作
      this.gamingAnimTimer = setInterval(() => {
        const e = $('gamer-p1');
        e.style.transform = 'translateY(-6px)';
        setTimeout(() => (e.style.transform = ''), 200);
      }, 3000);
    },
    spawnGamingBubbles() {
      for (let i = 0; i < 2; i++) setTimeout(() => this.spawnGamingBubble(), i * 600);
    },
    gamingBubbleSide: 0,
    spawnGamingBubble() {
      const stage = $('gaming-stage');
      const lines = CONFIG.gamingLines;
      const text = lines[Math.floor(Math.random() * lines.length)];
      const b = document.createElement('div');
      b.className = 'speech-bubble gaming-bubble';
      b.textContent = text;
      // 交替出现在两个小人头顶上方，不遮挡小人
      const side = this.gamingBubbleSide;
      this.gamingBubbleSide = 1 - side;
      b.style.left = ((side === 0 ? 24 : 52) + (Math.random() * 8 - 4)) + '%';
      b.style.top = (48 + Math.random() * 8) + '%';
      b.style.animation = 'bubbleFloat 3.6s ease-out forwards';
      stage.appendChild(b);
      setTimeout(() => b.remove(), 3600);
    },

    // ===== 3 一起听歌 =====
    musicTrack: 0,
    musicPlaying: false,
    musicTitles: ['Happy Birthday (8-bit)', 'Pixel Sunset', 'Star Road'],
    initMusic() {
      $('music-duo-p1').appendChild(Pixel.makeSprite('birthday', 'idle', 3));
      $('music-duo-p2').appendChild(Pixel.makeSprite('pet', 'idle', 3));
      // 频谱
      const spec = $('spectrum');
      for (let i = 0; i < 16; i++) {
        const s = document.createElement('span');
        s.style.animationDelay = (i * 0.05) + 's';
        spec.appendChild(s);
      }
      $('btn-play').addEventListener('click', () => this.toggleMusic());
      $('btn-switch').addEventListener('click', () => { Audio8.play('click'); this.switchTrack(); });
      $('btn-next-music').addEventListener('click', () => { this.stopMusic(); this.go('scenery'); });
    },
    startMusic() {
      this.musicTrack = 0;
      this.playTrack();
      // 飘爱心音符
      if (!this.musicPS) {
        this.musicPS = new ParticleSystem($('music-canvas'));
      }
      this.musicFloatTimer = setInterval(() => this.musicPS.floatHeart(6), 800);
    },
    playTrack() {
      this.musicPlaying = true;
      $('btn-play').textContent = '⏸ 暂停';
      Audio8.startMusic('bday');
      $('music-title').textContent = '♪ ' + this.musicTitles[this.musicTrack];
    },
    toggleMusic() {
      if (this.musicPlaying) { this.stopMusic(); }
      else { this.playTrack(); }
    },
    stopMusic() {
      this.musicPlaying = false;
      $('btn-play').textContent = '▶ 播放';
      Audio8.stopMusic();
      if (this.musicPS) this.musicPS.stop();
      if (this.musicFloatTimer) { clearInterval(this.musicFloatTimer); this.musicFloatTimer = null; }
    },
    switchTrack() {
      this.musicTrack = (this.musicTrack + 1) % this.musicTitles.length;
      if (this.musicPlaying) this.playTrack();
      else $('music-title').textContent = '♪ ' + this.musicTitles[this.musicTrack];
    },

    // ===== 4 一起看风景 =====
    initScenery() {
      const sky = $('sky');
      for (let i = 0; i < 40; i++) {
        const s = document.createElement('div');
        s.className = 'star';
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 60 + '%';
        s.style.animationDelay = Math.random() * 2 + 's';
        sky.appendChild(s);
      }
      const city = $('cityline');
      for (let i = 0; i < 20; i++) {
        const w = document.createElement('div');
        w.className = 'city-window';
        w.style.left = Math.random() * 100 + '%';
        w.style.top = Math.random() * 100 + '%';
        w.style.animationDelay = Math.random() * 1.5 + 's';
        city.appendChild(w);
      }
      $('scenery-duo-p1').appendChild(Pixel.makeSprite('birthday', 'idle', 3));
      $('scenery-duo-p2').appendChild(Pixel.makeSprite('pet', 'sleepy', 3));
      $('scenery-duo').addEventListener('click', () => {
        Audio8.play('heart');
        this.floatEmoji('scenery-duo', '❤');
      });
      $('btn-next-scenery').addEventListener('click', () => this.go('minigame'));
    },
    startScenery() {
      // 看风景：不再自动跳转，只保留点击互动
    },
    floatEmoji(containerId, emo) {
      const c = $(containerId);
      const e = document.createElement('div');
      e.style.position = 'absolute';
      e.style.fontSize = '22px';
      e.textContent = emo;
      c.appendChild(e);
      setTimeout(() => e.remove(), 1000);
    },

    // ===== 5 合作小游戏（点亮蜡烛） =====
    initMinigame() {
      $('minigame-duo-p1').appendChild(Pixel.makeSprite('birthday', 'jump', 3));
      $('minigame-duo-p2').appendChild(Pixel.makeSprite('pet', 'jump', 3));
      const candles = document.querySelectorAll('.candle');
      candles.forEach((c, i) => {
        c.addEventListener('click', () => {
          if (c.classList.contains('out')) return;
          c.classList.add('out');
          Audio8.play('candleOut');
          const letters = document.querySelectorAll('.hbd-letter');
          if (letters[i]) letters[i].classList.add('done');
          if ([...candles].every((x) => x.classList.contains('out'))) {
            setTimeout(() => { Audio8.play('fanfare'); $('btn-next-minigame').classList.remove('hidden'); }, 500);
          }
        });
      });
      $('btn-next-minigame').addEventListener('click', () => this.go('letter'));
    },
    startMinigame() {
      document.querySelectorAll('.candle').forEach((c) => c.classList.remove('out'));
      document.querySelectorAll('.hbd-letter').forEach((l) => l.classList.remove('done'));
      $('btn-next-minigame').classList.add('hidden');
    },

    // ===== 6 祝福信 =====
    letterIdx: 0,
    initLetter() {
      $('letter-wait-p1').appendChild(Pixel.makeSprite('birthday', 'happy', 2));
      $('letter-wait-p2').appendChild(Pixel.makeSprite('pet', 'happy', 2));
      const paper = $('letter-paper');
      paper.addEventListener('click', () => this.speedLetter());
      $('btn-next-letter').addEventListener('click', () => this.go('candle'));
    },
    startLetter() {
      this.letterIdx = 0;
      $('letter-text').innerHTML = '';
      this.typeLetter();
    },
    typeLetter() {
      const el = $('letter-text');
      if (this.letterIdx >= CONFIG.birthdayText.length) {
        $('btn-next-letter').classList.remove('hidden');
        return;
      }
      const line = CONFIG.birthdayText[this.letterIdx];
      el.innerHTML += (this.letterIdx > 0 ? '<br>' : '') + line + '<span class="letter-caret">▌</span>';
      this.letterIdx++;
      setTimeout(() => this.typeLetter(), 520);
    },
    speedLetter() {
      // 点击加速：直接显示全部
      $('letter-text').innerHTML = CONFIG.birthdayText.join('<br>');
      this.letterIdx = CONFIG.birthdayText.length;
      $('btn-next-letter').classList.remove('hidden');
    },

    // ===== 7 吹蜡烛 =====
    initCandle() {
      $('blow-duo-p1').appendChild(Pixel.makeSprite('birthday', 'idle', 3));
      $('blow-duo-p2').appendChild(Pixel.makeSprite('pet', 'idle', 3));
      const zone = $('scene-candle');
      const blow = () => {
        if (this.candleOut) return;
        Audio8.play('candleOut');
        document.querySelectorAll('.blow-flame').forEach((f) => f.classList.add('out'));
        this.candleOut = true;
        $('blow-hint').textContent = '呼—— 愿望会实现哒 ✨';
        // 黑屏 1 秒进入称呼环节
        setTimeout(() => {
          $('fade-overlay').classList.add('show');
          setTimeout(() => {
            this.go('bubbles');
            $('fade-overlay').classList.remove('show');
          }, 1000);
        }, 1200);
      };
      zone.addEventListener('pointerdown', blow);
    },
    startCandle() {
      this.candleOut = false;
      document.querySelectorAll('.blow-flame').forEach((f) => f.classList.remove('out'));
      $('blow-hint').textContent = '长按 或 点击，一起吹灭蜡烛';
    },

    // ===== 8 粉红气泡称呼 =====
    initBubbles() {
      $('btn-skip-bubbles').addEventListener('click', () => this.go('adopt'));
    },
    startBubbles() {
      this.clearBubbles();
      if (!this.bubblePS) this.bubblePS = new ParticleSystem($('bubble-canvas'));
      // 背景漂浮爱心 + 粒子
      this.bubbleFloatTimer = setInterval(() => {
        this.bubblePS.floatHeart(1);
        this.bubblePS.floatDots(2);
      }, 700);
      for (let i = 0; i < 6; i++) setTimeout(() => this.spawnBubble(), i * 300);
      this.bubbleTimer = setInterval(() => this.spawnBubble(), 1400);
    },
    clearBubbles() {
      if (this.bubbleTimer) { clearInterval(this.bubbleTimer); this.bubbleTimer = null; }
      if (this.bubbleFloatTimer) { clearInterval(this.bubbleFloatTimer); this.bubbleFloatTimer = null; }
      document.querySelectorAll('.name-bubble').forEach((b) => b.remove());
    },
    spawnBubble() {
      const zone = $('bubble-zone');
      const names = CONFIG.bubbleNames;
      // 特殊气泡（毛毛/振儿）概率稍低，保证普通称呼占多数
      let text;
      const r = Math.random();
      if (r < 0.16) text = '毛毛';
      else if (r < 0.30) text = '振儿';
      else {
        const normal = names.filter((n) => n !== '毛毛' && n !== '振儿');
        text = normal[Math.floor(Math.random() * normal.length)];
      }
      const isSpecial = text in CONFIG.specialBubbles;
      const b = document.createElement('div');
      b.className = 'name-bubble';
      if (text === '毛毛') b.classList.add('special');
      if (text === '振儿') b.classList.add('zhen');
      b.textContent = text;
      b.style.left = (10 + Math.random() * 70) + '%';
      const size = 14 + Math.random() * 12;
      b.style.fontSize = size + 'px';
      const dur = isSpecial ? 9 + Math.random() * 4 : 6 + Math.random() * 5;
      b.style.animation = 'bubbleRise ' + dur + 's linear forwards, bubbleSway 3s ease-in-out infinite alternate';
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onBubbleClick(text, b);
      });
      zone.appendChild(b);

      // 到达顶部自动移除（带粒子消散）
      setTimeout(() => {
        const r = b.getBoundingClientRect();
        const z = zone.getBoundingClientRect();
        if (this.bubblePS) this.bubblePS.scatter(r.left - z.left + r.width / 2, r.top - z.top + r.height / 2, 10);
        b.remove();
      }, dur * 1000);
    },
    onBubbleClick(text, el) {
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const kind = CONFIG.specialBubbles[text];
      if (kind === 'heart') {
        Audio8.play('heart');
        el.remove();
        this.go('heart');
      } else if (kind === 'adopt') {
        Audio8.play('bloop');
        setTimeout(() => Audio8.play('step'), 150);
        el.remove();
        this.go('adopt');
      } else {
        Audio8.play('pop');
        el.remove();
        if (!this.bubblePS) this.bubblePS = new ParticleSystem($('bubble-canvas'));
        this.bubblePS.scatter(x, y, 24);
      }
    },

    // ===== 9 粒子爱心 =====
    initHeart() {
      $('heart-duo-p1').appendChild(Pixel.makeSprite('birthday', 'happy', 3));
      $('heart-duo-p2').appendChild(Pixel.makeSprite('pet', 'happy', 3));
      if (!this.heartPS) this.heartPS = new ParticleSystem($('heart-canvas'));
      $('heart-canvas').addEventListener('click', (e) => {
        const r = $('heart-canvas').getBoundingClientRect();
        this.heartPS.explode(e.clientX - r.left, e.clientY - r.top);
        Audio8.play('heart');
      });
      $('btn-next-heart').addEventListener('click', () => this.go('bubbles'));
    },
    startHeart() {
      if (!this.heartPS) this.heartPS = new ParticleSystem($('heart-canvas'));
      this.heartPS.clear();
      Audio8.play('fanfare');
      const w = this.heartPS.w, h = this.heartPS.h;
      this.heartPS.burstHeart(w / 2, h / 2, 300);
    },

    // ===== 10 桌宠领取 =====
    initAdopt() {
      $('adopt-pet').appendChild(Pixel.makeSprite('cat', 'idle', 4));
      $('btn-open-pet').addEventListener('click', () => {
        Audio8.play('click');
        this.spawnFloatingPet();
      });
      $('btn-next-adopt').addEventListener('click', () => {
        this.spawnFloatingPet();
        this.go('easter');
      });
    },
    startAdopt() {
      // 桌宠从爱心里跳出来
      const pet = $('adopt-pet');
      pet.style.transform = 'translateY(30px)';
      setTimeout(() => { pet.style.transform = 'translateY(0)'; Audio8.play('jump'); }, 300);
    },
    spawnFloatingPet() {
      if (this.petInstalled) return;
      this.petInstalled = true;
      if (!global.DesktopPet) return;
      const layer = $('pet-layer');
      this.floatingPet = new global.DesktopPet(layer, { name: CONFIG.petName, ownerCall: CONFIG.ownerCall });
      this.floatingPet.spawn();
    },

    // ===== 11 隐藏彩蛋 =====
    initEaster() {
      $('easter-secret').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const v = e.target.value.trim();
          for (const meme of CONFIG.easterMemes) {
            if (v.includes(meme)) { this.showEaster(); break; }
          }
          e.target.value = '';
        }
      });
      $('btn-easter-close').addEventListener('click', () => this.go('adopt'));
    },
    triggerEaster() {
      this.showEaster();
    },
    showEaster() {
      Audio8.play('fanfare');
      this.go('easter');
      const rb = $('easter-rainbow');
      rb.textContent = ['🌈', '🎂', '🎮', '❤', '✨'][Math.floor(Math.random() * 5)];
      $('easter-text').textContent = '找到彩蛋啦！得劲！';
    },
  };

  global.App = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
})(window);
