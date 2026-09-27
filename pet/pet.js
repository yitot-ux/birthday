/* pet.js — 桌宠「我」的像素化身
 * 状态机 + 摸头/投喂/拖拽 + 台词系统 + 数值系统(localStorage: pet_state_v1)
 * 同时被主页面(浮层)和 pet/index.html(PWA)复用。
 */
(function (global) {
  'use strict';

  const STORE_KEY = 'pet_state_v1';
  const SCALE = 3;          // 32*3 = 96px 显示尺寸
  const DISPLAY = 32 * SCALE;

  // ===== 台词数据（JSON 结构，也可由 lines.json 覆盖）=====
  const LINES = {
    // 摸头/戳身体时的桌宠自称
    selfCalls: ['咪', '喵～', '干嘛呀', '嘿嘿', '别戳啦', '想我了吗'],
    // 点击时冒出的称呼（桌宠对生日者的昵称）
    ownerCalls: ['徐毛毛', '毛毛徐', '徐猫猫', '徐萌萌', '毛咪', '毛毛', '振儿'],
    headpatOver: '头要秃了',
    // 时间感知自动台词（weight 加权）
    auto: [
      { text: '上号吗？', cond: 'evening', w: 4 },
      { text: '辛苦啦', cond: 'evening', w: 3 },
      { text: '加油哦', cond: 'morning', w: 3 },
      { text: '今天也要开心', cond: 'morning_first', w: 5 },
      { text: '不要熬夜', cond: 'night', w: 4 },
      { text: '别熬夜啦', cond: 'night', w: 3, minAffinity: 60 },
      { text: '想我莓', w: 2 },
      { text: '得劲', w: 2 },
      { text: '好样的', w: 1 },
      { text: '我以后就住你手机里了', cond: 'rare', w: 1 },
    ],
    birthday: ['生日快乐！', '今天你最大！', '生日也要记得上号呀', '新的一岁，得劲！'],
    // 投喂反应
    food: {
      cake: { line: '好吃！今天生日嘛', emo: '🎂' },
      milktea: { line: '全糖去冰，谢啦', emo: '🧋' },
      strawberry: { line: '想我莓～', emo: '🍓' },
      noodle: { line: '这个也行，得劲', emo: '💨' },
      cola: { line: '嗝——爽', emo: '🥤' },
      icecream: { line: '少吃冰的，你也是', emo: '🍦' },
    },
    body: ['干嘛', '在呢', '上号吗？', '嘿嘿'],
    sleepWake: '唔……干嘛呀',
    full: '吃不下了，真的',
    hungry: '饿了',
    lonely: '不理我了吗',
    back: ['在吗？', '回来啦'],
    longGone: '好久不见，以为你不要我了',
    dragFast: '慢点慢点',
    dragStart: '哇——',
    firstAdopt: '我以后就住你手机里啦。',
  };

  // ===== 食物 =====
  const FOODS = [
    { key: 'cake', icon: '🍰', label: '蛋糕', fullness: 15 },
    { key: 'milktea', icon: '🧋', label: '奶茶', fullness: 15 },
    { key: 'strawberry', icon: '🍓', label: '草莓', fullness: 15 },
    { key: 'icecream', icon: '🍦', label: '冰淇淋', fullness: 15 },
    { key: 'noodle', icon: '🍜', label: '泡面', fullness: 15 },
    { key: 'cola', icon: '🥤', label: '可乐', fullness: 15 },
  ];

  function defaultState() {
    return {
      petName: '咪',
      ownerCall: '',
      affinity: 42,
      fullness: 60,
      mood: 80,
      days: 0,
      lastOpen: '',
      unlocked: [],
      icecreamCount: 0,
      headpatStreak: 0,
      todayFirst: true,
      adoptCount: 0,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { /* 无痕模式降级 */ }
    return defaultState();
  }

  function hourNow() { return new Date().getHours(); }
  function period() {
    const h = hourNow();
    if (h >= 5 && h < 10) return 'morning';
    if (h >= 10 && h < 18) return 'day';
    if (h >= 18 && h < 23) return 'evening';
    return 'night';
  }
  function isBirthdayToday() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return (mm + '-' + dd) === '09-28'; // 可改成实际生日
  }

  class DesktopPet {
    constructor(layer, opts) {
      this.layer = layer;
      this.opts = opts || {};
      this.state = loadState();
      if (this.opts.name) this.state.petName = this.opts.name;
      if (this.opts.ownerCall !== undefined) this.state.ownerCall = this.opts.ownerCall;

      this.mode = 'idle';
      this.pos = { x: 0, y: 0 };
      this.idleTimer = 0;
      this.lastLine = '';
      this.lastLineAt = 0;
      this._raf = null;
      this._drag = null;
      this._pressTimer = null;
      this._suppressTap = false;
      this._callGap = 0;
      this._lastDecay = Date.now();
      this.visible = !document.hidden;

      this._initDay();
      this._buildDom();
      this._bindVisibility();
      this._startStatTick();
    }

    _initDay() {
      const today = new Date().toISOString().slice(0, 10);
      if (this.state.lastOpen !== today) {
        const days = Math.floor((new Date(today) - new Date(this.state.lastOpen || today)) / 86400000);
        if (days >= 3 && this.state.lastOpen) {
          setTimeout(() => this.say(LINES.longGone), 1500);
        }
        this.state.days = (this.state.days || 0) + 1;
        this.state.lastOpen = today;
        this.state.todayFirst = true;
        this.state.affinity = Math.min(100, this.state.affinity + 5);
        this.save();
      }
    }

    _buildDom() {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 32; this.canvas.height = 32;
      this.canvas.style.width = DISPLAY + 'px';
      this.canvas.style.height = DISPLAY + 'px';
      this.canvas.style.imageRendering = 'pixelated';
      this.canvas.style.position = 'absolute';
      this.canvas.style.cursor = 'grab';
      this.canvas.style.pointerEvents = 'auto';
      this.canvas.style.touchAction = 'none';
      this.canvas.style.zIndex = '2';
      this.layer.appendChild(this.canvas);

      this.nameplate = document.createElement('div');
      this.nameplate.className = 'pet-nameplate';
      this.nameplate.textContent = this.state.petName;
      this.layer.appendChild(this.nameplate);

      this.bubble = document.createElement('div');
      this.bubble.className = 'pet-bubble';
      this.bubble.style.display = 'none';
      this.layer.appendChild(this.bubble);

      this._bindEvents();
    }

    spawn() {
      const layerRect = this.layer.getBoundingClientRect();
      this.pos.x = layerRect.width - DISPLAY - 16;
      this.pos.y = layerRect.height - DISPLAY - 8;
      this._applyPos();
      this._render('idle');
      this._loop();
      this._scheduleAutoLine();
      if (this.state.adoptCount === 0) {
        this.state.adoptCount = 1; this.save();
        setTimeout(() => this.say(LINES.firstAdopt), 600);
      }
    }

    _applyPos() {
      this.canvas.style.left = this.pos.x + 'px';
      this.canvas.style.top = this.pos.y + 'px';
      this._syncOverlays();
    }

    _syncOverlays() {
      const cx = this.pos.x + DISPLAY / 2;
      const cy = this.pos.y;
      this.nameplate.style.left = cx + 'px';
      this.nameplate.style.top = cy + 'px';
      this.bubble.style.left = cx + 'px';
      this.bubble.style.top = cy + 'px';
    }

    // ===== 渲染 =====
    _render(pose, accessories) {
      this._pose = pose;
      if (global.Pixel) {
        Pixel.drawToCanvas(this.canvas, 'cat', pose, accessories || this._accessories());
      }
    }

    _accessories() {
      const acc = { headphone: false };
      acc.catEar = this.state.unlocked.includes('catEar');
      acc.scarf = this.state.unlocked.includes('scarf');
      return acc;
    }

    // ===== 主循环（空闲呼吸动画，页面隐藏时暂停）=====
    _loop() {
      const tick = () => {
        this._raf = requestAnimationFrame(tick);
        if (document.hidden) return;
        const t = performance.now() / 500;
        let dy = 0;
        if (this.mode === 'idle') dy = Math.sin(t) * 2;
        else if (this.mode === 'sleepy' || this.mode === 'sleep') dy = Math.sin(t * 0.5) * 1;
        this.canvas.style.transform = 'translateY(' + dy + 'px)';
        this._updateIdle();
      };
      this._raf = requestAnimationFrame(tick);
    }

    _updateIdle() {
      if (this.mode !== 'idle' && this.mode !== 'sleepy' && this.mode !== 'sleep') return;
      if (document.hidden) return;
      this.idleTimer += 1 / 60;
      const sleepGap = (hourNow() >= 23 || hourNow() < 3) ? 15 : 30;
      if (this.mode === 'idle' && this.idleTimer > sleepGap) {
        this.mode = 'sleepy';
        this._render('sleepy');
        this.say('困困…');
      } else if (this.mode === 'sleepy' && this.idleTimer > sleepGap + 30) {
        this.mode = 'sleep';
        this._render('sleepy');
      }
    }

    _wake() {
      if (this.mode === 'sleep') {
        this.mode = 'idle';
        this.say(LINES.sleepWake);
      } else if (this.mode === 'sleepy') {
        this.mode = 'idle';
      }
      this.idleTimer = 0;
    }

    // ===== 事件绑定 =====
    _bindEvents() {
      const c = this.canvas;
      c.addEventListener('pointerdown', (e) => this._onDown(e));
      c.addEventListener('pointermove', (e) => this._onMove(e));
      c.addEventListener('pointerup', (e) => this._onUp(e));
      c.addEventListener('pointercancel', (e) => this._onUp(e));
      c.addEventListener('contextmenu', (e) => { e.preventDefault(); this._openMenu(e.clientX, e.clientY); });
      c.addEventListener('dblclick', () => this._onDouble());
    }

    _onDown(e) {
      e.preventDefault();
      Audio8 && Audio8.init();
      this._wake();
      if (this.canvas.setPointerCapture) {
        try { this.canvas.setPointerCapture(e.pointerId); } catch (err) {}
      }

      this._pressTimer = setTimeout(() => {
        // 长按 0.8s -> 投喂
        this._pressTimer = null;
        this._openFoodMenu(e.clientX, e.clientY);
      }, 800);

      // 拖拽起始
      this._drag = {
        id: e.pointerId,
        offsetX: e.clientX - this.pos.x,
        offsetY: e.clientY - this.pos.y,
        lastX: e.clientX, lastY: e.clientY,
        moved: false,
      };
      this.canvas.style.cursor = 'grabbing';
    }

    _onMove(e) {
      if (!this._drag || e.pointerId !== this._drag.id) return;
      const dx = e.clientX - this._drag.lastX;
      const dy = e.clientY - this._drag.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 4) this._drag.moved = true;
      if (this._pressTimer && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        clearTimeout(this._pressTimer); this._pressTimer = null;
      }
      if (this._drag.moved) {
        if (this.mode !== 'drag') { this.mode = 'drag'; this._render('wave'); this.say(LINES.dragStart); }
        this.pos.x = e.clientX - this._drag.offsetX;
        this.pos.y = e.clientY - this._drag.offsetY;
        this._clampPos();
        this._applyPos();
      }
      this._drag.lastX = e.clientX; this._drag.lastY = e.clientY;
    }

    _onUp(e) {
      if (this._pressTimer) { clearTimeout(this._pressTimer); this._pressTimer = null; }
      if (!this._drag) return;
      const wasDrag = this._drag.moved;
      this._drag = null;
      this.canvas.style.cursor = 'grab';
      if (wasDrag) {
        this.mode = 'fall';
        this._render('sad');
        setTimeout(() => { this.mode = 'idle'; this._render('idle'); this.idleTimer = 0; }, 600);
      } else if (!this._suppressTap) {
        this._onTap(e);
      }
      this._suppressTap = false;
    }

    _onTap(e) {
      const rect = this.canvas.getBoundingClientRect();
      const relY = (e.clientY - rect.top) / rect.height;
      if (relY < 0.45) this._headpat();
      else this._poke();
    }

    _onDouble() {
      this._wake();
      this.mode = 'jump';
      this._render('jump');
      Audio8 && Audio8.play('jump');
      this.say(Math.random() < 0.5 ? '!' : 'GG');
      setTimeout(() => { this.mode = 'idle'; this._render('idle'); }, 700);
    }

    // ===== 摸头 =====
    _headpat() {
      this.mode = 'headpat';
      this._render('happy');
      Audio8 && Audio8.play('heart');
      this.state.headpatStreak++;
      this.state.affinity = Math.min(100, this.state.affinity + 1);
      this.state.mood = Math.min(100, this.state.mood + 3);

      let line;
      if (this.state.headpatStreak >= 5) {
        line = LINES.headpatOver;
        this.state.headpatStreak = 0;
        this._callGap++;
      } else if (this._callGap >= 2) {
        // 出现一次称呼后，接下来两次点击不再冒称呼
        line = LINES.ownerCalls[Math.floor(Math.random() * LINES.ownerCalls.length)];
        this._callGap = 0;
      } else {
        this._callGap++;
        if (this.state.ownerCall) line = this.state.ownerCall;
        else if (isBirthdayToday() && Math.random() < 0.3) line = LINES.birthday[Math.floor(Math.random() * LINES.birthday.length)];
        else line = LINES.selfCalls[Math.floor(Math.random() * LINES.selfCalls.length)];
      }
      this.say(line);
      this.save();
      setTimeout(() => { if (this.mode === 'headpat') { this.mode = 'idle'; this._render('idle'); this.idleTimer = 0; } }, 1500);
    }

    _poke() {
      this.mode = 'jump';
      this._render('jump');
      Audio8 && Audio8.play('jump');
      if (Math.random() < 0.05) this.say('好样的');
      else if (hourNow() >= 23) this.say('晚安，做个好梦');
      else this.say(LINES.body[Math.floor(Math.random() * LINES.body.length)]);
      setTimeout(() => { this.mode = 'idle'; this._render('idle'); }, 600);
    }

    // ===== 投喂 =====
    _feed(food) {
      if (this.state.fullness >= 100) { this.say(LINES.full); return; }
      this._wake();
      this.mode = 'eating';
      this._render('happy');
      this.state.fullness = Math.min(100, this.state.fullness + food.fullness);
      this.state.affinity = Math.min(100, this.state.affinity + 2);

      let line, emo;
      if (food.key === 'icecream') {
        this.state.icecreamCount++;
        if (this.state.icecreamCount >= 3) { line = '真的不能吃了'; this._render('sad'); }
        else line = LINES.food.icecream.line;
        emo = LINES.food.icecream.emo;
      } else {
        const f = LINES.food[food.key];
        line = f.line; emo = f.emo;
      }
      this.say(emo + ' ' + line);
      Audio8 && Audio8.play('bloop');
      this.save();
      setTimeout(() => { this.mode = 'happy'; this._render('happy'); }, 1500);
      setTimeout(() => { this.mode = 'idle'; this._render('idle'); this.idleTimer = 0; }, 3500);
    }

    // ===== 菜单 =====
    _openFoodMenu(x, y) { this._openMenu(x, y, true); }
    _openMenu(x, y, food) {
      const menu = document.createElement('div');
      menu.className = 'pet-menu' + (food ? ' food-menu' : '');
      if (food) {
        FOODS.forEach((f) => {
          const b = document.createElement('button');
          b.textContent = f.icon + ' ' + f.label;
          b.addEventListener('click', () => { menu.remove(); this._feed(f); });
          menu.appendChild(b);
        });
      } else {
        const items = [
          { label: '🍰 投喂', fn: () => this._openFoodMenu(x, y) },
          { label: '💬 说句话', fn: () => this.say(LINES.selfCalls[Math.floor(Math.random() * LINES.selfCalls.length)]) },
          { label: '😴 晚安', fn: () => { this.mode = 'sleep'; this._render('sleepy'); this.say('晚安'); } },
          { label: '✏️ 改名', fn: () => this._rename() },
        ];
        items.forEach((it) => {
          const b = document.createElement('button');
          b.textContent = it.label;
          b.addEventListener('click', () => { menu.remove(); it.fn(); });
          menu.appendChild(b);
        });
      }
      menu.style.left = x + 'px';
      menu.style.top = y + 'px';
      document.body.appendChild(menu);
      setTimeout(() => {
        const close = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('pointerdown', close); } };
        document.addEventListener('pointerdown', close);
      }, 10);
    }

    _rename() {
      const name = prompt('给桌宠起个名字（默认 咪）：', this.state.petName);
      if (name && name.trim()) {
        this.state.petName = name.trim();
        this.nameplate.textContent = this.state.petName;
        this.save();
        this.say('叫我' + this.state.petName + '啦');
      }
    }

    // ===== 气泡 =====
    say(text, dur) {
      this.bubble.textContent = text;
      this.bubble.style.display = 'block';
      this._syncOverlays();
      const d = dur || 2000;
      if (this._sayTimer) clearTimeout(this._sayTimer);
      this._sayTimer = setTimeout(() => { this.bubble.style.display = 'none'; }, d);
    }

    // ===== 自动台词 =====
    _scheduleAutoLine() {
      setTimeout(() => {
        if (!document.hidden && (Date.now() - this.lastLineAt > 4000)) {
          this._autoLine();
        }
        this._scheduleAutoLine();
      }, 180000 + Math.random() * 120000); // 3~5 分钟
    }

    _autoLine() {
      const p = period();
      const pool = LINES.auto.filter((l) => {
        if (l.cond === 'morning' && p !== 'morning') return false;
        if (l.cond === 'evening' && p !== 'evening') return false;
        if (l.cond === 'night' && p !== 'night') return false;
        if (l.minAffinity && this.state.affinity < l.minAffinity) return false;
        if (l.cond === 'rare' && Math.random() > 0.3) return false;
        if (l.text === this.lastLine) return false;
        return true;
      });
      if (pool.length === 0) return;
      const total = pool.reduce((s, l) => s + l.w, 0);
      let r = Math.random() * total;
      let pick = pool[0];
      for (const l of pool) { r -= l.w; if (r <= 0) { pick = l; break; } }
      this.lastLine = pick.text;
      this.lastLineAt = Date.now();
      this.say(pick.text);
    }

    // ===== 前后台感知 =====
    _bindVisibility() {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.visible = true;
          if (Math.random() < 0.5) this.say(LINES.back[Math.floor(Math.random() * LINES.back.length)]);
        } else {
          this.visible = false;
        }
      });
    }

    // ===== 数值自然衰减（每 5 分钟检查，满 2 小时饱食度 -5）=====
    _startStatTick() {
      setInterval(() => this.tickStats(), 60 * 1000);
    }

    tickStats() {
      const now = Date.now();
      if (now - this._lastDecay >= 60 * 1000) {
        this.state.fullness = 0;
        this._lastDecay = now;
        this.save();
      }
      if (this.state.fullness < 30 && Math.random() < 0.3) this.say(LINES.hungry);
      if (this.state.mood < 30 && Math.random() < 0.3) this.say(LINES.lonely);
    }

    _clampPos() {
      const r = this.layer.getBoundingClientRect();
      this.pos.x = Math.max(-DISPLAY * 0.5, Math.min(r.width - DISPLAY * 0.5, this.pos.x));
      this.pos.y = Math.max(0, Math.min(r.height - DISPLAY, this.pos.y));
    }

    save() {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(this.state)); } catch (e) {}
    }
  }

  global.DesktopPet = DesktopPet;
  global.PetLines = LINES;
  global.PetFoods = FOODS;
})(window);
