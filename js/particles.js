/* particles.js — Canvas 粒子系统
 * 支持：光点四散、粒子聚成心形、炸开、飘爱心音符。
 * 移动端降级：粒子数 < 300，30fps。
 */
(function (global) {
  'use strict';

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const MAX_PARTICLES = isMobile ? 260 : 1400;
  const FPS = 30;

  class ParticleSystem {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.particles = [];
      this.running = false;
      this.raf = null;
      this._last = 0;
      this._resize();
      window.addEventListener('resize', () => this._resize());
    }

    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = this.canvas.clientWidth * dpr;
      this.canvas.height = this.canvas.clientHeight * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = this.canvas.clientWidth;
      this.h = this.canvas.clientHeight;
    }

    _randomColor() {
      const colors = ['#ff9d3c', '#ffb7c5', '#ff6fa5', '#ffd166', '#ff7a9e', '#fff0e0'];
      return colors[Math.floor(Math.random() * colors.length)];
    }

    clear() {
      this.particles.length = 0;
      this.ctx.clearRect(0, 0, this.w, this.h);
    }

    // 光点四散（普通称呼消散）
    scatter(x, y, count) {
      const n = Math.min(count || 40, MAX_PARTICLES - this.particles.length);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 3;
        this.particles.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 1,
          decay: 0.02 + Math.random() * 0.03,
          size: 2 + Math.random() * 3,
          color: this._randomColor(),
          shape: 'dot',
        });
      }
      this.start();
    }

    // 爱心：先散开，再向心形目标聚拢
    burstHeart(x, y, count) {
      const n = Math.min(count || 160, MAX_PARTICLES - this.particles.length);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 3 + Math.random() * 6;
        this.particles.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 1,
          decay: 0.004,
          size: 2 + Math.random() * 4,
          color: this._randomColor(),
          shape: 'dot',
          // 心形目标（在 update 中计算）
          target: null,
          heartT: Math.random(),
          delay: Math.random() * 0.6,
          phase: 'scatter', // scatter -> gather -> hold
        });
      }
      this.start();
    }

    // 飘爱心/音符（听歌场景背景）
    floatHeart(count) {
      const n = Math.min(count || 30, MAX_PARTICLES - this.particles.length);
      for (let i = 0; i < n; i++) {
        this.particles.push({
          x: Math.random() * this.w,
          y: this.h + 10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -(0.5 + Math.random() * 1.2),
          life: 1,
          decay: 0.001,
          size: 6 + Math.random() * 10,
          color: this._randomColor(),
          shape: Math.random() < 0.5 ? 'heart' : 'note',
          phase: 'float',
          sway: Math.random() * Math.PI * 2,
        });
      }
      this.start();
    }

    // 飘浮小光点（开场/打游戏/气泡场景背景）
    floatDots(count) {
      const n = Math.min(count || 10, MAX_PARTICLES - this.particles.length);
      for (let i = 0; i < n; i++) {
        this.particles.push({
          x: Math.random() * this.w,
          y: this.h + 10,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -(0.4 + Math.random() * 1.0),
          life: 1,
          decay: 0.002,
          size: 2 + Math.random() * 3,
          color: this._randomColor(),
          shape: 'dot',
          phase: 'float',
          sway: Math.random() * Math.PI * 2,
        });
      }
      this.start();
    }

    // 点击炸开（粒子爱心环节）
    explode(x, y) {
      for (const p of this.particles) {
        if (p.phase === 'hold') {
          const a = Math.atan2(p.y - y, p.x - x);
          const sp = 2 + Math.random() * 4;
          p.vx = Math.cos(a) * sp;
          p.vy = Math.sin(a) * sp;
          p.phase = 'scatter';
          p.decay = 0.03 + Math.random() * 0.03;
          p.target = null;
          p.heartT = undefined;
        }
      }
      this.start();
    }

    heartPoint(t) {
      // 心形参数方程
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      return { x: x * 1.6, y: y * 1.6 };
    }

    _update() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      this.particles = this.particles.filter((p) => p.life > 0);

      for (const p of this.particles) {
        if (p.phase === 'scatter') {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.98;
          p.vy *= 0.98;
          if (p.target) {
            // 聚拢阶段
            p.x += (p.target.x - p.x) * 0.08;
            p.y += (p.target.y - p.y) * 0.08;
            if (Math.hypot(p.target.x - p.x, p.target.y - p.y) < 1.5) {
              p.phase = 'hold';
            }
          } else if (p.heartT !== undefined) {
            p.delay -= 0.016;
            if (p.delay <= 0) {
              const hp = this.heartPoint(p.heartT * Math.PI * 2);
              p.target = { x: this.w / 2 + hp.x, y: this.h / 2 + hp.y };
            }
          }
        } else if (p.phase === 'hold') {
          // 轻微呼吸
          p.x += Math.sin(performance.now() / 400 + p.heartT * 10) * 0.1;
        } else if (p.phase === 'float') {
          p.x += p.vx + Math.sin(p.sway) * 0.4;
          p.y += p.vy;
          p.sway += 0.05;
        }

        p.life -= p.decay;

        // 绘制
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        if (p.shape === 'heart') {
          this._drawHeart(ctx, p.x, p.y, p.size);
        } else if (p.shape === 'note') {
          this._drawNote(ctx, p.x, p.y, p.size);
        } else {
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;

      if (this.particles.length > 0) {
        this._schedule();
      } else {
        this.running = false;
        ctx.clearRect(0, 0, this.w, this.h);
      }
    }

    _drawHeart(ctx, x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      const k = s / 10;
      ctx.moveTo(0, 3 * k);
      ctx.bezierCurveTo(-5 * k, -2 * k, -2 * k, -6 * k, 0, -2 * k);
      ctx.bezierCurveTo(2 * k, -6 * k, 5 * k, -2 * k, 0, 3 * k);
      ctx.fill();
      ctx.restore();
    }

    _drawNote(ctx, x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      const k = s / 8;
      ctx.fillRect(0, -4 * k, 1.5 * k, 5 * k);
      ctx.fillRect(1.5 * k, -4 * k, 3 * k, 1.5 * k);
      ctx.beginPath();
      ctx.arc(0, 1 * k, 1.6 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    start() {
      if (!this.running) {
        this.running = true;
        this._last = performance.now();
        this._schedule();
      }
    }

    _schedule() {
      if (this.raf) return;
      this.raf = requestAnimationFrame((t) => {
        this.raf = null;
        if (t - this._last < 1000 / FPS) { this._schedule(); return; }
        this._last = t;
        this._update();
      });
    }

    stop() {
      this.running = false;
      if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
      this.particles.length = 0;
      this.ctx.clearRect(0, 0, this.w, this.h);
    }
  }

  global.ParticleSystem = ParticleSystem;
})(window);
