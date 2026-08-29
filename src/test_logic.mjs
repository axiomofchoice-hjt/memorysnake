// Node 逻辑验证（ESM）。运行: node src/test_logic.mjs
import { parseLevel, createState, applyMove, tileAt, snakeIndexAt } from './game.js';

const LEVEL = [
  '##########',
  '#1111##0D#',
  '#1001##00#',
  '#20011110#',
  '##########',
];

function render(s) {
  let out = '';
  for (let r = 0; r < s.H; r++) {
    let line = '';
    for (let c = 0; c < s.W; c++) {
      const idx = snakeIndexAt(s, r, c);
      if (idx === 0) line += 'H';
      else if (idx > 0) line += 'o';
      else {
        const t = tileAt(s, r, c);
        line += t === '0' ? '.' : t;
      }
    }
    out += line + '\n';
  }
  return out;
}

const g = parseLevel(LEVEL);
console.log('蛇路径:', g.snake.map((p) => `(${p.r},${p.c})`).join(' -> '), '| 蛇长', g.snake.length);
console.log('\n初始:\n' + render(createState(g)));

let s = createState(g);
s = applyMove(s, 'right');
console.log('右移一步:', render(s), '状态', s.status);

console.log('撞墙(下):', applyMove(createState(g), 'down').status);
console.log('撞自己(上):', applyMove(createState(g), 'up').status);

// 环形边界
let w = createState(parseLevel(['2.....', '......']));
w = applyMove(w, 'left');
console.log('环形(左):', JSON.stringify(w.snake[0]));
w = applyMove(w, 'right');
console.log('环形(右):', JSON.stringify(w.snake[0]));

// 到达终点
let win = createState(parseLevel(['###', '#2D', '###']));
win = applyMove(win, 'right');
console.log('到D:', win.status, win.won);

// 钥匙
let k = createState(parseLevel(['#####', '#2K.D', '#####']));
k = applyMove(k, 'right');
console.log('拾K后钥匙数:', k.heldKeys.length, '原地砖:', k.grid[k.snake[0].r][k.snake[0].c]);
