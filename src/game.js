/*
 * 贪吃蛇 · 迷宫逃生 —— 纯游戏逻辑（无 React / 无 DOM）
 *
 * 图例（格子字符）：
 *   '#' 墙（撞到失败） | '0' 地板 | '1' 蛇身 | '2' 蛇头 | 'D' 门/终点（到达即胜） | 'K' 钥匙（可拾取）
 *
 * 规则：
 *   - 每按一次方向键/WASD，蛇头前进一格，蛇身跟随（经典贪吃蛇），蛇尾腾空。
 *   - 撞到墙或自己（除即将腾空的蛇尾外）均失败。
 *   - 网格四周环形，出界会从另一侧进入。
 *   - 蛇身长度固定，目标是让蛇头到达终点 'D'。
 */

export const DIRS = {
  up:    { dr: -1, dc: 0 },
  down:  { dr:  1, dc: 0 },
  left:  { dr:  0, dc: -1 },
  right: { dr:  0, dc:  1 },
};

export const DIR_KEY = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
};

export const keyOf = (r, c) => r + ',' + c;

// 用制表符表示蛇身（视觉更直观），等价于 '1'
export const BOX_CHARS = new Set(['━', '┃', '┏', '┓', '┗', '┛']);

// 门：大写字母（除终点 'D' 外）；钥匙：小写字母。'a' 打开 'A'。
export const isDoorChar = (ch) => /^[A-Z]$/.test(ch) && ch !== 'D';
export const isKeyChar = (ch) => /^[a-z]$/.test(ch);

export function parseLevel(lines) {
  lines = (lines || []).map((s) => String(s).replace(/\r/g, '').trimEnd()).filter((s) => s.length > 0);
  if (!lines.length) throw new Error('empty level');

  const grid = lines.map((line) => line.split(''));
  const H = grid.length;
  const W = grid[0].length;

  let head = null;
  const bodyCells = [];
  const walls = [];   // '#'
  const goals = [];   // 'D' 终点（到达即胜）
  const doors = [];   // 大写字母门（吃钥匙前是墙，开后变地板）
  const keys = [];    // 小写字母钥匙（'a' 打开 'A'）

  for (let r = 0; r < H; r++) {
    if (grid[r].length !== W) throw new Error('ragged level row');
    for (let c = 0; c < W; c++) {
      const ch = grid[r][c];
      if (ch === '2') head = { r, c };
      else if (ch === '1' || BOX_CHARS.has(ch)) bodyCells.push({ r, c });
      else if (ch === '#') walls.push({ r, c });
      else if (ch === 'D') goals.push({ r, c });
      else if (isDoorChar(ch)) doors.push({ r, c, letter: ch });
      else if (isKeyChar(ch)) keys.push({ r, c, letter: ch });
    }
  }
  if (!head) throw new Error('level has no head (2)');

  const snake = buildSnakePath(grid, head, bodyCells, H, W);

  // 返回“关卡对象”（结构化，不是字符串）
  return {
    w: W,
    h: H,
    snake,
    walls,
    goal: goals.length ? goals[0] : null,
    doors,
    keys,
  };
}

// 从关卡对象构建可玩的游戏状态
export function createState(level) {
  const H = level.h, W = level.w;
  const walls = level.walls || [];
  const doors = level.doors || [];
  const keys = level.keys || [];
  const grid = Array.from({ length: H }, () => Array(W).fill('0'));
  for (const wl of walls) grid[wl.r][wl.c] = '#';
  if (level.goal) grid[level.goal.r][level.goal.c] = 'D';
  for (const d of doors) grid[d.r][d.c] = d.letter;          // 门（大写字母）
  for (const k of keys) grid[k.r][k.c] = k.letter;            // 钥匙（小写字母）

  // 钥匙按字母开门：钥匙 'a' 打开所有 'A' 门
  const keyLetter = {};                                    // keyPos -> letter(小写)
  for (const k of keys) keyLetter[keyOf(k.r, k.c)] = k.letter;
  const doorsByLetter = {};                                // letter(大写) -> [doorPos...]
  for (const d of doors) {
    const L = d.letter;
    (doorsByLetter[L] = doorsByLetter[L] || []).push(keyOf(d.r, d.c));
  }

  return {
    grid,
    H,
    W,
    snake: level.snake.map((s) => ({ r: s.r, c: s.c })),
    goals: level.goal ? [{ r: level.goal.r, c: level.goal.c }] : [],
    doors,
    keys,
    keyLetter,
    doorsByLetter,
    doorOpen: new Set(), // 当前已开（变地板）的门，初始全关
    status: 'playing',   // 'playing' | 'won' | 'lost'
    reason: null,        // 'wall' | 'self' | null
    moves: 0,
    lastDir: null,
    won: false,
  };
}

// 制表符的连接方向：只有画线的那两边才算相连
function conn(ch) {
  switch (ch) {
    case '━': return [[0, -1], [0, 1]];            // left, right
    case '┃': return [[-1, 0], [1, 0]];            // up, down
    case '┏': return [[1, 0], [0, 1]];             // down, right
    case '┓': return [[1, 0], [0, -1]];            // down, left
    case '┗': return [[-1, 0], [0, 1]];            // up, right
    case '┛': return [[-1, 0], [0, -1]];           // up, left
    default: return [[-1, 0], [1, 0], [0, -1], [0, 1]]; // '1'/'2'
  }
}

