export default function ControlPanel({
  onFailMain,
  onRestoreMain,
  onGeneratorReady,
  onGeneratorFailure,
  onGeneratorOutOfFuel,
  onDrainBattery,
  onReset,
  onToggleAuto,
  automaticMode,
  mainPower,
  generator,
  battery
}) {
  const buttons = [
    { label: 'Fail Main Power', action: onFailMain, disabled: mainPower.state === 'OFF' },
    { label: 'Restore Main Power', action: onRestoreMain, disabled: mainPower.state === 'ON' },
    { label: 'Generator Ready', action: onGeneratorReady, disabled: generator.state === 'RUNNING' || generator.state === 'READY' },
    { label: 'Generator Failure', action: onGeneratorFailure, disabled: generator.state === 'FAILED' },
    { label: 'Generator Out of Fuel', action: onGeneratorOutOfFuel, disabled: generator.state === 'FAILED' },
    { label: 'Drain Battery', action: onDrainBattery, disabled: battery.charge <= 0 },
    { label: 'Reset System', action: onReset }
  ];

  return (
    <div className="panel glass-panel">
      <div className="panel-title-row">
        <h3>Control Panel</h3>
      </div>

      <div className="button-grid">
        {buttons.map((button) => (
          <button
            key={button.label}
            className="action-button"
            onClick={button.action}
            disabled={button.disabled}
            aria-label={button.label}
          >
            {button.label}
          </button>
        ))}
      </div>

      <div className="toggle-wrap">
        <label className="switch">
          <input type="checkbox" checked={automaticMode} onChange={onToggleAuto} />
          <span className="slider"></span>
        </label>
        <span>Automatic Mode</span>
      </div>
    </div>
  );
}
