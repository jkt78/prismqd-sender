module.exports = async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'https://prismqd-sender.vercel.app/api/auth/linkedin';
  if (!code) {
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=r_liteprofile%20w_member_social`;
    return res.redirect(authUrl);
  }
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.access_token) {
      return res.status(200).send(`
        <h2>LinkedIn OAuth Success</h2>
        <p>Add this as LINKEDIN_ACCESS_TOKEN in your Vercel environment variables:</p>
        <pre style="background:#f0f0f0;padding:12px;word-break:break-all">${tokenData.access_token}</pre>
        <p>Expires in: ${Math.floor(tokenData.expires_in / 86400)} days</p>
      `);
    } else {
      return res.status(400).json({ error: 'Token exchange failed', details: tokenData });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
