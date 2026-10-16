/* ===== Cloudflare Pages Function: /api/content =====
   Порт логики Netlify/Vercel под формат Pages Functions (onRequest).
   Переменные окружения: GITHUB_TOKEN, CMS_PASSWORD (задаются в Cloudflare Pages).
   Работает на глобальном fetch; base64 — через atob/btoa (без Node Buffer). */

const RATE_WINDOW = 60000;
const RATE_MAX_READ = 30;
const RATE_MAX_WRITE = 10;
const rateLimits = {};
const blockedIPs = new Set();

function getClientIP(request) {
  return request.headers.get('cf-connecting-ip') ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

function checkRateLimit(ip, action) {
  const now = Date.now();
  if (!rateLimits[ip]) rateLimits[ip] = {};
  const bucket = rateLimits[ip];
  if (!bucket[action] || now - bucket[action].start > RATE_WINDOW) {
    bucket[action] = { start: now, count: 1 };
    return true;
  }
  const max = action === 'write' || action === 'upload' ? RATE_MAX_WRITE : RATE_MAX_READ;
  if (bucket[action].count >= max) return false;
  bucket[action].count++;
  return true;
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').substring(0, 5000);
}

function sanitizeDeep(obj) {
  if (typeof obj === 'string') return sanitize(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeDeep);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k in obj) {
      if (k === '__proto__' || k === 'constructor') continue;
      out[k] = sanitizeDeep(obj[k]);
    }
    return out;
  }
  return obj;
}

