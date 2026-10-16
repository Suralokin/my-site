const https = require('https');

/* ===== RATE LIMITER ===== */
const rateLimits = {};
const RATE_WINDOW = 60000;
const RATE_MAX_READ = 30;
const RATE_MAX_WRITE = 10;

function getClientIP(event) {
  const h = event.headers || {};
  const fwd = h['x-forwarded-for'] || h['client-ip'] || h['x-nf-client-connection-ip'] || h['x-real-ip'] || '';
  return String(fwd).split(',')[0].trim() || 'unknown';
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

setInterval(() => {
  const now = Date.now();
  for (const ip in rateLimits) {
    for (const action in rateLimits[ip]) {
      if (now - rateLimits[ip][action].start > RATE_WINDOW * 2) delete rateLimits[ip][action];
    }
    if (Object.keys(rateLimits[ip]).length === 0) delete rateLimits[ip];
  }
}, 120000);

/* ===== INPUT SANITIZATION ===== */
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

/* ===== LOGGING ===== */
const blockedIPs = new Set();

function githubRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const token = process.env.GITHUB_TOKEN;
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'User-Agent': 'my-site-cms',
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, ...JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, raw: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function decodeContent(b64) {
  return Buffer.from(b64, 'base64').toString('utf8');
}

function encodeContent(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

async function listDir(path) {
  const resp = await githubRequest(`/repos/Suralokin/my-site/contents/${path}`);
  if (resp && resp.status === 200) {
    // githubRequest spreads array responses into an object ({status, 0, 1, ...}),
    // so enumerate numeric keys instead of relying on Array.isArray.
    const keys = Object.keys(resp).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
    return keys
      .map((k) => resp[k])
      .filter((f) => f && typeof f.name === 'string' && f.name.endsWith('.json'))
      .map((f) => f.name.replace('.json', ''));
  }
  return [];
}

async function readFile(path) {
  const resp = await githubRequest(`/repos/Suralokin/my-site/contents/${path}`);
  if (resp.status === 200 && resp.content) {
    return JSON.parse(decodeContent(resp.content));
  }
  return null;
}

async function writeFile(path, content, message) {
  const getResp = await githubRequest(`/repos/Suralokin/my-site/contents/${path}`);
  const sha = getResp.status === 200 ? getResp.sha : undefined;
  const body = {
    message: message || 'CMS: update ' + path,
    content: encodeContent(typeof content === 'string' ? content : JSON.stringify(content, null, 2)),
    branch: 'main'
  };
  if (sha) body.sha = sha;
  return githubRequest(`/repos/Suralokin/my-site/contents/${path}`, 'PUT', body);
}

exports.handler = async (event) => {
  const baseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Type': 'application/json'
  };

  const reply = (statusCode, obj) => ({
    statusCode,
    headers: baseHeaders,
    body: obj === undefined ? '' : JSON.stringify(obj)
  });
  const empty = () => ({ statusCode: 200, headers: baseHeaders, body: '' });

  if (event.httpMethod === 'OPTIONS') return empty();
  if (event.httpMethod !== 'POST') return reply(405, { error: 'POST only' });

  let payload = {};
  if (event.body) {
    try { payload = JSON.parse(event.body); }
    catch (e) { return reply(400, { error: 'Invalid JSON' }); }
  }

  const ip = getClientIP(event);
  if (blockedIPs.has(ip)) return reply(429, { error: 'Blocked' });

  const bodySize = JSON.stringify(payload).length;
  if (bodySize > 50000) return reply(413, { error: 'Payload too large' });

  const password = payload.password;
  const CMS_PASSWORD = process.env.CMS_PASSWORD;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (!CMS_PASSWORD || !GITHUB_TOKEN) {
    return reply(500, { error: 'Server not configured' });
  }

  const action = payload.action;
  const isPublic = password === '__public__';
  const rateAction = action === 'read' ? 'read' : 'write';

  if (!checkRateLimit(ip, rateAction)) {
    return {
      statusCode: 429,
      headers: { ...baseHeaders, 'Retry-After': '60' },
      body: JSON.stringify({ error: 'Too many requests. Try again later.' })
    };
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
        readFile('content/settings.json'),
        readFile('content/about.json'),
        readFile('content/contacts.json'),
        readFile('content/sections.json'),
        listDir('content/services'),
        readFile('content/portfolio.json')
      ]);

      const services = (await Promise.all(
        svcFiles.map((s) => readFile('content/services/' + s + '.json'))
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

  /* ===== WRITE ===== */
  else if (action === 'write') {
    try {
      const data = sanitizeDeep(payload.data);
      const results = [];

      if (data.settings) results.push(await writeFile('content/settings.json', data.settings));

      if (data.about) results.push(await writeFile('content/about.json', data.about));

      if (data.contacts) results.push(await writeFile('content/contacts.json', data.contacts));

      // Services: sync files dynamically
      const existingSvc = await listDir('content/services');
      const newSvc = data.services || [];
      const svcSlugs = newSvc.map((s, i) => s.slug || slugify(s.title) || ('service-' + (i + 1)));

      // Delete removed services
      for (const old of existingSvc) {
        if (!svcSlugs.includes(old)) {
          await githubRequest(`/repos/Suralokin/my-site/contents/content/services/${old}.json`, 'DELETE', {
            message: 'CMS: delete service ' + old,
            sha: (await githubRequest(`/repos/Suralokin/my-site/contents/content/services/${old}.json`)).sha,
            branch: 'main'
          });
        }
      }

      // Write each service
      for (let i = 0; i < newSvc.length; i++) {
        const s = { ...newSvc[i], slug: svcSlugs[i], order: i + 1 };
        results.push(await writeFile('content/services/' + svcSlugs[i] + '.json', s));
      }

      // Portfolio: single file with publishAt support
      const newPf = (data.portfolio || []).map((p, i) => ({ ...p, order: i + 1 }));
      results.push(await writeFile('content/portfolio.json', newPf));

      // Sections: generic dynamic blocks
      if (data.sections) results.push(await writeFile('content/sections.json', data.sections));

      return reply(200, { ok: true, commits: results.length });
    } catch (e) {
      return reply(500, { error: e.message });
    }
  }

  /* ===== UPLOAD IMAGE ===== */
  else if (action === 'upload') {
    try {
      const path = payload.path;
      const content = payload.content; // base64
      if (!path || !content) {
        return reply(400, { error: 'Missing path or content' });
      }
      if (/\.\./.test(path) || !/^(images|content|uploads)\//.test(path)) {
        return reply(403, { error: 'Invalid path' });
      }
      if (content.length > 5000000) {
        return reply(413, { error: 'File too large (max 5MB)' });
      }
      await writeFile(path, content, 'CMS: upload ' + path);
      return reply(200, { ok: true, path: path });
    } catch (e) {
      return reply(500, { error: e.message });
    }
  }

  else {
    return reply(400, { error: 'Unknown action' });
  }
};

function slugify(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[а-яё]/g, c => 'абвгдежзиклмнопрстуфхцчшщэюя'.indexOf(c) >= 0 ? c : '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
}
