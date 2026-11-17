export default function FuelIndicator({ fuel, state }) {
  const percent = Math.max(0, Math.min(100, fuel));
  const low = percent <= 30;

  return (
    <div className={`fuel-indicator ${low ? 'warning' : ''}`}>
      <div className="fuel-head">
        <span>Fuel</span>
        <strong>{Math.round(percent)}%</strong>
      </div>
      <div className="meter">
        <div className="meter-fill fuel-fill" style={{ width: `${percent}%` }}></div>
      </div>
      {low && state !== 'FAILED' && <div className="warning-text">Generator fuel critically low</div>}
    </div>
  );
}
