import { useEffect, useState } from 'react';
import { INTERNALS } from './internals';
import { useStore } from './store';
import Interior3D from './Interior3D';

// "Open inside": the learning screen around the 3D interior. Learn mode shows every label; quiz mode hides them.
export default function InsideView({ kind, name, onBack }) {
  const def = INTERNALS[kind];
  const [, d] = useStore();
  const [mode, setMode] = useState('learn');
  const [showLabels, setShowLabels] = useState(true);
  const [sel, setSel] = useState(null);
  const [answers, setAnswers] = useState({});
  const [guess, setGuess] = useState('');
  const uid = sessionStorage.getItem('equnix-session');
  const log = (detail) => d({ t: 'log', uid, type: 'inspect', detail });
  useEffect(() => {
    log(`Opened the inside of ${name}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const part = (id) => def.parts.find((p) => p.id === id);
  const wire = sel?.type === 'wire' ? def.wires.find((w) => w.id === sel.id) : null;
  const picked = sel?.type === 'part' ? part(sel.id) : null;
  const options = [...def.wires].map((w) => w.label).sort();
  const right = Object.values(answers).filter((v) => v === 'right').length;

  const pick = (item) => {
    setSel(item);
    setGuess('');
    if (mode === 'learn') {
      const label = item.type === 'wire' ? def.wires.find((w) => w.id === item.id).label : part(item.id).name;
      log(`Inspected ${label} inside ${name}`);
    }
  };
  const check = () => {
    const ok = guess === wire.label;
    setAnswers({ ...answers, [wire.id]: ok ? 'right' : answers[wire.id] === 'right' ? 'right' : 'wrong' });
    log(
      `Quiz inside ${name}: wire ${def.wires.indexOf(wire) + 1} answered ${ok ? 'correctly' : 'incorrectly'}`,
    );
  };
  const switchMode = (next) => {
    setMode(next);
    setSel(null);
    setAnswers({});
  };

  return (
    <div className="pt-inside-wrap">
      <div className="pt-cat-head">
        <h3>Inside {name}</h3>
        <div className="pt-filter">
          <button
            className={`pt-btn ghost ${mode === 'learn' ? 'on' : ''}`}
            onClick={() => switchMode('learn')}
          >
            Learn
          </button>
          <button
            className={`pt-btn ghost ${mode === 'quiz' ? 'on' : ''}`}
            onClick={() => switchMode('quiz')}
          >
            Quiz me
          </button>
          {mode === 'learn' && (
            <button className="pt-btn ghost" onClick={() => setShowLabels(!showLabels)}>
              {showLabels ? 'Hide wire labels' : 'Show wire labels'}
            </button>
          )}
          <button className="pt-btn" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
      <div className="pt-inside">
        <Interior3D
          kind={kind}
          mode={mode}
          showLabels={showLabels}
          selected={sel?.id || null}
          answers={answers}
          onPick={pick}
        />
        <aside className="pt-inside-side">
          {mode === 'quiz' && (
            <p className="pt-score">
              Score: {right} of {def.wires.length} wires named
            </p>
          )}
          {!sel && (
            <p className="pt-empty">
              {mode === 'quiz'
                ? 'Click a numbered wire and choose what it is.'
                : 'Click any wire or part to see what it does. Drag to rotate and scroll to zoom.'}
            </p>
          )}
          {picked && (
            <div>
              <h4>{picked.name}</h4>
              <p>{picked.desc}</p>
            </div>
          )}
          {wire && (mode === 'learn' || answers[wire.id] === 'right') && (
            <div>
              <h4>
                <span className="pt-swatch" style={{ background: wire.color }} />
                {wire.label}
              </h4>
              <p>
                <b>Connects:</b> {part(wire.from).name} to {part(wire.to).name}
              </p>
              <p>
                <b>Carries:</b> {wire.carries}
              </p>
              <p>
                <b>If it fails:</b> {wire.fail}
              </p>
            </div>
          )}
          {wire && mode === 'quiz' && answers[wire.id] !== 'right' && (
            <div className="pt-field">
              <h4>Wire {def.wires.indexOf(wire) + 1}</h4>
              <p>
                <b>Connects:</b> {part(wire.from).name} to {part(wire.to).name}
              </p>
              <label>
                What is this wire?
                <select value={guess} onChange={(e) => setGuess(e.target.value)}>
                  <option value="">Choose a name</option>
                  {options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <button className="pt-btn" disabled={!guess} onClick={check}>
                Check
              </button>
              {answers[wire.id] === 'wrong' && (
                <p className="pt-err">Not that one. Look at what it connects and try again.</p>
              )}
            </div>
          )}
          <h4>All wires</h4>
          <ul className="pt-wirelist">
            {def.wires.map((w, i) => (
              <li key={w.id}>
                <button
                  className={sel?.id === w.id ? 'on' : ''}
                  onClick={() => pick({ type: 'wire', id: w.id })}
                >
                  <span className="pt-swatch" style={{ background: w.color }} />
                  {mode === 'learn'
                    ? `${w.label}: ${part(w.from).name} to ${part(w.to).name}`
                    : `Wire ${i + 1}: ${part(w.from).name} to ${part(w.to).name}${answers[w.id] === 'right' ? ' (done)' : ''}`}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
