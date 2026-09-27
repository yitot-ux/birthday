/* pixel.js — 像素小人渲染器
 * 三个角色：
 *   birthday —— 毛毛：浅蓝短发（32×26 点阵 GRID_1）
 *   pet      —— 菲菲：灰紫长卷发（32×26 点阵 GRID_2）
 *   cat      —— 桌宠「咪」：1-bit 黑白像素小猫（Game Boy 风）
 * 毛毛/菲菲严格按点阵绘制，表情不做 pose 变体；咪保持黑白像素。
 */
(function (global) {
  'use strict';

  const SIZE = 32;       // 桌宠 cat 的网格（32×32）
  const CHIBI_W = 32;    // 小人点阵宽
  const CHIBI_H = 26;    // 小人点阵高

  /* ===== 角色一：浅蓝短发（毛毛）=====
   * . 透明  K 黑轮廓  H 头发  S 皮肤  E 眼睛
   * W 高光  B 腮红   M 嘴巴  C 衣服  c 衣饰
   */
  const GRID_1 = [
    '................................',
    '............KHHHHHHK............',
    '..........KHHHHHHHHHHK..........',
    '.........KHHHHHHHHHHHHK.........',
    '........KHHHHHHHHHHHHHHK........',
    '........KHHHSSSSSSSSHHHK........',
    '.......KHHHSSSSSSSSSSHHHK.......',
    '.......KHHHSSSSSSSSSSHHHK.......',
    '.......KHHSSSSSSSSSSSSHHK.......',
    '.......KHHSSEESSSSEESSHHK.......',
    '.......KHHSSWESSSSWESSHHK.......',
    '.......KHHBBSSSSSSSSBBHHK.......',
    '.......KHHSSSSSMMSSSSSHHK.......',
    '........KHHSSSSSSSSSSHHK........',
    '........KSSSSSSSSSSSSSSK........',
    '.........KSSSSSSSSSSSSK.........',
    '..........KSSSSSSSSSSK..........',
    '...........KSSSSSSSSK...........',
    '..............KSSK..............',
    '...........KCCCCCCCCK...........',
    '..........KSCCCccCCCSK..........',
    '..........KSCCCCCCCCSK..........',
    '..........KCCCCCCCCCCK..........',
    '..........KCCCCCCCCCCK..........',
    '..............S..S..............',
    '.............KK..KK.............',
  ];

  /* ===== 角色二：灰紫长卷发（菲菲）===== */
  const GRID_2 = [
    '................................',
    '............KHHHHWWK............',
    '..........KHHHHHHWWHHK..........',
    '.........KHHHHHHHHHHHHK.........',
    '........KHHHHHHHHHHHHHHK........',
    '........KHHHSSSSSSSSHHHK........',
    '.......KHHHSSSSSSSSSSHHHK.......',
    '.......KHHHSSSSSSSSSSHHHK.......',
    '.......KHHSSSSSSSSSSSSHHK.......',
    '.......KHHSSEESSSSEESSHHK.......',
    '.......KHHSSWESSSSWESSHHK.......',
    '.......KHHBBSSSSSSSSBBHHK.......',
    '.......KHHSSSSSMMSSSSSHHK.......',
    '.......KHHHSSSSSSSSSSHHHK.......',
    '.......KHHHSSSSSSSSSSHHHK.......',
    '........KHHHSSSSSSSSHHHK........',
    '.........KHHSSSSSSSSHHK.........',
    '.........KHHHSSSSSSHHHK.........',
    '.........KHHHHSSSSHHHHK.........',
    '........KHHKCCCCCCCCKHHK........',
    '........KHHKCCCccCCCKHHK........',
    '........KHHKCCCCCCCCKHHK........',
    '........KHHKCCCCCCCCKHHK........',
    '.........KHKCCCCCCCCKHK.........',
    '..............S..S..............',
    '.............KK..KK.............',
  ];

  const PALETTE_1 = {
    K: '#2B2B3A', H: '#A9DDF5', S: '#FFE3D3', E: '#35568C',
    W: '#FFFFFF', B: '#FFB0B8', M: '#C96B6B', C: '#FFFFFF', c: '#A9DDF5',
  };

  const PALETTE_2 = {
    K: '#2B2B3A', H: '#B3A3C9', S: '#FFE3D3', E: '#8B5FC9',
    W: '#FFFFFF', B: '#FFB0B8', M: '#C96B6B', C: '#FFFFFF', c: '#D9C9EC',
  };

  // 桌宠「咪」1-bit 黑白色
  const C = {
    catBlack: '#1b1b1f',
    catWhite: '#ffffff',
  };

  function px(ctx, x, y, w, h, color) {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function dimsFor(type) {
    return type === 'cat' ? { w: SIZE, h: SIZE } : { w: CHIBI_W, h: CHIBI_H };
  }

  // 逐格绘制点阵
  function renderGrid(ctx, grid, palette) {
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === undefined) continue;
        const color = palette[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  /* ===== 桌宠「咪」：1-bit 黑白小猫（坐姿）===== */
  function drawCat(ctx, pose) {
    const B = C.catBlack, W = C.catWhite;

    // 耳朵（三角，黑描边 + 白内耳）
    px(ctx, 10, 1, 2, 1, B);
    px(ctx, 9, 2, 4, 1, B);
    px(ctx, 20, 1, 2, 1, B);
    px(ctx, 19, 2, 4, 1, B);
    px(ctx, 10, 2, 1, 1, W);
    px(ctx, 21, 2, 1, 1, W);

    // 头（圆脸，黑粗轮廓 + 白填充）
    px(ctx, 8, 3, 16, 1, B);
    px(ctx, 7, 4, 18, 1, B);
    px(ctx, 7, 5, 18, 8, B);
    px(ctx, 8, 13, 16, 1, B);
    px(ctx, 9, 14, 14, 1, B);
    px(ctx, 8, 4, 16, 9, W);

    // 眼睛（大眼）
    if (pose === 'sleepy' || pose === 'sleep') {
      px(ctx, 11, 8, 3, 1, B);
      px(ctx, 18, 8, 3, 1, B);
    } else if (pose === 'happy') {
      px(ctx, 11, 8, 1, 1, B); px(ctx, 12, 7, 1, 1, B); px(ctx, 13, 8, 1, 1, B);
      px(ctx, 18, 8, 1, 1, B); px(ctx, 19, 7, 1, 1, B); px(ctx, 20, 8, 1, 1, B);
    } else if (pose === 'sad') {
      px(ctx, 11, 8, 3, 2, B);
      px(ctx, 18, 8, 3, 2, B);
    } else {
      px(ctx, 11, 7, 3, 3, B);
      px(ctx, 18, 7, 3, 3, B);
      px(ctx, 12, 7, 1, 1, W);
      px(ctx, 19, 7, 1, 1, W);
    }

    // 鼻 + 嘴
    px(ctx, 15, 10, 2, 1, B);
    if (pose === 'happy') {
      px(ctx, 14, 11, 1, 1, B); px(ctx, 15, 12, 2, 1, B); px(ctx, 17, 11, 1, 1, B);
    } else if (pose === 'sad') {
      px(ctx, 14, 12, 1, 1, B); px(ctx, 15, 11, 2, 1, B); px(ctx, 17, 12, 1, 1, B);
    } else if (pose === 'jump') {
      px(ctx, 15, 11, 2, 2, B);
    } else {
      px(ctx, 15, 11, 2, 1, B);
    }

    // 身体（坐姿）
    px(ctx, 9, 15, 14, 9, B);
    px(ctx, 10, 16, 12, 7, W);

    // 点状抖动阴影
    px(ctx, 11, 21, 1, 1, B); px(ctx, 13, 21, 1, 1, B); px(ctx, 15, 21, 1, 1, B);
    px(ctx, 17, 21, 1, 1, B); px(ctx, 19, 21, 1, 1, B);
    px(ctx, 12, 22, 1, 1, B); px(ctx, 14, 22, 1, 1, B);
    px(ctx, 16, 22, 1, 1, B); px(ctx, 18, 22, 1, 1, B);

    // 前爪（短腿）
    px(ctx, 10, 23, 4, 3, B);
    px(ctx, 18, 23, 4, 3, B);
    px(ctx, 11, 24, 2, 2, W);
    px(ctx, 19, 24, 2, 2, W);

    // 细尾巴（右后侧，向上卷）
    px(ctx, 22, 16, 2, 1, B);
    px(ctx, 23, 17, 2, 6, B);
    px(ctx, 25, 22, 2, 1, B);
    px(ctx, 26, 23, 1, 3, B);
  }

  function drawBirthday(ctx, pose) { renderGrid(ctx, GRID_1, PALETTE_1); }
  function drawPet(ctx, pose, accessories) { renderGrid(ctx, GRID_2, PALETTE_2); }

  function render(ctx, type, pose, accessories) {
    if (type === 'birthday') drawBirthday(ctx, pose);
    else if (type === 'cat') drawCat(ctx, pose);
    else drawPet(ctx, pose, accessories);
  }

  // 渲染一个精灵到 canvas，返回 DOM 元素（放大 scale 倍）
  function makeSprite(type, pose, scale, accessories) {
    const d = dimsFor(type);
    const cv = document.createElement('canvas');
    cv.width = d.w;
    cv.height = d.h;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, d.w, d.h);
    render(ctx, type, pose, accessories);

    const sc = scale || 3;
    cv.style.width = (d.w * sc) + 'px';
    cv.style.height = (d.h * sc) + 'px';
    cv.style.imageRendering = 'pixelated';
    cv.style.display = 'block';
    return cv;
  }

  // 画到指定 canvas（供桌宠复用同一 canvas 反复重绘）
  function drawToCanvas(cv, type, pose, accessories) {
    const d = dimsFor(type);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    render(ctx, type, pose, accessories);
  }

  // 生成 PNG dataURL（PWA 图标 / 分享卡片）
  function toDataURL(type, pose, accessories) {
    const d = dimsFor(type);
    const cv = document.createElement('canvas');
    cv.width = d.w;
    cv.height = d.h;
    const ctx = cv.getContext('2d');
    render(ctx, type, pose, accessories);
    return cv.toDataURL('image/png');
  }

  global.Pixel = {
    SIZE: SIZE,
    colors: C,
    makeSprite: makeSprite,
    drawToCanvas: drawToCanvas,
    toDataURL: toDataURL,
  };
})(window);
