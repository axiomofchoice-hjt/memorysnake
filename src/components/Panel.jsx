export default function Panel({ game, hardMode }) {
  const blind = hardMode && game.status === 'playing';
  const statusText = game.status === 'won' ? '到达终点'
    : game.status === 'lost' ? '失败'
    : blind ? '进行中 · 盲走' : '进行中';

  return (
    <aside className="panel">
      <div className="card">
        <div className="legend-title">状态</div>
        <div className="status-line"><span className="label">状态</span><span className={`val ${game.status}`} id="statusText">{statusText}</span></div>
        <div className="status-line"><span className="label">步数</span><span className="val">{game.moves}</span></div>
      </div>

      <div className="card">
        <div className="legend-title">图例</div>
        <div className="legend"><i className="sw head" />蛇头</div>
        <div className="legend"><i className="sw body" />蛇身</div>
        <div className="legend"><i className="sw wall" />墙</div>
        <div className="legend"><i className="sw floor" />地板</div>
        <div className="legend"><i className="sw dest" />终点</div>
        <div className="legend"><i className="sw door" />门（吃钥匙后开）</div>
        <div className="legend"><i className="sw key" />钥匙</div>
      </div>

      <div className="card">
        <div className="legend-title">操作</div>
        <div className="hint"><kbd>WASD</kbd> / <kbd>方向键</kbd> 移动</div>
        <div className="hint"><kbd>R</kbd> 重新开始</div>
        <div className="hint"><kbd>M</kbd> 切换简单 / 困难模式</div>
        <div className="hint"><kbd>1</kbd>–<kbd>9</kbd> 切换关卡</div>
        <div className="hint mode-note">困难模式：不显示移动，撞墙/撞身体即失败。</div>
      </div>
    </aside>
  );
}
