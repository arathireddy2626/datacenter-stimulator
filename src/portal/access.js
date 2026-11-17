// Who can see whom: students and instructors are linked through groups.
const unique = (list) => [...new Set(list)];

export const studentsOf = (state, instructorId) => {
  const ids = unique(
    state.groups.filter((g) => g.instructorIds.includes(instructorId)).flatMap((g) => g.studentIds),
  );
  return state.users.filter((u) => ids.includes(u.id) && u.active);
};

export const instructorsOf = (state, studentId) =>
  unique(state.groups.filter((g) => g.studentIds.includes(studentId)).flatMap((g) => g.instructorIds));

export const groupsOf = (state, userId) =>
  state.groups.filter((g) => g.instructorIds.includes(userId) || g.studentIds.includes(userId));

// Usernames come from the work email, so the admin never has to invent one.
export const makeUsername = (email, users) => {
  const base = (email.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9.]/g, '') || 'user';
  let name = base;
  let count = 1;
  while (users.some((u) => u.username === name)) name = base + ++count;
  return name;
};

export const makeInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export const isPhone = (v) => {
  const digits = v.replace(/\D/g, '');
  return /^\+?[0-9 ()\-.]+$/.test(v) && digits.length >= 10 && digits.length <= 15;
};

// A random starting password with letters and numbers. The person must change it the first time they sign in.
export function makePassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const pick = (set, n) => Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]);
  return [...pick(letters, 7), ...pick(numbers, 3)].sort(() => Math.random() - 0.5).join('');
}
