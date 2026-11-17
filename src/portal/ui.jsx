import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { FAIL } from './data';

const SEV = {
  normal: ['●', 'Normal'],
  warning: ['▲', 'Warning'],
  critical: ['■', 'Alarm'],
};
const rank = { normal: 0, warning: 1, critical: 2 };
export const Pill = ({ s }) => (
  <span className={`pt-pill ${s}`}>
    <i aria-hidden>{SEV[s][0]}</i>
    {SEV[s][1]}
  </span>
);
export const when = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const alarmMap = (tickets) => {
  const m = {};
  tickets.forEach((t) => {
    const v = FAIL[t.failId].sev;
    if (m[t.equipId] !== 'critical') m[t.equipId] = v;
  });
  return m;
};
const worst = (e, m) =>
  e.children.reduce((a, c) => {
    const w = worst(c, m);
    return rank[w] > rank[a] ? w : a;
  }, m[e.id] || 'normal');

export const Tabs = ({ tabs, value, onChange }) => (
  <nav className="pt-tabs" role="tablist">
    {tabs.map(([k, label, badge]) => (
      <button
        key={k}
        role="tab"
        aria-selected={value === k}
        className={value === k ? 'on' : ''}
        onClick={() => onChange(k)}
      >
        {label}
        {badge ? <b>{badge}</b> : null}
      </button>
    ))}
  </nav>
);

export function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="pt-clock">{now.toLocaleTimeString([], { hour12: false })}</span>;
}

export function ThemeToggle({ theme, onToggle }) {
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="pt-btn ghost pt-theme" onClick={onToggle} aria-label={`Switch to ${next} mode`}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}

export const Brand = () => (
  <div className="pt-brand">
    <span className="pt-logo" aria-hidden />
    <b>EQUINIX</b>
    <span className="pt-brand-sub">SIMULATOR</span>
  </div>
);

export const Top = ({ user, onOut, theme, onToggle }) => (
  <header className="pt-top">
    <Brand />
    <div className="pt-who">
      <span className="pt-live">
        <i aria-hidden />
        Live <Clock />
      </span>
      <span className="pt-role">{user.role}</span>
      <span className="pt-avatar" aria-hidden>
        {user.name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)}
      </span>
      <span className="pt-name">{user.name}</span>
      <ThemeToggle theme={theme} onToggle={onToggle} />
      <button className="pt-btn ghost" onClick={onOut}>
        Sign out
      </button>
    </div>
  </header>
);

export const Banner = ({ icon: Icon, sub, children }) => (
  <section className="pt-banner">
    <span className="pt-banner-ico">
      <Icon size={26} />
    </span>
    <div>
      <h2 className="pt-h">{children}</h2>
      <p>{sub}</p>
    </div>
  </section>
);

const matches = (e, q) =>
  e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.children.some((c) => matches(c, q));

function Row({ e, m, tickets, depth, q, onlyProblems }) {
  const status = worst(e, m);
  const [open, setOpen] = useState(status !== 'normal' && e.children.length > 0);
  if ((q && !matches(e, q)) || (onlyProblems && status === 'normal')) return null;
  const kids = e.children.filter((c) => (!q || matches(c, q)) && (!onlyProblems || worst(c, m) !== 'normal'));
  const expanded = open || Boolean(q) || onlyProblems;
  return (
    <li>
      <div className={`pt-row2 ${status}`} style={{ paddingLeft: 12 + depth * 22 }}>
        {e.children.length ? (
          <button
            className="pt-tw"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${e.name}`}
            onClick={() => setOpen(!open)}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="pt-tw" />
        )}
        <span className="pt-nm">{e.name}</span>
        {e.children.length > 0 && <span className="pt-sub">{e.children.length} parts</span>}
        <span className="pt-row2-tags">
          {tickets
            .filter((t) => t.equipId === e.id)
            .map((t) => (
              <span key={t.id} className="pt-tag">
                {FAIL[t.failId]?.title}
              </span>
            ))}
        </span>
        <Pill s={status} />
      </div>
      {expanded && kids.length > 0 && (
        <ul>
          {kids.map((c) => (
            <Row
              key={c.id}
              e={c}
              m={m}
              tickets={tickets}
              depth={depth + 1}
              q={q}
              onlyProblems={onlyProblems}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// Equipment status board: totals, search, a problems-only filter and one card per area.
export function EquipTree({ nodes, tickets }) {
  const m = alarmMap(tickets);
  const [query, setQuery] = useState('');
  const [onlyProblems, setOnlyProblems] = useState(false);
  const q = query.trim().toLowerCase();
  const counts = { normal: 0, warning: 0, critical: 0 };
  const count = (e) => {
    if (e.kind !== 'group') counts[m[e.id] || 'normal'] += 1;
    e.children.forEach(count);
  };
  nodes.forEach(count);
  const cards = nodes.filter((g) => (!q || matches(g, q)) && (!onlyProblems || worst(g, m) !== 'normal'));

  return (
    <div>
      <div className="pt-eqhead">
        <div className="pt-eqsum">
          {[
            ['normal', 'Normal'],
            ['warning', 'Warnings'],
            ['critical', 'Alarms'],
          ].map(([k, label]) => (
            <div key={k} className={`pt-eqstat ${k}`}>
              <b>{counts[k]}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="pt-eqtools">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search equipment"
            aria-label="Search equipment"
          />
          <button
            className={`pt-btn ghost ${onlyProblems ? 'on' : ''}`}
            onClick={() => setOnlyProblems(!onlyProblems)}
          >
            {onlyProblems ? 'Showing problems only' : 'Show problems only'}
          </button>
        </div>
      </div>
      {cards.length === 0 ? (
        <p className="pt-empty">Nothing matches.</p>
      ) : (
        <div className="pt-eqgrid">
          {cards.map((g) => (
            <section key={g.id} className={`pt-eqcard ${worst(g, m)}`}>
              <header>
                <h4>{g.name}</h4>
                <Pill s={worst(g, m)} />
              </header>
              <ul className="pt-tree">
                {g.children.map((c) => (
                  <Row key={c.id} e={c} m={m} tickets={tickets} depth={0} q={q} onlyProblems={onlyProblems} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// A form field with a red star for required fields and an error message under it.
export const Field = ({ label, error, children }) => (
  <label className={error ? 'pt-invalid' : ''}>
    <span>
      {label}{' '}
      <b className="pt-req" aria-hidden>
        *
      </b>
    </span>
    {children}
    {error && (
      <small className="pt-fielderr" role="alert">
        {error}
      </small>
    )}
  </label>
);
