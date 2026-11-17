import { useEffect, useState } from 'react';
import { ACCOUNT_ROLES, TRAINING_ROLES } from './data';
import { makePassword } from './access';
import { deliverEmail, emailServerStatus, openOutlookDraft } from './mailer';

const when = (t) => new Date(t).toLocaleString();

const STATUS = { sending: 'Sending', sent: 'Sent', logged: 'Not delivered (log mode)', failed: 'Not sent' };

function EmailLog({ s, d }) {
  const [server, setServer] = useState(null);
  useEffect(() => {
    emailServerStatus().then(setServer);
  }, []);
  const mails = s.outbox || [];
  const modeText = {
    smtp: 'delivering through your mail account',
    outlook: 'delivering through Outlook',
    test: 'test inbox (messages are previewed, not delivered)',
    log: 'log mode (nothing is delivered)',
  };
  return (
    <section className="pt-panel">
      <h3>Emails</h3>
      <p className={server?.ok ? 'pt-simbar run' : 'pt-simbar warning'}>
        {server === null && 'Checking the email server...'}
        {server?.ok && `Email server connected: ${modeText[server.mode] || server.mode}.`}
        {server &&
          !server.ok &&
          'The email server is not running. Start it with npm run server (or npm run start:all). Until then emails are kept here so you can send them by hand.'}
      </p>
      {mails.length === 0 && <p className="pt-empty">No emails yet.</p>}
      {mails.map((m) => (
        <details key={m.id} className="pt-mail">
          <summary>
            <b>{m.subject}</b> to {m.to} <small>{when(m.at)}</small>{' '}
            <span
              className={`pt-pill ${m.status === 'sent' ? 'normal' : m.status === 'failed' ? 'critical' : 'warning'}`}
            >
              {STATUS[m.status] || 'Kept here'}
            </span>
          </summary>
          <pre>{m.body}</pre>
          {m.error && <p className="pt-err">Automatic delivery failed. Use the Outlook draft option.</p>}
          <div className="pt-actions">
            {m.previewUrl && (
              <a className="pt-btn ghost" href={m.previewUrl} target="_blank" rel="noreferrer">
                Open the preview
              </a>
            )}
            {(m.status === 'failed' || m.status === 'logged' || !m.status) && (
              <>
                <button className="pt-btn ghost" onClick={() => deliverEmail(d, m)}>
                  Send again
                </button>
                <button className="pt-btn ghost" onClick={() => openOutlookDraft(m)}>
                  Open Outlook draft
                </button>
              </>
            )}
          </div>
        </details>
      ))}
    </section>
  );
}

