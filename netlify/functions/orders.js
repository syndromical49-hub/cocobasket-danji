const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yylbsolexrzfyfvpgnow.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bGJzb2xleHJ6ZnlmdnBnbm93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyMDI5MywiZXhwIjoyMDkyMDk2MjkzfQ.DCOuhIZ9gBA3Uhl-jp4Q6bZwAGZYouMqvozudk3LvHw';
const TG_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID  = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(order, items) {
  if (!TG_TOKEN || !TG_CHAT_ID) return;
  const itemLines = items.map(i =>
    `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''} = ${(i.price * i.qty).toLocaleString()}원`
  ).join('\n');
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const isReorder = order.is_reorder ? '🔄 재주문\n' : '';
  const text =
    `🧺 코코바스켓 새 주문!\n\n` +
    `📦 코코바스켓 주문\n` +
    `${isReorder}` +
    `👤 ${order.customer_name} / ${order.customer_phone}\n` +
    `🏠 ${order.customer_address || order.address || ''}\n` +
    `─────────────\n` +
    `${itemLines}\n` +
    `─────────────\n` +
    `합계: ${total.toLocaleString()}원`;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' })
  }).catch(e => console.error('텔레그램 전송 실패:', e));
}

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  try {
    // GET: 주문 이력 조회
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      let url = `${SUPABASE_URL}/rest/v1/orders?select=*,order_items(*)&order=created_at.desc`;
      if (params.date)         url += `&order_date=eq.${params.date}`;
      if (params.date_from)    url += `&order_date=gte.${params.date_from}`;
      if (params.date_to)      url += `&order_date=lte.${params.date_to}`;
      if (params.created_from) url += `&created_at=gte.${params.created_from}`;
      if (params.created_to)   url += `&created_at=lt.${params.created_to}`;
      if (params.phone)        url += `&customer_phone=eq.${params.phone}`;
      url += params.all ? '&limit=2000' : '&limit=1000';

      const res = await fetch(url, { headers: sbHeaders });
      const data = await res.json();
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    // POST: 주문 저장 (주문 + 품목 한번에)
    if (event.httpMethod === 'POST') {
      const { order, items } = JSON.parse(event.body);

      // 주문 저장
      const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify(order)
      });
      const orderData = await orderRes.json();
      const savedOrder = Array.isArray(orderData) ? orderData[0] : orderData;

      if (!savedOrder || !savedOrder.id) {
        throw new Error('주문 저장 실패');
      }

      // 품목 저장 (품목별 개별 저장 — 배열 bulk insert 시 첫 번째만 저장되는 문제 방지)
      if (items && items.length > 0) {
        const minimalHeaders = {
          ...sbHeaders,
          'Prefer': 'return=minimal'
        };
        for (const item of items) {
          const row = {
            order_id: savedOrder.id,
            item_name: item.name,
            qty: item.qty,
            price: item.price
          };
          const r = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
            method: 'POST',
            headers: minimalHeaders,
            body: JSON.stringify(row)
          });
          if (!r.ok) {
            const errText = await r.text();
            console.error('order_item 저장 실패:', errText, row);
          }
        }
      }

      // 텔레그램 알림 (실패해도 주문 저장엔 영향 없음)
      sendTelegram(order, items || []);

      return {
        statusCode: 201,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify(savedOrder)
      };
    }

    return { statusCode: 405, headers: cors, body: 'Method not allowed' };

  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message })
    };
  }
};
