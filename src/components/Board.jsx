import { tileAt } from '../game.js';

const CELL = 46;
const GAP = 2;
const SNAKE_W = 30; // 蛇比格子细（格子 46px）

// 蛇头朝向：优先取最后移动方向，否则由“头→脖子”推得
function headDir(state) {
  const h = state.snake[0], n = state.snake[1];
  if (n) {
    const dr = Math.sign(h.r - n.r), dc = Math.sign(h.c - n.c);
    if (dr || dc) return { dr, dc };
  }
  if (state.lastDir) return { dr: state.lastDir === 'down' ? 1 : state.lastDir === 'up' ? -1 : 0, dc: state.lastDir === 'right' ? 1 : state.lastDir === 'left' ? -1 : 0 };
  return { dr: 1, dc: 0 };
}

// 两只眼睛：沿朝向偏前，垂直于朝向分开
function eyes(p, dir, w) {
  const dx = dir.dc, dy = dir.dr;   // SVG: x=列, y=行
  const px = -dy, py = dx;
  const front = w * 0.26;
  const spread = w * 0.40;
  const er = Math.max(3, w * 0.19);
  const pr = er * 0.55;
  const list = [];
  for (const sgn of [1, -1]) {
    const ex = p.x + dx * front + px * spread * sgn;
    const ey = p.y + dy * front + py * spread * sgn;
    const r2 = (n) => Math.round(n * 10) / 10;
    list.push({
      ex: r2(ex), ey: r2(ey), er: r2(er), pr: r2(pr),
      px: r2(ex + dx * er * 0.35), py: r2(ey + dy * er * 0.35),
    });
  }
  return list;
}

export default function Board({ state }) {
  const stride = CELL + GAP;
  const bw = state.W * stride - GAP;
  const bh = state.H * stride - GAP;

  const tiles = [];
  for (let r = 0; r < state.H; r++) {
    for (let c = 0; c < state.W; c++) {
      const t = tileAt(state, r, c);
      const cls = t === '#' ? 'wall' : t === '0' ? 'floor' : t === 'D' ? 'door' : t === 'K' ? 'key' : '';
      tiles.push(<div key={`${r},${c}`} className={`cell ${cls}`} />);
    }
  }

  const pts = state.snake.map((c) => ({ x: c.c * stride + CELL / 2, y: c.r * stride + CELL / 2 }));
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
  const head = pts[0];
  const dir = headDir(state);
  const eyeList = eyes(head, dir, SNAKE_W);

  return (
    <div className="board" style={{ width: bw, height: bh }}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${state.W}, ${CELL}px)`,
          gridTemplateRows: `repeat(${state.H}, ${CELL}px)`,
          gap: `${GAP}px`,
        }}
      >
        {tiles}
      </div>

      <svg className="snake-layer" viewBox={`0 0 ${bw} ${bh}`} width={bw} height={bh}>
        {/* 深色描边（增强与地板对比） */}
        <path d={d} fill="none" stroke="#2f7d35" strokeWidth={SNAKE_W + 5} strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
        {/* 蛇身主体 */}
        <path d={d} fill="none" stroke="#69bf6d" strokeWidth={SNAKE_W} strokeLinecap="round" strokeLinejoin="round" />
        {/* 蛇头 */}
        <circle cx={head.x} cy={head.y} r={SNAKE_W / 2} fill="#4caf50" />
        {/* 眼睛 */}
        {eyeList.map((e, i) => (
          <g key={i}>
            <circle cx={e.ex} cy={e.ey} r={e.er} fill="#f6fbf6" />
            <circle cx={e.px} cy={e.py} r={e.pr} fill="#1f2b1f" />
          </g>
        ))}
      </svg>
    </div>
  );
}
