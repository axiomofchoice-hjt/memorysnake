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
        <div className="status-line"><span className="label">步数</span><span className="val">{blind ? '—' : game.moves}</span></div>
        {!hardMode && <div className="status-line"><span className="label">无效操作</span><span className="val">{game.invalid}</span></div>}
      </div>

      <div className="card">
        <div className="legend-title">图例</div>
        <div className="legend"><i className="sw head" />蛇头</div>
        <div className="legend"><i className="sw body" />蛇身</div>
        <div className="legend"><i className="sw wall" />墙</div>
        <div className="legend"><i className="sw floor" />地板</div>
        <div className="legend"><i className="sw dest" />终点 · D</div>
        <div className="legend"><i className="sw door" />门 · X（吃钥匙后开）</div>
        <div className="legend"><i className="sw key" />钥匙</div>
      </div>

      <div className="card">
        <div className="legend-title">操作</div>
        <div className="hint"><kbd>WASD</kbd> / <kbd>方向键</kbd> 移动（一次一格）</div>
        <div className="hint"><kbd>R</kbd> 重置</div>
        <div className="hint"><kbd>M</kbd> 切换简单 / 困难</div>
        <div className="hint"><kbd>1</kbd>–<kbd>2</kbd> 切换关卡</div>
        <div className="hint">终点是 <kbd>D</kbd>；门（大写字母）吃对应钥匙前是墙，吃到钥匙后开门变地板。钥匙与门外观相同、匹配隐藏。</div>
        <div className="hint mode-note">
          {hardMode
            ? '困难模式：隐藏移动过程，只显示初始状态；到达终点或失败（撞墙/撞自己）才显示结果。'
            : '简单模式：实时显示移动；撞墙/撞自己不算失败，记为一次无效操作（蛇不动）。'}
        </div>
      </div>
    </aside>
  );
}
