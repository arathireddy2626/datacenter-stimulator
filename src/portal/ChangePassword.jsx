import { useState } from 'react';
import { useStore } from './store';
import { Brand, Field } from './ui';

// First sign-in: the person replaces the password they were emailed with one of their own.
export default function ChangePassword({ user, onOut }) {
  const [, dispatch] = useStore();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'Use at least 8 characters, with a letter and a number.';
    } else if (form.password === user.password) {
      next.password = 'Choose a password that is different from the one you were sent.';
    }
    if (form.confirm !== form.password) next.confirm = 'The two passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;
    dispatch({ t: 'user', u: { ...user, password: form.password, mustChange: false } });
    dispatch({
      t: 'log',
      uid: user.id,
      type: 'login',
      detail: 'Chose a new password and activated the account',
    });
  };

  return (
    <div className="pt-login">
      <div className="pt-login-bar">
        <Brand />
        <button className="pt-btn ghost" onClick={onOut}>
          Sign out
        </button>
      </div>
      <div className="pt-login-body">
        <form
          className="pt-form"
          onSubmit={submit}
          noValidate
          style={{ margin: '0 auto', justifySelf: 'center', gridColumn: '1 / -1' }}
        >
          <h2>Welcome, {user.name.split(' ')[0]}</h2>
          <p className="pt-empty">
            This is your first sign-in. Choose a new password to activate your account.{' '}
            <b className="pt-req">*</b> Required
          </p>
          <Field label="New password" error={errors.password}>
            <input
              type="password"
              autoFocus
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm password" error={errors.confirm}>
            <input
              type="password"
              value={form.confirm}
              onChange={set('confirm')}
              autoComplete="new-password"
            />
          </Field>
          <button className="pt-btn" type="submit">
            Activate account
          </button>
        </form>
      </div>
    </div>
  );
}
