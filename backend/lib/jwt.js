export const WEAK_JWT_SECRETS = new Set([
  'dev-insecure-change-me',
  'change-me-jwt-secret',
  'change-me-to-a-long-random-string',
  'change-me-jwt-secret-min-32-chars-recommended',
]);

const MIN_SECRET_LENGTH = 16;

export function isWeakJwtSecret(s) {
  if (!s || typeof s !== 'string') return true;
  const trimmed = s.trim();
  if (trimmed.length < MIN_SECRET_LENGTH) return true;
  return WEAK_JWT_SECRETS.has(trimmed);
}

/**
 * Call once at process start. In production, refuses to boot with a missing/weak secret.
 * In development, allows a soft fallback but warns loudly.
 */
export function assertJwtSecretConfigured() {
  const raw = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isWeakJwtSecret(raw)) return;

  if (isProd) {
    throw new Error(
      'JWT_SECRET must be set to a strong secret (at least 16 characters) in production. ' +
        'Do not use placeholder values from .env.example.',
    );
  }

  if (!raw) {
    console.warn(
      '[jwt] JWT_SECRET is not set; using insecure dev default. Set JWT_SECRET before deploying.',
    );
  } else {
    console.warn(
      '[jwt] JWT_SECRET looks weak or is a documented placeholder. Set a strong secret before deploying.',
    );
  }
}

export function getJwtSecret() {
  const s = process.env.JWT_SECRET?.trim();
  if (!isWeakJwtSecret(s)) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is missing or too weak for production.');
  }
  return 'dev-insecure-change-me';
}
