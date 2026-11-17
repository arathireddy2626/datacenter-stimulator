export default function Legend() {
  const items = [
    { label: 'Active / Healthy', color: 'green' },
    { label: 'Failed / Offline', color: 'red' },
    { label: 'Starting / Transition', color: 'orange' },
    { label: 'Charging', color: 'blue' },
    { label: 'Warning', color: 'yellow' },
    { label: 'Off', color: 'dark' }
  ];

  return (
    <div className="legend glass-panel">
      <h4>Legend</h4>
      <div className="legend-grid">
        {items.map((item) => (
          <div className="legend-item" key={item.label}>
            <span className={`dot ${item.color}`}></span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
