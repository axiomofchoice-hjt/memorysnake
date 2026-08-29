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

export function parseLevel(lines) {
  lines = (lines || []).map((s) => String(s).replace(/\r/g, '').trimEnd()).filter((s) => s.length > 0);
  if (!lines.length) throw new Error('empty level');

  const grid = lines.map((line) => line.split(''));
  const H = grid.length;
  const W = grid[0].length;

  let head = null;
  const bodyCells = [];
  const goals = [];
  const keys = [];

  for (let r = 0; r < H; r++) {
    if (grid[r].length !== W) throw new Error('ragged level row');
    for (let c = 0; c < W; c++) {
      const ch = grid[r][c];
      if (ch === '2') head = { r, c };
      else if (ch === '1') bodyCells.push({ r, c });
      else if (ch === 'D') goals.push({ r, c });
      else if (ch === 'K') keys.push({ r, c });
    }
  }
  if (!head) throw new Error('level has no head (2)');

  const snake = buildSnakePath(grid, head, bodyCells, H, W);
  return { grid, H, W, snake, goals, keys };
}

// 从蛇头出发重建蛇的完整身体路径（蛇头在首位，蛇尾在末位）
function buildSnakePath(grid, head, bodyCells, H, W) {
  const bodySet = new Set(bodyCells.map((c) => keyOf(c.r, c.c)));
  const isSnake = (r, c) => bodySet.has(keyOf(r, c));

  const neighbors = (r, c) => {
    const out = [];
    for (const d of Object.values(DIRS)) {
      const nr = r + d.dr, nc = c + d.dc;
      if (nr >= 0 && nr < H && nc >= 0 && nc < W && isSnake(nr, nc)) out.push({ r: nr, c: nc });
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

export function createState(level) {
  return {
    grid: level.grid.map((row) => row.slice()),
    H: level.H,
    W: level.W,
    snake: level.snake.map((s) => ({ r: s.r, c: s.c })),
    goals: level.goals.slice(),
    keys: level.keys.slice(),
    heldKeys: [],
    status: 'playing', // 'playing' | 'won' | 'lost'
    reason: null,      // 'wall' | 'self' | null
    moves: 0,
    lastDir: null,
    won: false,
  };
}

const pureSnapshot = (state) => ({
  status: state.status,
  reason: state.reason,
  moves: state.moves,
  lastDir: state.lastDir,
  won: state.won,
  heldKeys: state.heldKeys.slice(),
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

  let heldKeys = prev.heldKeys;
  let won = false;
  if (target === 'K') {
    heldKeys = prev.heldKeys.concat([{ r: nr, c: nc }]);
    grid[nr][nc] = '0';
  }
  if (target === 'D') won = true;

  return Object.assign({}, prev, {
    snake: newSnake,
    grid,
    heldKeys,
    status: won ? 'won' : 'playing',
    moves: prev.moves + 1,
    lastDir: dir,
    won,
  });
}

// 某格的地砖类型（静态网格里的 '1'/'2' 视为地板，因为蛇身是动态的）
export function tileAt(state, r, c) {
  const ch = state.grid[r][c];
  if (ch === '1' || ch === '2') return '0';
  return ch;
}

// 蛇在 (r,c) 的索引：0 为头，-1 表示无蛇
export function snakeIndexAt(state, r, c) {
  for (let i = 0; i < state.snake.length; i++) {
    if (state.snake[i].r === r && state.snake[i].c === c) return i;
  }
  return -1;
}
