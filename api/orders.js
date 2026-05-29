const SUPABASE_URL = 'https://yylbsolexrzfyfvpgnow.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bGJzb2xleHJ6ZnlmdnBnbm93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyMDI5MywiZXhwIjoyMDkyMDk2MjkzfQ.DCOuhIZ9gBA3Uhl-jp4Q6bZwAGZYouMqvozudk3LvHw';
const sbHeaders = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (req.method === 'GET') {
      const { order_date, created_from, created_to } = req.query;
      let url = `${SUPABASE_URL}/rest/v1/orders?select=*,order_items(*)&order=created_at.desc&limit=200`;
      if (order_date) url += `&order_date=eq.${order_date}`;
      if (created_from) url += `&created_at=gte.${created_from}`;
      if (created_to) url += `&created_at=lt.${created_to}`;
      const r = await fetch(url, { headers: sbHeaders });
      return res.status(200).json(await r.json());
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { order, items } = body;
      const ordRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, { method: 'POST', headers: sbHeaders, body: JSON.stringify(order) });
      const ordData = await ordRes.json();
      const savedOrder = Array.isArray(ordData) ? ordData[0] : ordData;
      if (!savedOrder?.id) return res.status(400).json({ error: '주문 저장 실패' });
      if (items?.length) {
        const itemRows = items.map(i => ({ order_id: savedOrder.id, item_name: i.name, qty: i.qty||1, price: i.price||0 }));
        await fetch(`${SUPABASE_URL}/rest/v1/order_items`, { method: 'POST', headers: sbHeaders, body: JSON.stringify(itemRows) });
      }
      return res.status(200).json({ ok: true, order_id: savedOrder.id });
    }
    return res.status(405).end();
  } catch(e) { return res.status(500).json({ error: e.message }); }
}
