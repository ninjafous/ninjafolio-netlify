exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const { from = 'USD', to = 'CAD' } = event.queryStringParameters || {};
  const symbol = `${from}${to}=X`;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    if (!response.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: 'Yahoo indisponible' }) };
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Paire introuvable' }) };
    const rate = result.meta.regularMarketPrice;
    return {
      statusCode: 200,
      headers: { ...headers, 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify({ from, to, rate, symbol })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
