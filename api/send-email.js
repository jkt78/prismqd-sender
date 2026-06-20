const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.porkbun.com',
  port: 587,
  secure: false,
  auth: { user: process.env.PORKBUN_EMAIL, pass: process.env.PORKBUN_EMAIL_PASSWORD },
  tls: { rejectUnauthorized: false },
});
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.API_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  const { to, subject, body, replyTo } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'Missing required fields: to, subject' });
  try {
    const info = await transporter.sendMail({
      from: `"Jennifer Torrez, BSN RN | Pulse Advisory Group" <${process.env.PORKBUN_EMAIL}>`,
      to, subject, text: body, replyTo: replyTo || process.env.PORKBUN_EMAIL,
    });
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
