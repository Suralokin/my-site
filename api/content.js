const https = require('https');

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
  if (resp.status === 200 && Array.isArray(resp)) {
    return resp.filter(f => f.name.endsWith('.json')).map(f => f.name.replace('.json', ''));
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const password = req.body.password;
  const CMS_PASSWORD = process.env.CMS_PASSWORD;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (!CMS_PASSWORD || !GITHUB_TOKEN) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  if (password !== CMS_PASSWORD) {
    res.status(401).json({ error: 'Неверный пароль' });
    return;
  }

  const action = req.body.action;

  /* ===== READ ===== */
  if (action === 'read') {
    try {
      const result = {};

      const settings = await readFile('content/settings.json');
      if (settings) result.settings = settings;

      const about = await readFile('content/about.json');
      if (about) result.about = about;

      const contacts = await readFile('content/contacts.json');
      if (contacts) result.contacts = contacts;

      const svcFiles = await listDir('content/services');
      result.services = [];
      for (const s of svcFiles) {
        const data = await readFile('content/services/' + s + '.json');
        if (data) result.services.push(data);
      }
      result.services.sort((a, b) => (a.order || 0) - (b.order || 0));

      const pfFiles = await listDir('content/portfolio');
      result.portfolio = [];
      for (const p of pfFiles) {
        const data = await readFile('content/portfolio/' + p + '.json');
        if (data) result.portfolio.push(data);
      }
      result.portfolio.sort((a, b) => (a.order || 0) - (b.order || 0));

      res.status(200).json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  /* ===== WRITE ===== */
  else if (action === 'write') {
    try {
      const data = req.body.data;
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

      // Portfolio: sync files dynamically
      const existingPf = await listDir('content/portfolio');
      const newPf = data.portfolio || [];
      const pfSlugs = newPf.map((p, i) => p.slug || slugify(p.title) || ('project-' + (i + 1)));

      // Delete removed portfolio items
      for (const old of existingPf) {
        if (!pfSlugs.includes(old)) {
          await githubRequest(`/repos/Suralokin/my-site/contents/content/portfolio/${old}.json`, 'DELETE', {
            message: 'CMS: delete portfolio ' + old,
            sha: (await githubRequest(`/repos/Suralokin/my-site/contents/content/portfolio/${old}.json`)).sha,
            branch: 'main'
          });
        }
      }

      // Write each portfolio item
      for (let i = 0; i < newPf.length; i++) {
        const p = { ...newPf[i], slug: pfSlugs[i], order: i + 1 };
        results.push(await writeFile('content/portfolio/' + pfSlugs[i] + '.json', p));
      }

      res.status(200).json({ ok: true, commits: results.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  /* ===== UPLOAD IMAGE ===== */
  else if (action === 'upload') {
    try {
      const path = req.body.path;
      const content = req.body.content; // base64
      if (!path || !content) {
        res.status(400).json({ error: 'Missing path or content' });
        return;
      }
      const result = await writeFile(path, content, 'CMS: upload ' + path);
      res.status(200).json({ ok: true, path: path });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  else {
    res.status(400).json({ error: 'Unknown action' });
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
