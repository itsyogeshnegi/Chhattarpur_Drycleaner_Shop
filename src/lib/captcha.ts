import crypto from 'crypto';

const CAPTCHA_SECRET = process.env.JWT_SECRET || 'captcha_secret_seed_alharam_2026';

export interface CaptchaData {
  svg: string;
  token: string;
}

export function generateCaptcha(): CaptchaData {
  // Generate a clean 4-character alphanumeric string (avoid ambiguous characters like 0/O, 1/I)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let text = '';
  for (let i = 0; i < 4; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Create an HMAC token with an expiration timestamp (valid for 5 minutes)
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const hash = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(`${text.toUpperCase()}:${expiresAt}`)
    .digest('hex');

  const token = `${text.toUpperCase()}_${expiresAt}_${hash}`;

  // Generate SVG with distorted lines and dots
  const width = 140;
  const height = 48;

  // Generate random lines
  let lines = '';
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1.5" opacity="0.6"/>`;
  }

  // Generate characters with slight rotation
  let lettersSvg = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = 20 + i * 28;
    const y = 32 + (Math.random() * 6 - 3);
    const rot = Math.floor(Math.random() * 20 - 10);
    const colors = ['#026fc4', '#0c3f6d', '#0b8de5', '#03589f'];
    const color = colors[i % colors.length];
    lettersSvg += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="${color}" transform="rotate(${rot}, ${x}, ${y})">${char}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #f1f5f9; border-radius: 6px; user-select: none;">
    ${lines}
    ${lettersSvg}
  </svg>`;

  return { svg, token };
}

export function verifyCaptcha(userInput: string, token: string): boolean {
  if (!userInput || !token) return false;

  const parts = token.split('_');
  if (parts.length !== 3) return false;

  const [actualText, expiresAtStr, expectedHash] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  // Check expiration
  if (Date.now() > expiresAt) {
    return false;
  }

  // Verify HMAC signature
  const calculatedHash = crypto
    .createHmac('sha256', CAPTCHA_SECRET)
    .update(`${actualText}:${expiresAt}`)
    .digest('hex');

  if (calculatedHash !== expectedHash) {
    return false;
  }

  // Case-insensitive match
  return userInput.trim().toUpperCase() === actualText.toUpperCase();
}