function Review({ request, s, d, onDone }) {
  const role = request.role || 'student';
  const [trainingRole, setTrainingRole] = useState('technician');
  const [groupIds, setGroupIds] = useState([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const toggle = (id) =>
    setGroupIds(groupIds.includes(id) ? groupIds.filter((x) => x !== id) : [...groupIds, id]);
  const first = request.first;

  const mail = (subject, body) => {
    const entry = {
      id: 'm' + Date.now() + Math.random(),
      to: request.email,
      subject,
      body,
      at: Date.now(),
      status: 'sending',
    };
    d({ t: 'outbox', mail: entry });
    deliverEmail(d, entry);
  };

  const approve = () => {
    if (role === 'student' && groupIds.length === 0)
      return setError('Pick at least one group so the student has an instructor.');
    if (s.users.some((u) => u.username === request.username))
      return setError('That username has since been taken. Disapprove and ask for another.');
    const password = makePassword();
    const user = {
      id: 'u' + Date.now(),
      name: `${request.first} ${request.last}`,
      email: request.email,
      phone: request.phone,
      username: request.username,
      password,
      mustChange: true,
      role,
      trainingRole: role === 'instructor' ? trainingRole : undefined,
      active: true,
      status: 'active',
      createdAt: Date.now(),
    };
    d({ t: 'user', u: user });
    groupIds.forEach((id) => {
      const group = s.groups.find((g) => g.id === id);
      if (!group) return;
      const key = role === 'instructor' ? 'instructorIds' : 'studentIds';
      d({ t: 'group', g: { ...group, [key]: [...group[key], user.id] } });
    });
    mail(
      'Your Equinix Simulator account is approved',
      `Hello ${first},\n\nYour account request was approved.\n\nUsername: ${user.username}\nTemporary password: ${password}\n\nSign in with these details. You will be asked to choose a new password the first time.`,
    );
    d({ t: 'requestDone', id: request.id, status: 'approved' });
    onDone();
  };

  const disapprove = () => {
    mail(
      'Your Equinix Simulator account request',
      `Hello ${first},\n\nYour account request was not approved.${reason.trim() ? `\n\nReason: ${reason.trim()}` : ''}\n\nYou can submit a new request if something changes.`,
    );
    d({ t: 'requestDone', id: request.id, status: 'rejected', reason: reason.trim() });
    onDone();
  };

  return (
    <div className="pt-field pt-review">
      <div className="pt-row cover-row">
        <span>
          Requested role:{' '}
          <b>{ACCOUNT_ROLES.find(([key]) => key === role)?.[1] || 'Student'}</b>
        </span>
        {role === 'instructor' && (
          <select
            value={trainingRole}
            onChange={(e) => setTrainingRole(e.target.value)}
            aria-label="Training role"
          >
            {Object.entries(TRAINING_ROLES).map(([k, r]) => (
              <option key={k} value={k}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {role !== 'viewer' && (
        <div className="pt-chips">
          {s.groups.map((g) => (
            <label key={g.id} className="pt-chipx">
              <input type="checkbox" checked={groupIds.includes(g.id)} onChange={() => toggle(g.id)} />{' '}
              {g.name}
            </label>
          ))}
          {s.groups.length === 0 && <span className="pt-empty">Create a group first.</span>}
        </div>
      )}
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason, included in the email if you disapprove (optional)"
        aria-label="Reason"
      />
      {error && (
        <p className="pt-err" role="alert">
          {error}
        </p>
      )}
      <div className="pt-actions">
        <button className="pt-btn" onClick={approve}>
          Approve and email the login
        </button>
        <button className="pt-btn ghost danger" onClick={disapprove}>
          Disapprove and email
        </button>
        <button className="pt-btn ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Requests({ s, d }) {
  const [reviewing, setReviewing] = useState(null);
  const requests = s.requests || [];
  const pending = requests.filter((r) => r.status === 'pending');
  const decided = requests.filter((r) => r.status !== 'pending').sort((a, b) => b.decidedAt - a.decidedAt);

  return (
    <>
      <section className="pt-panel">
        <h3>Waiting for a decision ({pending.length})</h3>
        {pending.length === 0 && <p className="pt-empty">No pending requests.</p>}
        {pending.map((r) => (
          <article key={r.id} className="pt-request">
            <div>
              <b>
                {r.first} {r.last}
              </b>{' '}
              <span className="mono">{r.username}</span>
              <p className="pt-empty">
                {r.email} · {r.phone} · requested {when(r.at)}
              </p>
            </div>
            {reviewing === r.id ? (
              <Review request={r} s={s} d={d} onDone={() => setReviewing(null)} />
            ) : (
              <button className="pt-btn" onClick={() => setReviewing(r.id)}>
                Review
              </button>
            )}
          </article>
        ))}
      </section>
      <section className="pt-panel pt-scroll">
        <h3>Decided</h3>
        <table className="pt-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Decision</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {decided.length === 0 && (
              <tr>
                <td colSpan="4" className="pt-empty">
                  Nothing decided yet.
                </td>
              </tr>
            )}
            {decided.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.first} {r.last}
                </td>
                <td className="mono">{r.username}</td>
                <td>
                  {r.status === 'approved' ? 'Approved' : 'Disapproved'}
                  {r.reason ? `: ${r.reason}` : ''}
                </td>
                <td>{when(r.decidedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <EmailLog s={s} d={d} />
    </>
  );
}
