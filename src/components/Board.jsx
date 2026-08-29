import { useMemo, useState, useEffect, useRef } from 'react';
import { tileAt, isDoorChar, isKeyChar } from '../game.js';

const GAP = 2; // 格子间距
// 让棋盘在固定空间内自适应：大图格子变小
const TARGET_W = 560;
const TARGET_H = 520;

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/*
 * 爬行动画：蛇头伸出、蛇尾收回，身体保持正交；转弯不斜切。
 */
function useAnimateSnake(snake, snapKey, cell) {
  const stride = cell + GAP;
  const center = (c) => ({ x: c.c * stride + cell / 2, y: c.r * stride + cell / 2 });
  const toPts = (cells) => cells.map(center);

  const [display, setDisplay] = useState(() => toPts(snake));
  const prevCellsRef = useRef(snake);
  const displayRef = useRef(display);
  const rafRef = useRef();
  const lastSnap = useRef(undefined);
  const lastCell = useRef(cell);

  useEffect(() => {
    const to = toPts(snake);
    // 重置 / 揭示 / 格子大小变化：直接落位
    if (snapKey !== lastSnap.current || cell !== lastCell.current) {
      lastSnap.current = snapKey;
      lastCell.current = cell;
      prevCellsRef.current = snake;
      displayRef.current = to;
      setDisplay(to);
      return;
    }

    if (prevCellsRef.current === snake) return;

    const fromCells = prevCellsRef.current;
    prevCellsRef.current = snake;
    const fromPts = fromCells.map(center);
    const oldHead = fromPts[0];
    const oldTail = fromPts[fromPts.length - 1];
    const newHead = to[0];
    const newTail = to[to.length - 1];
    const body = to.slice(1);

    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    const step = (t) => {
      const p = Math.min(1, (t - start) / 150);
      const e = easeOutCubic(p);
      const head = { x: oldHead.x + (newHead.x - oldHead.x) * e, y: oldHead.y + (newHead.y - oldHead.y) * e };
      const tail = { x: oldTail.x + (newTail.x - oldTail.x) * e, y: oldTail.y + (newTail.y - oldTail.y) * e };
      const pts = [head, ...body, tail];
      displayRef.current = pts;
      setDisplay(pts);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else { displayRef.current = to; setDisplay(to); }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafRef.current);
  }, [snake, snapKey, cell]);

  return display;
}

// 蛇头朝向：优先最后移动方向，否则由“头→脖子”推得
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

// 两只眼睛
function eyes(p, dir, w) {
  const dx = dir.dc, dy = dir.dr;
  const px = -dy, py = dx;
  const front = w * 0.26, spread = w * 0.40;
  const er = Math.max(3, w * 0.19), pr = er * 0.55;
  const r2 = (n) => Math.round(n * 10) / 10;
  const list = [];
  for (const sgn of [1, -1]) {
    const ex = p.x + dx * front + px * spread * sgn;
    const ey = p.y + dy * front + py * spread * sgn;
    list.push({ ex: r2(ex), ey: r2(ey), er: r2(er), pr: r2(pr), px: r2(ex + dx * er * 0.35), py: r2(ey + dy * er * 0.35) });
  }
  return list;
}

export default function Board({ state, snapKey = 0 }) {
  // 自适应格子大小：让整张图放进目标空间
  let cell = Math.floor(Math.min(
    (TARGET_W - (state.W - 1) * GAP) / state.W,
    (TARGET_H - (state.H - 1) * GAP) / state.H
  ));
  cell = Math.max(16, Math.min(46, cell));
  const stride = cell + GAP;
  const snakeW = Math.max(14, Math.min(46, Math.round(cell * 0.66)));
  const bw = state.W * stride - GAP;
  const bh = state.H * stride - GAP;

  const tiles = useMemo(() => {
    const arr = [];
    for (let r = 0; r < state.H; r++) {
      for (let c = 0; c < state.W; c++) {
        const t = tileAt(state, r, c);
        let cls = t === '#' ? 'wall' : t === '0' ? 'floor' : '';
        if (t === 'D') cls = 'dest';
        else if (isDoorChar(t)) cls = 'door';
        else if (isKeyChar(t)) cls = 'key';
        arr.push(<div key={`${r},${c}`} className={`cell ${cls}`} />);
      }
    }
    return arr;
  }, [state]);

  const ptsAnim = useAnimateSnake(state.snake, snapKey, cell);
  const d = ptsAnim.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
  const head = ptsAnim[0] || { x: stride * state.snake[0].c + cell / 2, y: stride * state.snake[0].r + cell / 2 };
  const dir = headDir(state);
  const eyeList = eyes(head, dir, snakeW);

  return (
    <div className="board" style={{ '--cell': cell + 'px', width: bw, height: bh }}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${state.W}, ${cell}px)`,
          gridTemplateRows: `repeat(${state.H}, ${cell}px)`,
          gap: `${GAP}px`,
        }}
      >
        {tiles}
      </div>

      <svg className="snake-layer" viewBox={`0 0 ${bw} ${bh}`} width={bw} height={bh}>
        <path d={d} fill="none" stroke="#2f7d35" strokeWidth={snakeW + 5} strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
        <path d={d} fill="none" stroke="#69bf6d" strokeWidth={snakeW} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={head.x} cy={head.y} r={snakeW / 2} fill="#4caf50" />
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
