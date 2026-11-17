import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { INFO } from './equipInfo';
import { KIND_CATEGORY } from './data';
import { MiniCube } from './Equip3D';
import TopoCanvas, { H, NH, NW, W, iconOf, labelOf } from './TopoCanvas';

const CATEGORIES = ['Critical infrastructure', 'Cooling', 'IT operations', 'Safety', 'Other'];
const slug = (text) =>
  text
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 10) || 'ITEM';
const suffix = () => Math.random().toString(36).slice(2, 5).toUpperCase();
const short = (text, n) => (text.length > n ? text.slice(0, n - 1) + '…' : text);

// "+ Add equipment": define a new kind of equipment that then appears in the catalog.
function AddTypeForm({ d, onDone }) {
  const blank = { label: '', category: CATEGORIES[0], what: '', normal: '', fail: '' };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const add = (e) => {
    e.preventDefault();
    if (form.label.trim().length < 2 || !form.what.trim()) {
      return setError('Give the equipment a name and say what it does.');
    }
    const key = `custom-${slug(form.label).toLowerCase()}-${suffix().toLowerCase()}`;
    d({ t: 'type', type: { ...form, key, label: form.label.trim() } });
    onDone();
  };

  return (
    <form className="pt-field pt-addtype" onSubmit={add} noValidate>
      <input
        value={form.label}
        onChange={set('label')}
        placeholder="Name, for example Flywheel UPS"
        aria-label="Equipment name"
      />
      <select value={form.category} onChange={set('category')} aria-label="Category">
        {CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input value={form.what} onChange={set('what')} placeholder="What it does" aria-label="What it does" />
      <input
        value={form.normal}
        onChange={set('normal')}
        placeholder="Normal reading"
        aria-label="Normal reading"
      />
      <input value={form.fail} onChange={set('fail')} placeholder="If it fails" aria-label="If it fails" />
      {error && (
        <p className="pt-err" role="alert">
          {error}
        </p>
      )}
      <div className="pt-actions">
        <button className="pt-btn">Add to catalog</button>
        <button type="button" className="pt-btn ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// Lists every connection so each one can be changed or deleted on its own.
function ConnectionsEditor({ topo, save, selected, onSelect }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const same = (l, a, b) => (l.from === a && l.to === b) || (l.from === b && l.to === a);
  const taken = (a, b, skip) => topo.links.some((l, i) => i !== skip && same(l, a, b));
  const options = topo.nodes.map((n) => (
    <option key={n.id} value={n.id}>
      {n.name}
    </option>
  ));

  const change = (i, key, value) => {
    const link = { ...topo.links[i], [key]: value };
    if (link.from === link.to || taken(link.from, link.to, i))
      return setNote('Choose two different items that are not already connected.');
    setNote('');
    save({ ...topo, links: topo.links.map((l, j) => (j === i ? link : l)) });
  };
  const add = () => {
    if (!from || !to || from === to || taken(from, to, -1))
      return setNote('Choose two different items that are not already connected.');
    setNote('');
    save({ ...topo, links: [...topo.links, { from, to }] });
    setFrom('');
    setTo('');
  };
  const remove = (i) => {
    save({ ...topo, links: topo.links.filter((_, j) => j !== i) });
    onSelect(null);
  };

  return (
    <div className="pt-conns">
      <h4>Connections ({topo.links.length})</h4>
      <div className="pt-conn">
        <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="New connection from">
          <option value="">From...</option>
          {options}
        </select>
        <span aria-hidden>to</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="New connection to">
          <option value="">To...</option>
          {options}
        </select>
        <button className="pt-btn" onClick={add}>
          Add connection
        </button>
      </div>
      {note && (
        <p className="pt-err" role="alert">
          {note}
        </p>
      )}
      {topo.links.length === 0 && (
        <p className="pt-empty">No connections yet. Add one above, or use Connect items on the grid.</p>
      )}
      {topo.links.map((l, i) => (
        <div key={i} className={`pt-conn ${selected === i ? 'on' : ''}`} onClick={() => onSelect(i)}>
          <select
            value={l.from}
            onChange={(e) => change(i, 'from', e.target.value)}
            aria-label="Connection from"
          >
            {options}
          </select>
          <span aria-hidden>to</span>
          <select value={l.to} onChange={(e) => change(i, 'to', e.target.value)} aria-label="Connection to">
            {options}
          </select>
          <button className="pt-btn ghost danger" onClick={() => remove(i)}>
            Delete connection
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Topologies({ s, d }) {
  const [selected, setSelected] = useState(s.topologies[0]?.id || '');
  const [armed, setArmed] = useState(null); // catalog item picked for click-to-place
  const [adding, setAdding] = useState(false);
  const [connect, setConnect] = useState(false);
  const [from, setFrom] = useState(null);
  const [drag, setDrag] = useState(null);
  const [selLink, setSelLink] = useState(null);
  const [catalogQuery, setCatalogQuery] = useState('');
  const host = useRef(null);
  const topo = s.topologies.find((t) => t.id === selected) || s.topologies[0];
  const kinds = Object.keys(INFO);
  const save = (next) => d({ t: 'topo', topo: next });

  const create = () => {
    const next = { id: 't' + Date.now(), name: `Topology ${s.topologies.length + 1}`, nodes: [], links: [] };
    save(next);
    setSelected(next.id);
  };
  // The designer is always ready to use: the first time, start a blank topology.
  useEffect(() => {
    if (!s.topologies.length) create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const used = (key) => s.topologies.some((t) => t.nodes.some((n) => n.kind === key));
  const at = (n) => (drag && drag.id === n.id ? drag : n);

  const toPos = (e) => {
    const r = host.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(W - NW, ((e.clientX - r.left) * W) / r.width - NW / 2)),
      y: Math.max(0, Math.min(H - NH, ((e.clientY - r.top) * H) / r.height - NH / 2)),
    };
  };
  const place = (kind, pos) => {
    const i = topo.nodes.length;
    const count = topo.nodes.filter((n) => n.kind === kind).length + 1;
    const node = {
      id: `${slug(labelOf(kind))}-${suffix()}`,
      name: `${labelOf(kind)} ${count}`,
      kind,
      ...(pos || { x: 30 + (i % 5) * 170, y: 30 + Math.floor(i / 5) * 110 }),
    };
    save({ ...topo, nodes: [...topo.nodes, node] });
  };
  const rename = (n) => {
    const name = window.prompt('Name for this equipment', n.name);
    if (name && name.trim()) {
      save({ ...topo, nodes: topo.nodes.map((x) => (x.id === n.id ? { ...x, name: name.trim() } : x)) });
    }
  };
  const clickNode = (n) => {
    if (!connect) return;
    if (!from) return setFrom(n.id);
    const exists = topo.links.some(
      (l) => (l.from === from && l.to === n.id) || (l.from === n.id && l.to === from),
    );
    if (from !== n.id && !exists) save({ ...topo, links: [...topo.links, { from, to: n.id }] });
    setFrom(null);
  };
  const down = (e, n) => {
    if (connect) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ id: n.id, ...toPos(e) });
  };
  const up = () => {
    if (!drag) return;
    save({ ...topo, nodes: topo.nodes.map((n) => (n.id === drag.id ? { ...n, x: drag.x, y: drag.y } : n)) });
    setDrag(null);
  };
  const drop = (e) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('text/kind');
    if (kind) place(kind, toPos(e));
  };
  const remove = (id) =>
    save({
      ...topo,
      nodes: topo.nodes.filter((n) => n.id !== id),
      links: topo.links.filter((l) => l.from !== id && l.to !== id),
    });
  const removeTopo = () => {
    if (!window.confirm(`Delete ${topo.name}?`)) return;
    d({ t: 'delTopo', id: topo.id });
    setSelected('');
  };
  const byId = topo ? Object.fromEntries(topo.nodes.map((n) => [n.id, n])) : {};
  const customKeys = new Set(s.types.map((t) => t.key));
  const catalogFilter = catalogQuery.trim().toLowerCase();
  const catalogKinds = kinds.filter(
    (k) =>
      !catalogFilter ||
      [labelOf(k), KIND_CATEGORY[k], INFO[k].normal, INFO[k].fail].join(' ').toLowerCase().includes(catalogFilter),
  );

  return (
    <div className="pt-designer">
      <aside className="pt-catalog">
        <div className="pt-cat-head">
          <h3>Equipment catalog</h3>
          <button className="pt-btn ghost" onClick={() => setAdding(!adding)}>
            {adding ? 'Close' : '+ Add equipment'}
          </button>
        </div>
        <input
          type="search"
          value={catalogQuery}
          onChange={(e) => setCatalogQuery(e.target.value)}
          placeholder="Search equipment"
          aria-label="Search equipment"
        />
        {adding ? (
          <AddTypeForm d={d} onDone={() => setAdding(false)} />
        ) : (
          <p className="pt-empty">
            Drag a component onto the grid, or select one and click the grid to place it.
          </p>
        )}
        <div className="pt-cat-list">
          {catalogKinds.map((k) => {
            const Icon = iconOf(k);
            return (
              <div key={k} className={`pt-pal-wrap ${armed === k ? 'armed' : ''}`}>
                <button
                  className="pt-pal-item"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/kind', k)}
                  onClick={() => setArmed(armed === k ? null : k)}
                  aria-pressed={armed === k}
                >
                  <MiniCube kind={k} />
                  <span>
                    <b>
                      <Icon size={13} /> {labelOf(k)}
                    </b>
                    <small>
                      {KIND_CATEGORY[k] || 'Critical infrastructure'} •{' '}
                      {short(INFO[k].normal || 'Custom', 26)}
                    </small>
                  </span>
                </button>
                {customKeys.has(k) && (
                  <button
                    className="pt-pal-del"
                    aria-label={`Delete ${labelOf(k)}`}
                    disabled={used(k)}
                    title={used(k) ? 'Used in a topology' : 'Delete from catalog'}
                    onClick={() => d({ t: 'delType', key: k })}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <section className="pt-blueprint">
        <div className="pt-cat-head">
          <h3>Topology blueprint designer</h3>
          <span className="pt-hint">
            {armed ? (
              <>
                Click anywhere on the grid to place: <b>{labelOf(armed)}</b>
              </>
            ) : (
              'Drag from the catalog onto the grid'
            )}
          </span>
        </div>
        <div className="pt-filter">
          <select
            value={topo?.id || ''}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Choose a topology"
          >
            {s.topologies.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="pt-btn ghost" onClick={create}>
            New topology
          </button>
          {topo && (
            <>
              <input
                className="pt-nameinput"
                key={topo.id}
                defaultValue={topo.name}
                aria-label="Topology name"
                onBlur={(e) => e.target.value.trim() && save({ ...topo, name: e.target.value.trim() })}
              />
              <span className={`pt-pill ${topo.published ? 'normal' : 'warning'}`}>
                {topo.published ? 'Published' : 'Draft'}
              </span>
              <button
                className={`pt-btn ghost ${connect ? 'on' : ''}`}
                onClick={() => {
                  setConnect(!connect);
                  setFrom(null);
                }}
              >
                {connect ? (from ? 'Pick the second item' : 'Pick the first item') : 'Connect items'}
              </button>
              <button className="pt-btn" onClick={() => save({ ...topo, published: !topo.published })}>
                {topo.published ? 'Unpublish' : 'Publish to instructors and students'}
              </button>
              <button className="pt-btn ghost danger" onClick={removeTopo}>
                Delete
              </button>
            </>
          )}
        </div>
        {topo ? (
          <>
            <TopoCanvas
              topo={topo}
              selectedLink={selLink}
              onLinkClick={setSelLink}
              at={at}
              picked={from}
              hostRef={host}
              onNodeClick={clickNode}
              onNodeDown={down}
              onNodeRename={rename}
              onMove={(e) => drag && setDrag({ id: drag.id, ...toPos(e) })}
              onUp={up}
              onDropKind={drop}
              onCanvasClick={(e) => armed && !connect && place(armed, toPos(e))}
            />
            <p className="pt-empty">
              {connect
                ? 'Click two items to join them with a cable.'
                : 'Drag items to move them. Double-click an item to rename it. Changes save as you go.'}
            </p>
            <ConnectionsEditor topo={topo} save={save} selected={selLink} onSelect={setSelLink} />
            <div className="pt-chips">
              {topo.nodes.map((n) => (
                <span className="pt-chipx" key={n.id}>
                  {n.name}
                  <button type="button" aria-label={`Remove ${n.name}`} onClick={() => remove(n.id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          </>
        ) : (
          <button className="pt-btn" onClick={create}>
            Start a new topology
          </button>
        )}
      </section>
    </div>
  );
}
