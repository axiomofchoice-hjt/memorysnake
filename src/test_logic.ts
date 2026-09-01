// Node 逻辑验证（TS）。运行: npm run test
import { parseLevel, createState, applyMove, tileAt, snakeIndexAt } from './game';
import type { GameState } from './game';

function render(s: GameState): string {
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

const ASC = ['##########', '#1111##0D#', '#1001##00#', '#20011110#', '##########'];
const g = parseLevel(ASC);
console.log('关卡对象 keys:', Object.keys(g).join(','));
console.log('蛇长:', g.snake.length, '蛇头:', JSON.stringify(g.snake[0]));
console.log('\n初始:\n' + render(createState(g)));

let s = createState(g);
s = applyMove(s, 'right');
console.log('右移一步:\n' + render(s), '状态', s.status);

// 终点 D：到达即胜（无需钥匙）
let a = createState(parseLevel(['####', '#2D#', '####']));
a = applyMove(a, 'right');
console.log('到达D:', a.status, a.won);

// 门 A：未开是墙（撞上=失败）
let b = createState(parseLevel(['####', '#2A#', '####']));
b = applyMove(b, 'right');
console.log('撞未开的门A:', b.status, b.reason);

// 钥匙 a 打开门 A，门变地板，穿过，到 D 胜
let c = createState(parseLevel(['######', '#2aAD#', '######']));
console.log('门A初始关闭:', c.doorOpen.has('1,3'));
c = applyMove(c, 'right'); // 吃 a，开 A
console.log('吃a后 门(1,3)开:', c.doorOpen.has('1,3'), '| tileAt门:', tileAt(c, 1, 3));
c = applyMove(c, 'right'); // 穿过已开的门
console.log('穿门后状态:', c.status);
c = applyMove(c, 'right'); // 到 D
console.log('到达D:', c.status, c.won);

// 钥匙无对应门：无副作用
let d = createState(parseLevel(['######', '#2a..#', '######']));
d = applyMove(d, 'right');
console.log('吃无门钥匙:', d.status, 'doorOpen size:', d.doorOpen.size);
