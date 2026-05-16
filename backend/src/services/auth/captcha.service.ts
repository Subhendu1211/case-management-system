import { randomUUID } from "crypto";

type CaptchaPayload = {
  id: string;
  image: string;
};

type CaptchaInput = {
  id: string;
  solution: string;
};

type CaptchaRecord = {
  solution: string;
  expiresAt: number;
  attempts: number;
};

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const CAPTCHA_MAX_ATTEMPTS = 5;
const CAPTCHA_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const captchaStore = new Map<string, CaptchaRecord>();

function randomText(length: number) {
  let value = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * CAPTCHA_CHARS.length);
    value += CAPTCHA_CHARS[index];
  }
  return value;
}

function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cleanupExpiredCaptchas() {
  const now = Date.now();
  for (const [id, record] of captchaStore.entries()) {
    if (record.expiresAt <= now) {
      captchaStore.delete(id);
    }
  }
}

function buildCaptchaSvg(text: string) {
  const safeText = escapeXml(text);
  const noiseA = randomText(2);
  const noiseB = randomText(2);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="52" viewBox="0 0 180 52">
  <rect x="0" y="0" width="180" height="52" rx="6" fill="#f8fafc" />
  <line x1="12" y1="10" x2="168" y2="42" stroke="#cbd5e1" stroke-width="1.5" />
  <line x1="14" y1="40" x2="164" y2="12" stroke="#e2e8f0" stroke-width="1.2" />
  <text x="22" y="22" font-family="monospace" font-size="10" fill="#94a3b8" transform="rotate(-6 22,22)">${noiseA}</text>
  <text x="145" y="20" font-family="monospace" font-size="10" fill="#94a3b8" transform="rotate(8 145,20)">${noiseB}</text>
  <text x="20" y="36" font-family="monospace" font-size="28" letter-spacing="4" fill="#0f172a">${safeText}</text>
</svg>`.trim();
}

export function generateCaptcha(): CaptchaPayload {
  cleanupExpiredCaptchas();
  const id = randomUUID();
  const solution = randomText(6);
  captchaStore.set(id, {
    solution,
    expiresAt: Date.now() + CAPTCHA_TTL_MS,
    attempts: 0,
  });

  return {
    id,
    image: buildCaptchaSvg(solution),
  };
}

export function verifyCaptcha(input: CaptchaInput): boolean {
  cleanupExpiredCaptchas();
  const record = captchaStore.get(input.id);
  if (!record) {
    return false;
  }

  const normalized = input.solution.trim();
  record.attempts += 1;
  const isValid = normalized.length > 0 && normalized === record.solution;

  if (isValid || record.attempts >= CAPTCHA_MAX_ATTEMPTS) {
    captchaStore.delete(input.id);
  } else {
    captchaStore.set(input.id, record);
  }

  return isValid;
}
