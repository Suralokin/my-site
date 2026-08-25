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
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ raw: data }); }
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
    res.status(500).json({ error: 'Server not configured (CMS_PASSWORD or GITHUB_TOKEN missing)' });
    return;
  }

  if (password !== CMS_PASSWORD) {
    res.status(401).json({ error: 'Неверный пароль' });
    return;
  }

  const action = req.body.action;

  if (action === 'read') {
    try {
      const files = [
        'content/settings.json',
        'content/about.json',
        'content/contacts.json'
      ];
      const serviceFiles = ['ai-development', 'web-development'];
      const portfolioFiles = ['ai-chatbot', 'corporate-landing', 'telegram-assistant'];

      const result = {};

      for (const f of files) {
        const resp = await githubRequest(`/repos/Suralokin/my-site/contents/${f}`);
        if (resp.content) {
          const key = f.split('/').pop().replace('.json', '');
          result[key] = JSON.parse(decodeContent(resp.content));
        }
      }

      result.services = [];
      for (const s of serviceFiles) {
        const resp = await githubRequest(`/repos/Suralokin/my-site/contents/content/services/${s}.json`);
        if (resp.content) result.services.push(JSON.parse(decodeContent(resp.content)));
      }

      result.portfolio = [];
      for (const p of portfolioFiles) {
        const resp = await githubRequest(`/repos/Suralokin/my-site/contents/content/portfolio/${p}.json`);
        if (resp.content) result.portfolio.push(JSON.parse(decodeContent(resp.content)));
      }

      res.status(200).json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  else if (action === 'write') {
    try {
      const data = req.body.data;
      const results = [];

      async function commitFile(path, content) {
        const getResp = await githubRequest(`/repos/Suralokin/my-site/contents/${path}`);
        const sha = getResp.sha || undefined;
        const body = {
          message: 'CMS: update ' + path,
          content: encodeContent(JSON.stringify(content, null, 2)),
          branch: 'main'
        };
        if (sha) body.sha = sha;
        return githubRequest(`/repos/Suralokin/my-site/contents/${path}`, 'PUT', body);
      }

      if (data.settings) results.push(await commitFile('content/settings.json', data.settings));
      if (data.about) results.push(await commitFile('content/about.json', data.about));
      if (data.contacts) results.push(await commitFile('content/contacts.json', data.contacts));

      const svcNames = ['ai-development', 'web-development'];
      if (data.services) {
        for (let i = 0; i < data.services.length && i < svcNames.length; i++) {
          results.push(await commitFile('content/services/' + svcNames[i] + '.json', data.services[i]));
        }
      }

      const pfNames = ['ai-chatbot', 'corporate-landing', 'telegram-assistant'];
      if (data.portfolio) {
        for (let i = 0; i < data.portfolio.length && i < pfNames.length; i++) {
          results.push(await commitFile('content/portfolio/' + pfNames[i] + '.json', data.portfolio[i]));
        }
      }

      res.status(200).json({ ok: true, commits: results.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }

  else {
    res.status(400).json({ error: 'Unknown action' });
  }
};
