module.exports = (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const redirectUri = `${req.headers.origin || 'https://my-site-vert.vercel.app'}/api/callback`;

  if (!clientId) {
    res.status(500).send('OAUTH_CLIENT_ID not configured');
    return;
  }

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;

  res.writeHead(302, { Location: authUrl });
  res.end();
};