// 从蛇头出发重建蛇的完整身体路径（蛇头在首位，蛇尾在末位）
function buildSnakePath(grid, head, bodyCells, H, W) {
  const bodySet = new Set(bodyCells.map((c) => keyOf(c.r, c.c)));
  const isSnake = (r, c) => bodySet.has(keyOf(r, c)) || (r === head.r && c === head.c);
  const points = (ch, dr, dc) => conn(ch).some(([a, b]) => a === dr && b === dc);

  // 相邻两格相连：本格有指向邻格的线，且邻格也有指回来的线
  const neighbors = (r, c) => {
    const ch = grid[r][c];
    const out = [];
    for (const [dr, dc] of conn(ch)) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < H && nc >= 0 && nc < W && isSnake(nr, nc)) {
        if (points(grid[nr][nc], -dr, -dc)) out.push({ r: nr, c: nc });
      }
    }
    return out;
  };

  let best = null;
  const visited = new Set([keyOf(head.r, head.c)]);
  const path = [head];

  function dfs(r, c) {
    const ns = neighbors(r, c).filter((n) => !visited.has(keyOf(n.r, n.c)));
    if (!ns.length) {
      if (!best || path.length > best.length) best = path.slice();
      return;
    }
    for (const n of ns) {
      visited.add(keyOf(n.r, n.c));
      path.push(n);
      dfs(n.r, n.c);
      path.pop();
      visited.delete(keyOf(n.r, n.c));
    }
  }
  dfs(head.r, head.c);

  return best && best.length ? best : [head];
}

const pureSnapshot = (state) => ({
  status: state.status,
  reason: state.reason,
  moves: state.moves,
  lastDir: state.lastDir,
  won: state.won,
});

// 应用一次移动：纯函数，返回新状态，不修改入参
export function applyMove(prev, dir) {
  const d = DIRS[dir];
  if (!d) return prev;

  const { H, W } = prev;
  const head = prev.snake[0];
  const nr = (head.r + d.dr + H) % H; // 环形边界
  const nc = (head.c + d.dc + W) % W;
  const target = prev.grid[nr][nc];
  const len = prev.snake.length;

  // 碰撞检测所用蛇身集合：排除将要腾空的蛇尾
  const bodySet = new Set();
  for (let i = 0; i < len - 1; i++) bodySet.add(keyOf(prev.snake[i].r, prev.snake[i].c));
  const hitKey = keyOf(nr, nc);

  if (target === '#') {
    return Object.assign({}, prev, pureSnapshot(prev), { status: 'lost', reason: 'wall', moves: prev.moves + 1, lastDir: dir });
  }
  if (bodySet.has(hitKey)) {
    return Object.assign({}, prev, pureSnapshot(prev), { status: 'lost', reason: 'self', moves: prev.moves + 1, lastDir: dir });
  }

  const newHead = { r: nr, c: nc };
  const newSnake = [newHead].concat(prev.snake.slice(0, len - 1));
  const grid = prev.grid.map((row) => row.slice());
  const base = { snake: newSnake, grid, moves: prev.moves + 1, lastDir: dir };

  // 终点 'D'：到达即胜（门始终是终点，不是障碍）
  if (target === 'D') {
    return Object.assign({}, prev, base, { status: 'won', won: true });
  }

  // 门（大写字母，'D' 是终点不算门）：吃到对应钥匙前是墙（撞上=失败）；开门后变地板
  if (isDoorChar(target)) {
    if (!prev.doorOpen.has(hitKey)) {
      return Object.assign({}, prev, pureSnapshot(prev), { status: 'lost', reason: 'wall', moves: prev.moves + 1, lastDir: dir });
    }
    return Object.assign({}, prev, base, { status: 'playing', won: false });
  }

  // 钥匙（小写字母）：吃到后打开所有同字母的门（'a' 开所有 'A'）；钥匙被消耗，不作为持有状态
  if (isKeyChar(target)) {
    const letter = prev.keyLetter[hitKey];
    const doorOpen = new Set(prev.doorOpen);
    if (letter && prev.doorsByLetter) {
      const list = prev.doorsByLetter[letter.toUpperCase()];
      if (list) for (const p of list) doorOpen.add(p);
    }
    grid[nr][nc] = '0'; // 钥匙被吃掉
    return Object.assign({}, prev, base, { doorOpen });
  }

  // 地板
  return Object.assign({}, prev, base, { status: 'playing', won: false });
}

// 某格的地砖类型（静态网格里的 '1'/'2'/制表符 视为地板；已开的门视为地板即“门消失”）
export function tileAt(state, r, c) {
  const ch = state.grid[r][c];
  if (ch === '1' || ch === '2' || BOX_CHARS.has(ch)) return '0';
  if (isDoorChar(ch) && state.doorOpen && state.doorOpen.has(keyOf(r, c))) return '0';
  return ch;
}

// 蛇在 (r,c) 的索引：0 为头，-1 表示无蛇
export function snakeIndexAt(state, r, c) {
  for (let i = 0; i < state.snake.length; i++) {
    if (state.snake[i].r === r && state.snake[i].c === c) return i;
  }
  return -1;
}
