import { useMemo, useState, useEffect, useRef } from 'react';
import { tileAt } from '../game.js';

const CELL = 46;
const GAP = 2;
const SNAKE_W = 30; // 蛇比格子细（格子 46px）
const STRIDE = CELL + GAP;
const DUR = 150;    // 一次移动的动画时长（ms）

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const center = (c) => ({ x: c.c * STRIDE + CELL / 2, y: c.r * STRIDE + CELL / 2 });

/*
 * 蛇的爬行动画：
 *   动画期间【蛇头】从旧头位置平滑滑到新头位置（头部伸出）；
 *   【蛇尾】从旧尾位置平滑滑到新尾位置（尾部收回）；
 *   身体各节保持在新蛇对应的格子上不动。
 *   这样转弯时身体始终正交，且头、尾都连续动画，不跳变。
 */
function useAnimateSnake(snake, snapKey) {
  const toPts = (cells) => cells.map(center);
  const [display, setDisplay] = useState(() => toPts(snake));
  const prevCellsRef = useRef(snake);
  const displayRef = useRef(display);
  const rafRef = useRef();
  const lastSnap = useRef(undefined);

  useEffect(() => {
    const to = toPts(snake);

    // 重置 / 揭示：直接落位
    if (snapKey !== lastSnap.current) {
      lastSnap.current = snapKey;
      prevCellsRef.current = snake;
      displayRef.current = to;
      setDisplay(to);
      return;
    }

    // 没有移动（蛇没变），不播动画
    if (prevCellsRef.current === snake) return;

    const fromCells = prevCellsRef.current;
    prevCellsRef.current = snake; // 下一次移动的“上一状态”以本次为准

    const fromPts = fromCells.map(center);
    const oldHead = fromPts[0];
    const oldTail = fromPts[fromPts.length - 1];
    const newHead = to[0];
    const newTail = to[to.length - 1];
    const body = to.slice(1); // 新蛇的身体节固定

    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    const step = (t) => {
      const p = Math.min(1, (t - start) / DUR);
      const e = easeOutCubic(p);
      const head = {
        x: oldHead.x + (newHead.x - oldHead.x) * e,
        y: oldHead.y + (newHead.y - oldHead.y) * e,
      };
      const tail = {
        x: oldTail.x + (newTail.x - oldTail.x) * e,
        y: oldTail.y + (newTail.y - oldTail.y) * e,
      };
      const pts = [head, ...body, tail];
      displayRef.current = pts;
      setDisplay(pts);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else { displayRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafRef.current);
  }, [snake, snapKey]);

  return display;
}

// 蛇头朝向：优先取最后移动方向，否则由“头→脖子”推得
function headDir(state) {
  const h = state.snake[0], n = state.snake[1];
  if (n) {
    const dr = Math.sign(h.r - n.r), dc = Math.sign(h.c - n.c);
    if (dr || dc) return { dr, dc };
  }
  if (state.lastDir) {
    const dx = state.lastDir === 'right' ? 1 : state.lastDir === 'left' ? -1 : 0;
    const dy = state.lastDir === 'down' ? 1 : state.lastDir === 'up' ? -1 : 0;
    return { dr: dy, dc: dx };
  }
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
  const r2 = (n) => Math.round(n * 10) / 10;
  const list = [];
  for (const sgn of [1, -1]) {
    const ex = p.x + dx * front + px * spread * sgn;
    const ey = p.y + dy * front + py * spread * sgn;
    list.push({
      ex: r2(ex), ey: r2(ey), er: r2(er), pr: r2(pr),
      px: r2(ex + dx * er * 0.35), py: r2(ey + dy * er * 0.35),
    });
  }
  return list;
}

export default function Board({ state, snapKey = 0 }) {
  const bw = state.W * STRIDE - GAP;
  const bh = state.H * STRIDE - GAP;

  const tiles = useMemo(() => {
    const arr = [];
    for (let r = 0; r < state.H; r++) {
      for (let c = 0; c < state.W; c++) {
        const t = tileAt(state, r, c);
        const cls = t === '#' ? 'wall' : t === '0' ? 'floor' : t === 'D' ? 'door' : t === 'K' ? 'key' : '';
        arr.push(<div key={`${r},${c}`} className={`cell ${cls}`} />);
      }
    }
    return arr;
  }, [state]);

  const ptsAnim = useAnimateSnake(state.snake, snapKey);

  const d = ptsAnim.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
  const head = ptsAnim[0] || center(state.snake[0]);
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
        <path d={d} fill="none" stroke="#2f7d35" strokeWidth={SNAKE_W + 5} strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
        <path d={d} fill="none" stroke="#69bf6d" strokeWidth={SNAKE_W} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={head.x} cy={head.y} r={SNAKE_W / 2} fill="#4caf50" />
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
