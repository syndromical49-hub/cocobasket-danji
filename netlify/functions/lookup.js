const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yylbsolexrzfyfvpgnow.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bGJzb2xleHJ6ZnlmdnBnbm93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyMDI5MywiZXhwIjoyMDkyMDk2MjkzfQ.DCOuhIZ9gBA3Uhl-jp4Q6bZwAGZYouMqvozudk3LvHw';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const phone = (event.queryStringParameters?.phone || '').replace(/[^0-9]/g, '');
  if (!phone || phone.length < 10) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: '전화번호 필요' }) };
  }

  const HDR = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  try {
    // 1차: customers 테이블
    const custRes = await fetch(
      `${SUPABASE_URL}/rest/v1/customers?phone=eq.${phone}&limit=1`,
      { headers: HDR }
    );
    const custData = await custRes.json();
    if (custData && custData.length > 0) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ source: 'customers', ...custData[0] }) };
    }

    // 2차: orders 테이블 (이전 주문 이력)에서 이름/주소 가져오기
    const ordRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?customer_phone=eq.${phone}&select=customer_name,customer_address&order=created_at.desc&limit=1`,
      { headers: HDR }
    );
    const ordData = await ordRes.json();
    if (ordData && ordData.length > 0 && (ordData[0].customer_name || ordData[0].customer_address)) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({
          source: 'orders',
          phone,
          name: ordData[0].customer_name || '',
          address: ordData[0].customer_address || '',
          entry: ''
        })
      };
    }

    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: '고객 없음' }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
