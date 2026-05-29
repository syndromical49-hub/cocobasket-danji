const SUPABASE_URL = 'https://yylbsolexrzfyfvpgnow.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bGJzb2xleHJ6ZnlmdnBnbm93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyMDI5MywiZXhwIjoyMDkyMDk2MjkzfQ.DCOuhIZ9gBA3Uhl-jp4Q6bZwAGZYouMqvozudk3LvHw';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const clean = phone.replace(/[^0-9]/g, '');
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/customers?phone=eq.${clean}&select=*&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const data = await r.json();
  return res.status(200).json(data[0] || null);
}
