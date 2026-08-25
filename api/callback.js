module.exports = async (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const code = req.query.code;

  if (!code) {
    res.status(400).send('Missing code parameter');
    return;
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code
      })
    });

    const data = await response.json();

    if (data.error) {
      res.status(401).send('OAuth error: ' + data.error_description);
      return;
    }

    const token = data.access_token;

    // Decap CMS expects an HTML page that posts the token to the opener
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
<body>
  <script>
    (function() {
      function sendMsg(msg) {
        var opener = window.opener;
        if (opener) {
          opener.postMessage(msg, "*");
          window.close();
        }
      }
      sendMsg("authorization:github:success:${token}");
    })();
  </script>
  <p>Authorized. Closing window...</p>
</body>
</html>`);
  } catch (err) {
    res.status(500).send('Error exchanging code: ' + err.message);
  }
};
