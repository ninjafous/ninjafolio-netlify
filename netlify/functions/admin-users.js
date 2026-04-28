exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorise' }) };
  }
  const userToken = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'Variables manquantes' }) };
  }
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${userToken}` }
    });
    const userData = await userRes.json();
    const adminEmail = process.env.ADMIN_EMAIL || 'guillaume.vidal05@hotmail.com';
    if (!userData.email || userData.email !== adminEmail) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acces refuse' }) };
    }
  } catch(e) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token invalide' }) };
  }
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
    });
    if (!res.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: 'Erreur Supabase' }) };
    const data = await res.json();
    const users = (data.users || []).map(u => ({
      id: u.id, email: u.email, created_at: u.created_at,
      email_confirmed_at: u.email_confirmed_at, last_sign_in_at: u.last_sign_in_at
    }));
    return { statusCode: 200, headers: { ...headers, 'Cache-Control': 'no-cache' }, body: JSON.stringify(users) };
  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
