// A small email server. The browser app sends it a message and it delivers it with nodemailer.
//
// Modes (set MAIL_MODE, or leave it empty to choose automatically):
//   smtp - send through a real mail account. Needs SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
//   test - send through a free throwaway test inbox (Ethereal). Nothing reaches a real person,
//          but every message gets a link to preview it. Used when no SMTP settings are given.
//   log  - do not send anything, just report success. Used if the test inbox cannot be reached.
import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';

const PORT = Number(process.env.PORT || 4000);
const FROM = process.env.MAIL_FROM || 'Equinix Simulator <no-reply@equinix-simulator.local>';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))]);

let cached = null;
async function getTransport() {
  if (cached) return cached;
  const requested = (process.env.MAIL_MODE || (process.env.SMTP_HOST ? 'smtp' : 'test')).toLowerCase();
  if (requested === 'smtp') {
    const port = Number(process.env.SMTP_PORT || 587);
    cached = {
      mode: 'smtp',
      transport: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      }),
    };
  } else if (requested === 'test') {
    try {
      const account = await withTimeout(nodemailer.createTestAccount(), 8000);
      cached = {
        mode: 'test',
        transport: nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: { user: account.user, pass: account.pass },
        }),
      };
    } catch (error) {
      console.warn(`Could not reach the test inbox (${error.message}). Falling back to log mode.`);
    }
  }
  if (!cached) cached = { mode: 'log', transport: nodemailer.createTransport({ jsonTransport: true }) };
  console.log(`Email mode: ${cached.mode}`);
  return cached;
}

// Allow at most 30 messages a minute so a mistake cannot flood anyone.
const sentAt = [];
const tooMany = () => {
  const now = Date.now();
  while (sentAt.length && now - sentAt[0] > 60000) sentAt.shift();
  if (sentAt.length >= 30) return true;
  sentAt.push(now);
  return false;
};

const app = express();
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', async (req, res) => {
  const { mode } = await getTransport();
  res.json({ ok: true, mode });
});

app.post('/api/send-email', async (req, res) => {
  const { to, subject, body } = req.body || {};
  if (typeof to !== 'string' || !EMAIL.test(to.trim()))
    return res.status(400).json({ ok: false, error: 'The recipient is not a valid email address.' });
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 200)
    return res.status(400).json({ ok: false, error: 'The subject is missing or too long.' });
  if (typeof body !== 'string' || !body.trim() || body.length > 5000)
    return res.status(400).json({ ok: false, error: 'The message is missing or too long.' });
  if (tooMany())
    return res.status(429).json({ ok: false, error: 'Too many emails in a minute. Try again shortly.' });
  try {
    const { mode, transport } = await getTransport();
    const info = await transport.sendMail({ from: FROM, to: to.trim(), subject: subject.trim(), text: body });
    res.json({
      ok: true,
      mode,
      messageId: info.messageId,
      previewUrl: mode === 'test' ? nodemailer.getTestMessageUrl(info) || undefined : undefined,
    });
  } catch (error) {
    console.error('Send failed:', error.message);
    res.status(502).json({ ok: false, error: `The mail server refused the message: ${error.message}` });
  }
});

// Only this computer can reach the server. Before putting it on a network, add real sign-in checks.
app.listen(PORT, '127.0.0.1', () => console.log(`Email server listening on http://127.0.0.1:${PORT}`));
