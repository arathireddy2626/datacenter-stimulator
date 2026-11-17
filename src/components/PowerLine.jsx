export default function PowerLine({ active, label, tone = 'main', className = '' }) {
  return (
    <div className={`power-line ${active ? 'active' : ''} ${tone} ${className}`}>
      <span className="line-label">{label}</span>
      <div className="line-track">
        <div className="line-core"></div>
      </div>
    </div>
  );
}
