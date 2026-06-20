module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.API_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing required field: message' });
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'LINKEDIN_ACCESS_TOKEN not configured' });
  try {
    const profileRes = await fetch('https://api.linkedin.com/v2/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!profileRes.ok) {
      const err = await profileRes.text();
      return res.status(502).json({ error: 'LinkedIn profile fetch failed', details: err });
    }
    const profile = await profileRes.json();
    const urn = `urn:li:person:${profile.id}`;
    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        author: urn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: message },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      })
    });
    if (postRes.status === 201) {
      const data = await postRes.json();
      return res.status(200).json({ success: true, postId: data.id });
    } else {
      const err = await postRes.text();
      return res.status(502).json({ error: 'LinkedIn post failed', details: err });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
