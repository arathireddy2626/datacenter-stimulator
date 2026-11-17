import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useStore } from './store';
import { FAILURES } from './data';
import { groupsOf, makeInviteCode, makeUsername } from './access';
import { Banner, Field, Pill, Tabs } from './ui';
import { TRAINING_ROLES } from './data';
import Activity from './Activity';
import Library from './Library';
import Topologies from './Topologies';
import Requests from './Requests';
import { GroupLinks, GroupMembers } from './GroupRoster';
import { makePassword } from './access';
import { deliverEmail, openOutlookDraft } from './mailer';

const statusOf = (u) => (!u.active ? 'Disabled' : u.mustChange ? 'Awaiting first login' : 'Active');
const copy = (text) => navigator.clipboard?.writeText(text);

function Chips({ items, onRemove, lockLast }) {
  return (
    <div className="pt-chips">
      {items.length === 0 && <span className="pt-empty">None yet</span>}
      {items.map((item) => (
        <span className="pt-chipx" key={item.id}>
          {item.label}
          <button
            type="button"
            aria-label={`Remove ${item.label}`}
            disabled={lockLast && items.length === 1}
            onClick={() => onRemove(item.id)}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function Picker({ label, options, onPick }) {
  return (
    <select value="" aria-label={label} onChange={(e) => e.target.value && onPick(e.target.value)}>
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function GroupCard({ group, users, onSave, onDelete }) {
  const isNew = !group.id;
  const [draft, setDraft] = useState(group);
  const [error, setError] = useState('');

  const members = (key) =>
    draft[key]
      .map((id) => users.find((u) => u.id === id))
      .filter(Boolean)
      .map((u) => ({ id: u.id, label: u.name }));
  const available = (role, key) =>
    users
      .filter((u) => u.role === role && u.active && !draft[key].includes(u.id))
      .map((u) => ({ id: u.id, label: u.name }));
  const add = (key, id) => setDraft({ ...draft, [key]: [...draft[key], id] });
  const remove = (key, id) => setDraft({ ...draft, [key]: draft[key].filter((x) => x !== id) });

  const save = () => {
    if (!draft.name.trim()) return setError('Give the group a name.');
    if (draft.instructorIds.length === 0) return setError('Every group needs at least one instructor.');
    onSave({ ...draft, name: draft.name.trim(), id: draft.id || 'g' + Date.now() });
    setError('');
    if (isNew) setDraft(group);
  };

  return (
    <section className="pt-panel">
      <div className="pt-field inline">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder={isNew ? 'New group name, for example Cohort 2' : 'Group name'}
          aria-label="Group name"
        />
        {!isNew && (
          <button
            className="pt-btn ghost danger"
            onClick={() =>
              window.confirm(`Delete ${group.name}? Its students lose access to its instructors.`) &&
              onDelete()
            }
          >
            Delete group
          </button>
        )}
      </div>
      <h4>Instructors ({draft.instructorIds.length}, at least one required)</h4>
      <Chips
        items={members('instructorIds')}
        onRemove={(id) => remove('instructorIds', id)}
        lockLast={!isNew}
      />
      <Picker
        label="Add an instructor"
        options={available('instructor', 'instructorIds')}
        onPick={(id) => add('instructorIds', id)}
      />
      <h4>Students ({draft.studentIds.length})</h4>
      <Chips items={members('studentIds')} onRemove={(id) => remove('studentIds', id)} />
      <Picker
        label="Add a student"
        options={available('student', 'studentIds')}
        onPick={(id) => add('studentIds', id)}
      />
      {error && (
        <p className="pt-err" role="alert">
          {error}
        </p>
      )}
      <div className="pt-actions">
        <button className="pt-btn" onClick={save}>
          {isNew ? 'Create group' : 'Save changes'}
        </button>
      </div>
    </section>
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const digits = (v) => v.replace(/\D/g, '');
const phoneOk = (v) => /^\+?[0-9 ()\-.]+$/.test(v) && digits(v).length >= 10 && digits(v).length <= 15;

function check(form, groupIds, users) {
  const errors = {};
  const email = form.email.trim().toLowerCase();
  if (form.name.trim().length < 2) errors.name = 'Enter the full name.';
  if (!EMAIL.test(email)) errors.email = 'Enter a valid email, like name@company.com.';
  else if (users.some((u) => u.email === email))
    errors.email = 'Someone with that email already has an account.';
  if (!phoneOk(form.phone.trim())) errors.phone = 'Enter 10 to 15 digits, for example +1 214 555 0123.';
  if (form.role === 'student' && groupIds.length === 0)
    errors.groups = 'Put the student in at least one group so they have an instructor.';
  return errors;
}

function AddUser({ state, d, onCreate, onClose }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'student',
    trainingRole: 'technician',
  });
  const [groupIds, setGroupIds] = useState([]);
  const [tried, setTried] = useState(false);
  const [created, setCreated] = useState(null);
  const errors = tried ? check(form, groupIds, state.users) : {};
  const username = EMAIL.test(form.email.trim()) ? makeUsername(form.email.trim(), state.users) : '';
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const chosen = groupIds.map((id) => state.groups.find((g) => g.id === id)).filter(Boolean);

  const submit = (e) => {
    e.preventDefault();
    setTried(true);
    if (Object.keys(check(form, groupIds, state.users)).length) return;
    const email = form.email.trim().toLowerCase();
    const tempPassword = makePassword();
    const user = {
      id: 'u' + Date.now(),
      name: form.name.trim(),
      email,
      phone: form.phone.trim(),
      username: makeUsername(email, state.users),
      password: tempPassword,
      role: form.role,
      trainingRole: form.role === 'instructor' ? form.trainingRole : undefined,
      active: true,
      mustChange: true,
      status: 'active',
      createdAt: Date.now(),
    };
    const mail = {
      id: 'm' + Date.now() + Math.random(),
      to: email,
      subject: 'Your Equinix Simulator account',
      body: `Hello ${user.name},\n\nYour Equinix Simulator account has been created.\n\nUsername: ${user.username}\nTemporary password: ${tempPassword}\n\nSign in with these details. You will be asked to choose a new password the first time.`,
      at: Date.now(),
      status: 'sending',
    };
    onCreate(user, groupIds);
    d({ t: 'outbox', mail });
    setCreated({ ...user, mail, mailStatus: 'sending' });
    deliverEmail(d, mail).then((result) => {
      setCreated((current) => ({
        ...current,
        mailStatus: result.ok ? result.mode : 'failed',
        mailError: result.ok ? '' : result.error,
        previewUrl: result.previewUrl,
      }));
    });
  };

  if (created) {
    return (
      <div className="pt-modal">
        <div className="pt-sheet one" role="dialog" aria-label="Account created">
          <div>
            <h3>Profile created for {created.name}</h3>
            <p className="pt-empty">
              Login details are being sent to <b>{created.email}</b>.
            </p>
            {created.mailStatus === 'sending' && <p className="pt-simbar">Sending the email...</p>}
            {['sent', 'smtp', 'outlook'].includes(created.mailStatus) && (
              <p className="pt-simbar run">Email sent successfully.</p>
            )}
            {created.mailStatus === 'test' && (
              <p className="pt-simbar warning">
                Demo email created, but it was not delivered to Outlook.
                {created.previewUrl && (
                  <>
                    {' '}
                    <a href={created.previewUrl} target="_blank" rel="noreferrer">
                      Open the demo preview
                    </a>
                  </>
                )}
              </p>
            )}
            {created.mailStatus === 'logged' && (
              <p className="pt-simbar warning">Email was logged but not delivered.</p>
            )}
            {created.mailStatus === 'failed' && (
              <>
                <p className="pt-err" role="alert">
                  Email could not be sent: {created.mailError}
                </p>
                <button className="pt-btn" onClick={() => openOutlookDraft(created.mail)}>
                  Send through Outlook
                </button>
              </>
            )}
            {created.mailStatus === 'test' && (
              <button className="pt-btn" onClick={() => openOutlookDraft(created.mail)}>
                Send through Outlook
              </button>
            )}
            <div className="pt-actions">
              <button className="pt-btn ghost" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-modal">
      <form className="pt-sheet one" role="dialog" aria-label="Add user" onSubmit={submit} noValidate>
        <div className="pt-field">
          <h3>Add a user</h3>
          <p className="pt-empty">
            <b className="pt-req">*</b> Required
          </p>
          <Field label="Full name" error={errors.name}>
            <input value={form.name} onChange={set('name')} autoComplete="off" />
          </Field>
          <Field label="Work email" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="name@company.com"
              autoComplete="off"
            />
          </Field>
          <p className="pt-empty">
            {username ? (
              <>
                Username will be <b className="mono">{username}</b>
              </>
            ) : (
              'The username is created from the email.'
            )}
          </p>
          <Field label="Phone number" error={errors.phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              placeholder="+1 214 555 0123"
              autoComplete="off"
            />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={set('role')}>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="viewer">Management viewer</option>
            </select>
          </Field>
          {form.role === 'instructor' && (
            <Field label="Training role">
              <select value={form.trainingRole} onChange={set('trainingRole')}>
                {Object.entries(TRAINING_ROLES).map(([key, r]) => (
                  <option key={key} value={key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {['student', 'instructor'].includes(form.role) && (
            <>
              <h4>
                Groups{' '}
                {form.role === 'student' && (
                  <b className="pt-req" aria-hidden>
                    *
                  </b>
                )}
              </h4>
              <Chips
                items={chosen.map((g) => ({ id: g.id, label: g.name }))}
                onRemove={(id) => setGroupIds(groupIds.filter((x) => x !== id))}
              />
              <Picker
                label="Add to a group"
                options={state.groups
                  .filter((g) => !groupIds.includes(g.id))
                  .map((g) => ({ id: g.id, label: g.name }))}
                onPick={(id) => setGroupIds([...groupIds, id])}
              />
              {errors.groups && (
                <small className="pt-fielderr" role="alert">
                  {errors.groups}
                </small>
              )}
            </>
          )}
          <div className="pt-actions">
            <button className="pt-btn">Create profile</button>
            <button type="button" className="pt-btn ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Profile({ user, state, onClose }) {
  const groups = groupsOf(state, user.id);
  const last = (state.activity || []).find((a) => a.uid === user.id);
  return (
    <div className="pt-modal" onClick={onClose}>
      <div className="pt-sheet one" role="dialog" aria-label="Profile" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3>
            {user.name} <Pill s={statusOf(user) === 'Active' ? 'normal' : 'warning'} />
          </h3>
          <p className="pt-empty">
            {statusOf(user)} {user.role}
          </p>
          <dl>
            {user.trainingRole && (
              <>
                <dt>Training role</dt>
                <dd>{TRAINING_ROLES[user.trainingRole].label}</dd>
              </>
            )}
            <dt>Phone</dt>
            <dd>{user.phone || 'Not provided'}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Username</dt>
            <dd className="mono">{user.username}</dd>
            <dt>Created</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
            <dt>Last activity</dt>
            <dd>{last ? new Date(last.at).toLocaleString() : 'None yet'}</dd>
            <dt>Groups</dt>
            <dd>{groups.length ? <GroupLinks groups={groups} users={state.users} /> : 'Not in any group'}</dd>
            {user.status === 'invited' && (
              <>
                <dt>Temporary password</dt>
                <dd className="mono">{user.inviteCode}</dd>
              </>
            )}
          </dl>
          <div className="pt-actions">
            {user.status === 'invited' && (
              <button
                className="pt-btn"
                onClick={() => copy(`Username: ${user.username}\nInvite code: ${user.inviteCode}`)}
              >
                Copy invite
              </button>
            )}
            <button className="pt-btn ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Groups are listed by name, a page at a time. Clicking one opens its details in a pop-up window.
export function GroupsPanel({ s, d }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const size = 6;
  const pages = Math.max(1, Math.ceil(s.groups.length / size));
  const current = Math.min(page, pages);
  const rows = s.groups.slice((current - 1) * size, current * size);
  const name = (id) => s.users.find((u) => u.id === id)?.name || 'Unknown';
  const group =
    open === 'new' ? { name: '', instructorIds: [], studentIds: [] } : s.groups.find((g) => g.id === open);

  return (
    <>
      <div className="pt-filter">
        <button className="pt-btn" onClick={() => setOpen('new')}>
          New group
        </button>
      </div>
      <section className="pt-panel pt-scroll">
        <table className="pt-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Instructors</th>
              <th>Students</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan="3" className="pt-empty">
                  No groups yet.
                </td>
              </tr>
            )}
            {rows.map((g) => (
              <tr key={g.id}>
                <td>
                  <button className="pt-link" onClick={() => setOpen(g.id)}>
                    {g.name}
                  </button>
                </td>
                <td>{g.instructorIds.map(name).join(', ')}</td>
                <td>{g.studentIds.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pt-pager" aria-label="Pages">
          <button className="pt-btn ghost" disabled={current === 1} onClick={() => setPage(current - 1)}>
            Previous
          </button>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              className={`pt-btn ghost ${current === i + 1 ? 'on' : ''}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button className="pt-btn ghost" disabled={current === pages} onClick={() => setPage(current + 1)}>
            Next
          </button>
          <span className="pt-empty">{s.groups.length} groups</span>
        </div>
      </section>
      {open && group && (
        <div className="pt-modal" onClick={() => setOpen(null)}>
          <div
            className="pt-sheet one groupsheet"
            role="dialog"
            aria-label="Group details"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3>{open === 'new' ? 'New group' : group.name}</h3>
              {open !== 'new' && <GroupMembers group={group} users={s.users} />}
              <h4>Edit this group</h4>
              <GroupCard
                key={open}
                group={group}
                users={s.users}
                onSave={(g) => {
                  d({ t: 'group', g });
                  setOpen(null);
                }}
                onDelete={() => {
                  d({ t: 'delGroup', id: group.id });
                  setOpen(null);
                }}
              />
              <button className="pt-btn ghost" onClick={() => setOpen(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Admin() {
  const [s, d] = useStore();
  const [tab, setTab] = useState('users');
  const [role, setRole] = useState('all');
  const [adding, setAdding] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const rows = s.users.filter((u) => u.role !== 'admin' && (role === 'all' || u.role === role));

  const createUser = (user, groupIds) => {
    d({ t: 'user', u: user });
    groupIds.forEach((id) => {
      const group = s.groups.find((g) => g.id === id);
      if (!group) return;
      const key = user.role === 'instructor' ? 'instructorIds' : 'studentIds';
      d({ t: 'group', g: { ...group, [key]: [...group[key], user.id] } });
    });
  };

  const stats = [
    ['Instructors', s.users.filter((u) => u.role === 'instructor').length],
    ['Students', s.users.filter((u) => u.role === 'student').length],
    ['Groups', s.groups.length],
    ['Open alarms', s.tickets.length],
  ];

  return (
    <main className="pt-main">
      <Banner icon={ShieldCheck} sub="Manage users, groups and the failure library.">
        Administration
      </Banner>
      <div className="pt-stats">
        {stats.map(([k, v]) => (
          <div key={k}>
            <b>{v}</b>
            <span>{k}</span>
          </div>
        ))}
      </div>
      <Tabs
        tabs={[
          ['users', 'Users'],
          ['requests', 'Requests', (s.requests || []).filter((r) => r.status === 'pending').length || null],
          ['groups', 'Groups'],
          ['activity', 'Activity'],
          ['lib', 'Failure library'],
          ['topo', 'Topologies'],
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'users' && (
        <>
          <div className="pt-filter">
            {['all', 'instructor', 'student', 'viewer'].map((r) => (
              <button key={r} className={`pt-btn ghost ${role === r ? 'on' : ''}`} onClick={() => setRole(r)}>
                {r === 'all' ? 'All users' : r + 's'}
              </button>
            ))}
            <button className="pt-btn" onClick={() => setAdding(true)}>
              Add user
            </button>
          </div>
          <div className="pt-panel pt-scroll">
            <table className="pt-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Groups</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const groups = groupsOf(s, u.id);
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="pt-avatar" aria-hidden>
                          {u.name
                            .split(' ')
                            .map((w) => w[0])
                            .join('')
                            .slice(0, 2)}
                        </span>
                        <button className="pt-link" onClick={() => setProfileId(u.id)}>
                          {u.name}
                        </button>
                      </td>
                      <td className="mono">{u.username}</td>
                      <td>
                        {u.role === 'instructor'
                          ? `Instructor${u.trainingRole ? ` (${TRAINING_ROLES[u.trainingRole].label})` : ''}`
                          : u.role === 'viewer'
                            ? 'Management viewer'
                            : u.role}
                      </td>
                      <td>
                        {u.role === 'admin' ? (
                          ''
                        ) : groups.length ? (
                          <GroupLinks groups={groups} users={s.users} />
                        ) : (
                          'No group'
                        )}
                      </td>
                      <td>{statusOf(u)}</td>
                      <td>
                        <button
                          className="pt-btn ghost"
                          disabled={u.id === 'u1'}
                          onClick={() => d({ t: 'user', u: { ...u, active: !u.active } })}
                        >
                          {u.active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === 'groups' && <GroupsPanel s={s} d={d} />}
      {tab === 'activity' && (
        <Activity users={s.users.filter((u) => u.role !== 'admin')} activity={s.activity || []} />
      )}
      {tab === 'topo' && <Topologies s={s} d={d} />}
      {tab === 'requests' && <Requests s={s} d={d} />}
      {tab === 'lib' && <Library failures={s.failures} d={d} />}
      {adding && <AddUser state={s} d={d} onCreate={createUser} onClose={() => setAdding(false)} />}
      {profileId && (
        <Profile
          user={s.users.find((u) => u.id === profileId)}
          state={s}
          onClose={() => setProfileId(null)}
        />
      )}
    </main>
  );
}
