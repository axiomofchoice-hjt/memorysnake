export default function Overlay({ game, onReset }) {
  const won = game.status === 'won';
  const reason = game.reason === 'wall' ? '撞到墙' : '撞到自己';

  return (
    <div className="overlay">
      <div className={`ov-card ${won ? 'win' : 'lose'}`}>
        <div className="ov-title">{won ? '🎉 到达终点！' : '💥 失败'}</div>
        <div className="ov-reason">{won ? '成功抵达终点' : `原因：${reason}`}</div>
        <div className="ov-sub">用时 {game.moves} 步</div>
        <button className={`btn ${won ? 'primary' : ''}`} onClick={onReset}>再次挑战</button>
      </div>
    </div>
  );
}
