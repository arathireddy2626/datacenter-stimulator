export default function ScenarioPanel({ scenarios, selectedScenario, setSelectedScenario, startScenario }) {
  return (
    <div className="panel glass-panel">
      <div className="panel-title-row">
        <h3>Simulation Scenarios</h3>
      </div>

      <div className="scenario-list">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            className={`scenario-option ${selectedScenario?.id === scenario.id ? 'selected' : ''}`}
            onClick={() => setSelectedScenario(scenario)}
          >
            {scenario.title}
          </button>
        ))}
      </div>

      {selectedScenario && (
        <div className="scenario-detail">
          <div className="scenario-heading">SCENARIO: {selectedScenario.title}</div>
          <p>{selectedScenario.description}</p>
          <button className="scenario-start" onClick={startScenario}>Start Scenario</button>
        </div>
      )}
    </div>
  );
}
