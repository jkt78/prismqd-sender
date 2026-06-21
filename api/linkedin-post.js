const https = require('https');
const querystring = require('querystring');

function linkedinRequest(path, method, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.linkedin.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: responseData }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function introspectToken(token) {
  return new Promise((resolve, reject) => {
    const params = querystring.stringify({
      token,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    });
    const options = {
      hostname: 'www.linkedin.com',
      path: '/oauth/v2/introspectToken',
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing required field: message' });

  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'LinkedIn not configured' });

  // Get member URN via token introspection (no r_liteprofile scope needed)
  const introspection = await introspectToken(token);
  if (!introspection.sub) {
    return res.status(500).json({ error: 'Failed to get LinkedIn member ID', detail: JSON.stringify(introspection) });
  }
  const authorUrn = `urn:li:person:${introspection.sub}`;

  // Post to LinkedIn
  const postBody = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: message },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const postRes = await linkedinRequest('/v2/ugcPosts', 'POST', token, postBody);
  if (postRes.status !== 201) {
    return res.status(500).json({ error: 'LinkedIn post failed', detail: postRes.body });
  }

  return res.status(200).json({ success: true, postId: JSON.parse(postRes.body).id });
};
