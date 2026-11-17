import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Brand, Clock, Field, ThemeToggle } from './ui';
import { isEmail, isPhone } from './access';

// Rename these to the equipment or systems you want shown on the login screen.
const ITEMS = ['Item 1', 'Item 2', 'Item 3'];

// Demo only: statuses on the login screen are random and not connected to real data.
function LiveBoard() {
  const [warnIndex, setWarnIndex] = useState(-1);

  useEffect(() => {
    const timer = setInterval(() => {
      setWarnIndex(Math.random() < 0.5 ? Math.floor(Math.random() * ITEMS.length) : -1);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="pt-board" aria-hidden>
      <svg className="pt-wave" viewBox="0 0 300 60" preserveAspectRatio="none">
        <path d="M0 30 Q 12 4 25 30 T 50 30 T 75 30 T 100 30 T 125 30 T 150 30 T 175 30 T 200 30 T 225 30 T 250 30 T 275 30 T 300 30" />
      </svg>
      <div className="pt-units">
        {ITEMS.map((item, i) => (
          <span key={item} className={`pt-unit ${i === warnIndex ? 'warning' : 'normal'}`}>
            <i />
            {item}
          </span>
        ))}
      </div>
      <small>Live status (demo)</small>
    </div>
  );
}

export default function Login({ onLogin, theme, onToggle }) {
  const [state, dispatch] = useStore();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ username: '', password: '', code: '', confirm: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [req, setReq] = useState({ first: '', last: '', username: '', email: '', phone: '' });
  const [sent, setSent] = useState(false);
  const setR = (key) => (e) => setReq({ ...req, [key]: e.target.value });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setFieldErrors({});
    setSent(false);
    setForm({ username: '', password: '', code: '', confirm: '' });
  };

  const signIn = (e) => {
    e.preventDefault();
    const found = state.users.find(
      (u) => u.username === form.username.trim() && u.password === form.password,
    );
    if (!found) return setError('Username or password is incorrect.');
    if (!found.active) return setError('This account is disabled. Ask an administrator to re-enable it.');
    onLogin(found.id);
  };

  const submitRequest = (e) => {
    e.preventDefault();
    const errors = {};
    const username = req.username.trim().toLowerCase();
    const email = req.email.trim().toLowerCase();
    const pending = (state.requests || []).filter((r) => r.status === 'pending');
    if (!req.first.trim()) errors.first = 'Enter your first name.';
    if (!req.last.trim()) errors.last = 'Enter your last name.';
    if (!/^[a-z0-9._-]{3,20}$/.test(username))
      errors.username = 'Use 3 to 20 letters, numbers, dots, dashes or underscores.';
    else if (state.users.some((u) => u.username === username) || pending.some((r) => r.username === username))
      errors.username = 'That username is taken. Try another.';
    if (!isEmail(email)) errors.email = 'Enter a valid email, like name@company.com.';
    else if (state.users.some((u) => u.email === email) || pending.some((r) => r.email === email))
      errors.email = 'An account or a request already uses that email.';
    if (!isPhone(req.phone.trim())) errors.phone = 'Enter 10 to 15 digits, for example +1 214 555 0123.';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    dispatch({
      t: 'request',
      r: {
        id: 'r' + Date.now(),
        first: req.first.trim(),
        last: req.last.trim(),
        username,
        email,
        phone: req.phone.trim(),
        status: 'pending',
        at: Date.now(),
      },
    });
    setSent(true);
  };

  const fillDemo = (name) => {
    const demo = state.users.find((u) => u.username === name);
    setForm({ ...form, username: demo.username, password: demo.password });
    setError('');
  };

  return (
    <div className="pt-login">
      <div className="pt-login-bar">
        <Brand />
        <ThemeToggle theme={theme} onToggle={onToggle} />
      </div>
      <div className="pt-login-body">
        <section className="pt-hero">
          <p className="pt-kicker">
            <i />
            Status: training mode ready
          </p>
          <h1>Power distribution training</h1>
          <p>
            Practise reading equipment status, working alarms and reporting the right action before it counts.
          </p>
          <LiveBoard />
        </section>
        {mode === 'signin' ? (
          <form className="pt-form" onSubmit={signIn}>
            <div className="pt-live">
              <i aria-hidden />
              Facility online <Clock />
            </div>
            <h2>Sign in</h2>
            <label>
              Username
              <input
                autoFocus
                value={form.username}
                onChange={set('username')}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p className="pt-err" role="alert">
                {error}
              </p>
            )}
            <button className="pt-btn" type="submit">
              Sign in
            </button>
            <button type="button" className="pt-link" onClick={() => switchMode('request')}>
              New here? Request an account
            </button>
            <div className="pt-demo">
              <span>Try a demo account</span>
              {['admin', 'instructor', 'student', 'manager'].map((role) => (
                <button type="button" key={role} className="pt-btn ghost" onClick={() => fillDemo(role)}>
                  {role}
                </button>
              ))}
            </div>
          </form>
        ) : (
          <form className="pt-form" onSubmit={submitRequest} noValidate>
            <h2>Request an account</h2>
            {sent ? (
              <>
                <p className="pt-empty">
                  Your request was sent to the administrator. You will get an email when it is approved or
                  declined.
                </p>
                <button
                  type="button"
                  className="pt-btn"
                  onClick={() => {
                    setSent(false);
                    switchMode('signin');
                  }}
                >
                  Back to sign in
                </button>
              </>
            ) : (
              <>
                <p className="pt-empty">
                  <b className="pt-req">*</b> Required. An administrator reviews every request.
                </p>
                <Field label="First name" error={fieldErrors.first}>
                  <input autoFocus value={req.first} onChange={setR('first')} autoComplete="given-name" />
                </Field>
                <Field label="Last name" error={fieldErrors.last}>
                  <input value={req.last} onChange={setR('last')} autoComplete="family-name" />
                </Field>
                <Field label="Preferred username" error={fieldErrors.username}>
                  <input value={req.username} onChange={setR('username')} autoComplete="off" />
                </Field>
                <Field label="Email" error={fieldErrors.email}>
                  <input
                    type="email"
                    value={req.email}
                    onChange={setR('email')}
                    placeholder="name@company.com"
                    autoComplete="email"
                  />
                </Field>
                <Field label="Phone" error={fieldErrors.phone}>
                  <input
                    type="tel"
                    value={req.phone}
                    onChange={setR('phone')}
                    placeholder="+1 214 555 0123"
                    autoComplete="tel"
                  />
                </Field>
                <button className="pt-btn" type="submit">
                  Submit request
                </button>
                <button type="button" className="pt-link" onClick={() => switchMode('signin')}>
                  Back to sign in
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
