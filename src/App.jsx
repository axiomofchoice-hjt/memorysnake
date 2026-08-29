import { useState, useRef, useEffect, useCallback } from 'react';
import { parseLevel, createState, applyMove, DIR_KEY } from './game.js';
import Board from './components/Board.jsx';
import Panel from './components/Panel.jsx';
import Overlay from './components/Overlay.jsx';

// 关卡（可追加更多）。第一关来自需求。
const LEVELS = [
  [
    '##########',
    '#1111##0D#',
    '#1001##00#',
    '#20011110#',
    '##########',
  ],
];

const fresh = (level) => createState(parseLevel(LEVELS[level]));

export default function App() {
  const [hardMode, setHardMode] = useState(false);
  const [level, setLevel] = useState(0);
  const [game, setGame] = useState(() => fresh(0));
  const baseRef = useRef(null); // 初始快照（困难模式盲走时显示）
  if (baseRef.current === null) baseRef.current = game;

  const reset = useCallback((lvl = level) => {
    const st = fresh(lvl);
    baseRef.current = st;
    setGame(st);
    setLevel(lvl);
  }, [level]);

  const move = useCallback((dir) => {
    setGame((prev) => {
      if (!prev || prev.status !== 'playing') return prev;
      return applyMove(prev, dir);
    });
  }, []);

  const setMode = useCallback((hard) => {
    setHardMode(hard);
    reset();
  }, [reset]);

  // 键盘控制
  useEffect(() => {
    const onKey = (e) => {
      const dir = DIR_KEY[e.key];
      if (dir) { e.preventDefault(); move(dir); return; }
      const k = e.key.toLowerCase();
      if (k === 'r') reset();
      else if (k === 'm') setMode(!hardMode);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, reset, setMode, hardMode]);

  const playing = game && game.status === 'playing';
  // 困难模式：进行中只显示初始快照；到终点/失败才显示结果
  const shown = hardMode && playing ? baseRef.current : game;

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <h1>贪吃蛇</h1>
          <span className="sub">迷宫逃生</span>
        </div>
        <div className="toolbar">
          <button className={`btn ${hardMode ? 'primary' : ''}`} onClick={() => setMode(!hardMode)}>
            模式：{hardMode ? '困难' : '简单'}
          </button>
          <button className="btn" onClick={() => reset()}>重置</button>
        </div>
      </header>

      <div className="layout">
        <div className="stage">
          <Board state={shown} />
        </div>
        <Panel
          game={game}
          hardMode={hardMode}
          onMode={() => setMode(!hardMode)}
        />
      </div>

      {!playing && <Overlay game={game} onReset={() => reset()} />}
    </main>
  );
}
