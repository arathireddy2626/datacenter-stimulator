import { useEffect, useState } from 'react';
import { INFO } from './equipInfo';
import { Pill } from './ui';

// A simple 3D model built from CSS faces. It stands in for a real photo or model of the equipment.
import { INTERNALS } from './internals';
import InsideView from './InsideView';

// A simple 3D model built from CSS faces. If the equipment has an inside, clicking the model opens it.
export function Box3D({ kind, name, status, onOpen }) {
  return (
    <div
      className={`pt-3d ${onOpen ? 'openable' : ''}`}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(e) => onOpen && e.key === 'Enter' && onOpen()}
      title={onOpen ? 'Click to open it and see inside' : undefined}
    >
      <div className={`pt-cube k-${kind}`}>
        <div className="pt-face f">
          <span className={`pt-led ${status}`} />
          <span className="pt-plate">{name}</span>
        </div>
        <div className="pt-face b" />
        <div className="pt-face l" />
        <div className="pt-face r" />
        <div className="pt-face t" />
      </div>
      {onOpen && <span className="pt-open-hint">Click to open</span>}
    </div>
  );
}

// A small rotating model used on the topology canvas and in the equipment palette.
export function MiniCube({ kind, status = 'normal' }) {
  return (
    <div className="pt-mini">
      <div className={`pt-cube k-${kind}`}>
        <div className="pt-face f">
          <span className={`pt-led ${status}`} />
        </div>
        <div className="pt-face b" />
        <div className="pt-face l" />
        <div className="pt-face r" />
        <div className="pt-face t" />
      </div>
    </div>
  );
}

export function EquipModal({ node, status, action, actions, onDo, onClose }) {
  const list = actions || (action ? [action] : []);
  const info = INFO[node.key];
  const [inside, setInside] = useState(false);
  const canOpen = Boolean(INTERNALS[node.key]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (inside) {
    return (
      <div className="pt-modal" onClick={onClose}>
        <div
          className="pt-sheet one wide"
          role="dialog"
          aria-label={`Inside ${node.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <InsideView kind={node.key} name={node.name} onBack={() => setInside(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-modal" onClick={onClose}>
      <div className="pt-sheet" role="dialog" aria-label={node.name} onClick={(e) => e.stopPropagation()}>
        <Box3D
          kind={node.key}
          name={node.name}
          status={status}
          onOpen={canOpen ? () => setInside(true) : undefined}
        />
        <div className="pt-sheet-info">
          <h3>
            {node.name} <Pill s={status} />
          </h3>
          <p className="pt-empty">{info.title}</p>
          <dl>
            <dt>What it does</dt>
            <dd>{info.what}</dd>
            <dt>Normal reading</dt>
            <dd>{info.normal}</dd>
            <dt>If it fails</dt>
            <dd>{info.fail}</dd>
          </dl>
          <div className="pt-actions">
            {canOpen && (
              <button className="pt-btn" onClick={() => setInside(true)}>
                Open inside
              </button>
            )}
            {list.map(
              (item) =>
                !item.done && (
                  <button key={item.id} className="pt-btn" onClick={() => onDo(item.id)}>
                    {item.label}
                  </button>
                ),
            )}
            <button className="pt-btn ghost" onClick={onClose}>
              Close
            </button>
          </div>
          <small className="pt-empty">Typical values for training. Your site may differ.</small>
        </div>
      </div>
    </div>
  );
}
