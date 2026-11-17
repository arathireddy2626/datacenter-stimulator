// Talks to the small email server in the server folder (started with npm run server).
export async function emailServerStatus() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('not ok');
    return await res.json();
  } catch {
    return { ok: false };
  }
}

export async function sendEmail({ to, subject, body }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok)
      return { ok: false, error: data.error || `The email server answered with status ${res.status}.` };
    return data;
  } catch {
    return { ok: false, error: 'The email server is not running. Start it with npm run server.' };
  } finally {
    clearTimeout(timer);
  }
}
