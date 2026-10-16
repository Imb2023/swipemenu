import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import siteConfig from '../site.config.json' with { type: 'json' };

// Best-effort per-instance throttle. Configure Vercel Firewall for shared limits.
const attempts = new Map();
const WINDOW = 10 * 60 * 1000;
function throttled(ip, now) {
  for (const [key, value] of attempts) if (now - value.start > WINDOW) attempts.delete(key);
  if (attempts.size > 1000 && !attempts.has(ip)) return true;
  const entry = attempts.get(ip) || {start: now, count: 0};
  entry.count++;
  attempts.set(ip, entry);
  return entry.count > 15;
}
function equalPassword(actual, expected) {
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(actual), digest(expected));
}
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const reply = (status, error) => res.status(status).json({error});
  if (req.method !== 'POST') {res.setHeader('Allow','POST'); return reply(405,'Use POST.');}
  const origins = [process.env.SITE_URL || siteConfig.url];
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  const allowed = origins.map(value => {try {return new URL(value).origin;} catch {return '';}});
  if (!req.headers.origin || !allowed.includes(req.headers.origin)) return reply(403,'This upload page is not allowed.');
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(415,'Use JSON.');
  const env = process.env;
  const names = ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','CLOUDINARY_UPLOAD_PRESET','STAFF_UPLOAD_PASSWORD'];
  if (names.some(name => !env[name]) || env.STAFF_UPLOAD_PASSWORD.length < 24) return reply(503,'Staff uploads are not configured yet. Ask the menu owner to finish setup.');
  if (!/^[a-z0-9_-]+$/i.test(env.CLOUDINARY_CLOUD_NAME)) return reply(503,'The upload account needs configuration.');
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (throttled(ip, Date.now())) {res.setHeader('Retry-After','600'); return reply(429,'Too many attempts. Please try again in 10 minutes.');}
  let body = req.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > 4096) return reply(413,'Request too large.');
    try {body = JSON.parse(body);} catch {return reply(400,'Invalid request.');}
  }
  if (!body || typeof body.password !== 'string' || body.password.length > 512 || !['image','video'].includes(body.kind)) return reply(400,'Choose a photo or video and enter the staff password.');
  if (!equalPassword(body.password, env.STAFF_UPLOAD_PASSWORD)) return reply(401,'The staff password is incorrect.');
  const params = {
    timestamp: Math.floor(Date.now()/1000),
    public_id: `specials/${randomUUID()}`,
    overwrite: false,
    upload_preset: env.CLOUDINARY_UPLOAD_PRESET
  };
  const toSign = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  // Cloudinary's supported SHA-256 upload signing scheme; the secret stays on Vercel.
  const signature = createHash('sha256').update(toSign + env.CLOUDINARY_API_SECRET).digest('hex');
  return res.status(200).json({cloudName:env.CLOUDINARY_CLOUD_NAME, apiKey:env.CLOUDINARY_API_KEY, kind:body.kind, params, signature});
}
