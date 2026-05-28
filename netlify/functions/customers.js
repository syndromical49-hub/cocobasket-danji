const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yylbsolexrzfyfvpgnow.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5bGJzb2xleHJ6ZnlmdnBnbm93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyMDI5MywiZXhwIjoyMDkyMDk2MjkzfQ.DCOuhIZ9gBA3Uhl-jp4Q6bZwAGZYouMqvozudk3LvHw';

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  try {
    // GET: 전체 고객 목록 (phone 파라미터로 단건 조회 가능)
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      let url = `${SUPABASE_URL}/rest/v1/customers?select=*&order=created_at.asc`;
      if (params.phone) url += `&phone=eq.${params.phone}`;
      const res = await fetch(url, { headers: sbHeaders });
      const data = await res.json();
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    // POST: 신규 고객 추가
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      // 중복 체크
      const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/customers?phone=eq.${body.phone}&select=id`,
        { headers: sbHeaders }
      );
      const existing = await checkRes.json();
      if (existing.length > 0) {
        return {
          statusCode: 409,
          headers: { ...cors, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: '이미 존재하는 연락처' })
        };
      }

      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers: sbHeaders,
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return {
        statusCode: 201,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      };
    }

    // PUT: 고객 정보 수정
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body);
      const { phone, ...updates } = body;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/customers?phone=eq.${phone}`,
        {
          method: 'PATCH',
          headers: sbHeaders,
          body: JSON.stringify(updates)
        }
      );
      const data = await res.json();
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
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
