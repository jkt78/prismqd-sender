const https = require('https');
const querystring = require('querystring');

function getToken(code) {
  return new Promise((resolve, reject) => {
    const params = querystring.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    });
    const options = {
      hostname: 'www.linkedin.com',
      path: '/oauth/v2/accessToken',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(params),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(params);
    req.end();
  });
}

module.exports = async (req, res) => {
  const { code, error } = req.query;

  if (error) return res.status(400).send(`LinkedIn auth error: ${error}`);
  if (!code) {
    // Redirect to LinkedIn auth
    const params = querystring.stringify({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      scope: 'w_member_social',
    });
    return res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
  }

  try {
    const tokenData = await getToken(code);
    // Display token -- copy into Vercel env var LINKEDIN_ACCESS_TOKEN
    return res.send(`
      <h2>LinkedIn Connected!</h2>
      <p>Copy this access token into your Vercel environment variable <strong>LINKEDIN_ACCESS_TOKEN</strong>:</p>
      <textarea rows="4" cols="80" onclick="this.select()">${tokenData.access_token}</textarea>
      <p>Expires in: ${Math.round(tokenData.expires_in / 86400)} days</p>
      <p>After saving to Vercel env vars, redeploy the project.</p>
    `);
  } catch (err) {
    return res.status(500).send(`Token exchange failed: ${err.message}`);
  }
};
