export const RESET_URL = 'https://app.inkyducktattoo.com/password.html';

export function passwordProblem(password, confirmation) {
  if (password.length < 12) return 'Use at least 12 characters.';
  if (password.length > 128) return 'Use no more than 128 characters.';
  if (password !== confirmation) return 'The passwords do not match.';
  return '';
}

export async function passwordAccess(db, membership, invalidLink = false) {
  const { data, error } = await db.auth.getSession();
  if (invalidLink || error || !data?.session) return false;
  return Boolean(await membership());
}

export async function savePassword(db, membership, password, confirmation) {
  const problem = passwordProblem(password, confirmation);
  if (problem) return { error: { code: 'validation', message: problem } };
  if (!await passwordAccess(db, membership)) return { error: { code: 'session_expired' } };
  return db.auth.updateUser({ password });
}
