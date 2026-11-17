import { createContext, useContext, useEffect, useReducer } from 'react';
import { DEFAULT_FAILURES, FAIL, FAILURES, GROUPS, USERS } from './data';
import { SIM_ACTIONS } from './sim';
import { syncCatalog } from './catalog';
import { DEFAULT_TOPOLOGY } from './power';

const KEY = 'equnix-v5';
const load = () => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) return s;
  } catch {}
  return {
    users: USERS,
    groups: GROUPS,
    failures: DEFAULT_FAILURES,
    types: [],
    topologies: [],
    delegations: [],
    tickets: [],
    resp: {},
    acts: {},
    activity: [],
    seq: 1041,
  };
};

function baseReduce(s, a) {
  switch (a.t) {
    case 'sync':
      return a.s;
    case 'raise': {
      let seq = s.seq;
      const add = a.items.map((i) => ({
        id: 'TKT-' + ++seq,
        by: a.by,
        groupId: a.groupId,
        at: Date.now(),
        ...i,
      }));
      return { ...s, seq, tickets: [...s.tickets, ...add] };
    }
    case 'clear': {
      const gone = s.tickets.filter((t) => t.by === a.by).map((t) => t.id);
      return {
        ...s,
        tickets: s.tickets.filter((t) => t.by !== a.by),
        acts: Object.fromEntries(
          Object.entries(s.acts || {}).filter(([k]) => !gone.includes(k.split(':')[0])),
        ),
        resp: Object.fromEntries(Object.entries(s.resp).filter(([k]) => !gone.includes(k.split(':')[0]))),
      };
    }
    case 'group':
      return {
        ...s,
        groups: s.groups.some((g) => g.id === a.g.id)
          ? s.groups.map((g) => (g.id === a.g.id ? a.g : g))
          : [...s.groups, a.g],
      };
    case 'delGroup':
      return { ...s, groups: s.groups.filter((g) => g.id !== a.id) };
    case 'setPlay':
      return { ...s, plays: { ...(s.plays || {}), [a.key]: a.play } };
    case 'setFaults':
      return { ...s, faults: a.faults };
    case 'type':
      return { ...s, types: [...s.types, a.type] };
    case 'delType':
      return { ...s, types: s.types.filter((t) => t.key !== a.key) };
    case 'topo':
      return {
        ...s,
        topologies: s.topologies.some((t) => t.id === a.topo.id)
          ? s.topologies.map((t) => (t.id === a.topo.id ? a.topo : t))
          : [...s.topologies, a.topo],
      };
    case 'delTopo':
      return { ...s, topologies: s.topologies.filter((t) => t.id !== a.id) };
    case 'delegate':
      return { ...s, delegations: [...(s.delegations || []), a.x] };
    case 'delegateToggle':
      return {
        ...s,
        delegations: s.delegations.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x)),
      };
    case 'delegateDelete':
      return { ...s, delegations: s.delegations.filter((x) => x.id !== a.id) };
    case 'redeem':
      return {
        ...s,
        delegations: s.delegations.map((x) =>
          x.id === a.id ? { ...x, redeemedAt: Date.now(), active: true } : x,
        ),
      };
    case 'request':
      return { ...s, requests: [...(s.requests || []), a.r] };
    case 'requestDone':
      return {
        ...s,
        requests: s.requests.map((r) =>
          r.id === a.id ? { ...r, status: a.status, reason: a.reason, decidedAt: Date.now() } : r,
        ),
      };
    case 'outboxUpdate':
      return { ...s, outbox: (s.outbox || []).map((m) => (m.id === a.id ? { ...m, ...a.patch } : m)) };
    case 'outbox':
      return { ...s, outbox: [a.mail, ...(s.outbox || [])] };
    case 'failure':
      return { ...s, failures: [...s.failures, a.f] };
    case 'delFailure':
      return { ...s, failures: s.failures.filter((f) => f.id !== a.id) };
    case 'act': {
      const k = a.tid + ':' + a.sid;
      const acts = s.acts || {};
      return {
        ...s,
        acts: { ...acts, [k]: [...(acts[k] || []), { id: a.id, at: Date.now(), note: a.note }] },
      };
    }
    case 'respond': {
      const k = a.tid + ':' + a.sid;
      return {
        ...s,
        resp: {
          ...s.resp,
          [k]: { ...s.resp[k], action: a.action, text: a.text, at: Date.now() },
        },
      };
    }
    case 'grade':
      return {
        ...s,
        resp: { ...s.resp, [a.key]: { ...s.resp[a.key], score: a.score, fb: a.fb } },
      };
    case 'user':
      return {
        ...s,
        users: s.users.some((x) => x.id === a.u.id)
          ? s.users.map((x) => (x.id === a.u.id ? a.u : x))
          : [...s.users, a.u],
      };
    default:
      return s;
  }
}

// Turns an action into a line for the activity log, or nothing if it is not worth recording.
function describe(a) {
  switch (a.t) {
    case 'log':
      return { uid: a.uid, type: a.type, detail: a.detail };
    case 'act':
      return { uid: a.sid, type: 'action', detail: `${SIM_ACTIONS[a.id]} (${a.tid})` };
    case 'respond':
      return {
        uid: a.sid,
        type: 'response',
        detail: `Submitted a response for ${a.tid}: ${a.action}`,
      };
    case 'raise':
      return { uid: a.by, type: 'launch', detail: `Launched ${a.items.length} alarm(s)` };
    case 'clear':
      return { uid: a.by, type: 'launch', detail: 'Cleared the environment' };
    default:
      return null;
  }
}

// The failure library lives in the state; the shared lists in data.js are kept in step with it.
// Removed failures stay in FAIL so alarms that already used them still display.
function syncLibrary(list) {
  if (!list) return;
  FAILURES.splice(0, FAILURES.length, ...list);
  list.forEach((f) => {
    FAIL[f.id] = f;
  });
}

function reduce(s, a) {
  const next = baseReduce(s, a);
  syncLibrary(next.failures);
  syncCatalog(next.types, next.topologies);
  const entry = describe(a);
  if (!entry) return next;
  const line = { id: `${Date.now()}-${Math.random()}`, at: Date.now(), ...entry };
  return { ...next, activity: [line, ...(next.activity || [])].slice(0, 1500) };
}

// Brings saved data from older versions up to date: new lists, and the original power design as the default topology.
function migrate(s) {
  s.requests = s.requests || [];
  s.outbox = s.outbox || [];
  s.topologies = s.topologies || [];
  if (!s.seededDefault) {
    s.topologies = [DEFAULT_TOPOLOGY, ...s.topologies];
    s.seededDefault = true;
  }
  return s;
}

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [s, d] = useReducer(reduce, null, () => {
    const saved = migrate(load());
    syncLibrary(saved.failures);
    syncCatalog(saved.types, saved.topologies);
    return saved;
  });
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(s));
  }, [s]);
  useEffect(() => {
    const f = (e) => {
      if (e.key === KEY && e.newValue) d({ t: 'sync', s: JSON.parse(e.newValue) });
    };
    window.addEventListener('storage', f);
    return () => window.removeEventListener('storage', f);
  }, []);
  return <Ctx.Provider value={[s, d]}>{children}</Ctx.Provider>;
}