function b64decode(input) {
  const bin = atob(String(input).replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function githubRequest(path, method, body, env) {
  const res = await fetch('https://api.github.com' + path, {
    method: method,
    headers: {
      'User-Agent': 'my-site-cms',
      'Authorization': 'token ' + env.GITHUB_TOKEN,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let data;
  try { data = await res.json(); } catch (e) { data = { raw: '' }; }
  return { status: res.status, ...(data && typeof data === 'object' ? data : {}) };
}

async function listDir(path, env) {
  const resp = await githubRequest(`/repos/Suralokin/my-site/contents/${path}`, 'GET', null, env);
  if (resp && resp.status === 200) {
    const keys = Object.keys(resp).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
    return keys
      .map((k) => resp[k])
      .filter((f) => f && typeof f.name === 'string' && f.name.endsWith('.json'))
      .map((f) => f.name.replace('.json', ''));
  }
  return [];
}

async function readFile(path, env) {
  const resp = await githubRequest(`/repos/Suralokin/my-site/contents/${path}`, 'GET', null, env);
  if (resp.status === 200 && resp.content) {
    return JSON.parse(b64decode(resp.content));
  }
  return null;
}

async function writeFile(path, content, message, env) {
  const getResp = await githubRequest(`/repos/Suralokin/my-site/contents/${path}`, 'GET', null, env);
  const sha = getResp.status === 200 ? getResp.sha : undefined;
  const body = {
    message: message || 'CMS: update ' + path,
    content: b64encode(typeof content === 'string' ? content : JSON.stringify(content, null, 2)),
    branch: 'main'
  };
  if (sha) body.sha = sha;
  return githubRequest(`/repos/Suralokin/my-site/contents/${path}`, 'PUT', body, env);
}

function slugify(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[а-яё]/g, c => 'абвгдежзиклмнопрстуфхцчшщэюя'.indexOf(c) >= 0 ? c : '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
}

export async function onRequest(context) {
  const { request, env } = context;

  const baseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Type': 'application/json'
  };

  const reply = (status, obj) => new Response(
    obj === undefined ? '' : JSON.stringify(obj),
    { status, headers: baseHeaders }
  );

  if (request.method === 'OPTIONS') return new Response('', { status: 200, headers: baseHeaders });
  if (request.method !== 'POST') return reply(405, { error: 'POST only' });

  let payload = {};
  const rawBody = await request.text();
  if (rawBody) {
    try { payload = JSON.parse(rawBody); }
    catch (e) { return reply(400, { error: 'Invalid JSON' }); }
  }

  const ip = getClientIP(request);
  if (blockedIPs.has(ip)) return reply(429, { error: 'Blocked' });

  if (rawBody.length > 50000) return reply(413, { error: 'Payload too large' });

  const password = payload.password;
  const CMS_PASSWORD = env.CMS_PASSWORD;
  const GITHUB_TOKEN = env.GITHUB_TOKEN;

  if (!CMS_PASSWORD || !GITHUB_TOKEN) {
    return reply(500, { error: 'Server not configured' });
  }

  const action = payload.action;
  const isPublic = password === '__public__';
  const rateAction = action === 'read' ? 'read' : 'write';

  if (!checkRateLimit(ip, rateAction)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Try again later.' }), {
      status: 429,
      headers: { ...baseHeaders, 'Retry-After': '60' }
    });
  }

  if (password !== CMS_PASSWORD && !isPublic) {
    if (!checkRateLimit(ip, 'badpass')) {
      blockedIPs.add(ip);
      setTimeout(() => blockedIPs.delete(ip), 300000);
    }
    return reply(401, { error: 'Неверный пароль' });
  }

  if (isPublic && action !== 'read') {
    return reply(403, { error: 'Public access: read only' });
  }

  if (action === 'read') {
    try {
      const [settings, about, contacts, sections, svcFiles, pfData] = await Promise.all([
        readFile('content/settings.json', env),
        readFile('content/about.json', env),
        readFile('content/contacts.json', env),
        readFile('content/sections.json', env),
        listDir('content/services', env),
        readFile('content/portfolio.json', env)
      ]);

      const services = (await Promise.all(
        svcFiles.map((s) => readFile('content/services/' + s + '.json', env))
      )).filter(Boolean);
      services.sort((a, b) => (a.order || 0) - (b.order || 0));

      const allPf = Array.isArray(pfData) ? pfData : [];
      const now = new Date().toISOString();
      const portfolio = allPf.filter(p => !p.publishAt || p.publishAt <= now);
      portfolio.sort((a, b) => (a.order || 0) - (b.order || 0));

      const result = { services, portfolio };
      if (settings) result.settings = settings;
      if (about) result.about = about;
      if (contacts) result.contacts = contacts;
      if (Array.isArray(sections)) result.sections = sections;

      return reply(200, result);
    } catch (e) {
      return reply(500, { error: e.message });
    }
  }

  else if (action === 'write') {
    try {
      const data = sanitizeDeep(payload.data);
      const results = [];

      if (data.settings) results.push(await writeFile('content/settings.json', data.settings, null, env));
      if (data.about) results.push(await writeFile('content/about.json', data.about, null, env));
      if (data.contacts) results.push(await writeFile('content/contacts.json', data.contacts, null, env));

      const existingSvc = await listDir('content/services', env);
      const newSvc = data.services || [];
      const svcSlugs = newSvc.map((s, i) => s.slug || slugify(s.title) || ('service-' + (i + 1)));

      for (const old of existingSvc) {
        if (!svcSlugs.includes(old)) {
          const delResp = await githubRequest(`/repos/Suralokin/my-site/contents/content/services/${old}.json`, 'GET', null, env);
          await githubRequest(`/repos/Suralokin/my-site/contents/content/services/${old}.json`, 'DELETE', {
            message: 'CMS: delete service ' + old,
            sha: delResp.sha,
            branch: 'main'
          }, env);
        }
      }

      for (let i = 0; i < newSvc.length; i++) {
        const s = { ...newSvc[i], slug: svcSlugs[i], order: i + 1 };
        results.push(await writeFile('content/services/' + svcSlugs[i] + '.json', s, null, env));
      }

      const newPf = (data.portfolio || []).map((p, i) => ({ ...p, order: i + 1 }));
      results.push(await writeFile('content/portfolio.json', newPf, null, env));

      if (data.sections) results.push(await writeFile('content/sections.json', data.sections, null, env));

      return reply(200, { ok: true, commits: results.length });
    } catch (e) {
      return reply(500, { error: e.message });
    }
  }

  else if (action === 'upload') {
    try {
      const path = payload.path;
      const content = payload.content;
      if (!path || !content) {
        return reply(400, { error: 'Missing path or content' });
      }
      if (/\.\./.test(path) || !/^(images|content|uploads)\//.test(path)) {
        return reply(403, { error: 'Invalid path' });
      }
      if (content.length > 5000000) {
        return reply(413, { error: 'File too large (max 5MB)' });
      }
      await writeFile(path, content, 'CMS: upload ' + path, env);
      return reply(200, { ok: true, path: path });
    } catch (e) {
      return reply(500, { error: e.message });
    }
  }

  else {
    return reply(400, { error: 'Unknown action' });
  }
}
