const PERIOD_MAP = {
  '1D':  { range: '1d',  interval: '5m'  },
  '5D':  { range: '5d',  interval: '15m' },
  '30D': { range: '1mo', interval: '1d'  },
  '1Y':  { range: '1y',  interval: '1d'  },
  '5Y':  { range: '5y',  interval: '1wk' },
  'MAX': { range: 'max', interval: '1wk' },
};
exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const { ticker, period } = event.queryStringParameters || {};
  if (!ticker) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ticker manquant' }) };
  const symbol = ticker.toUpperCase();
  const cfg = PERIOD_MAP[period] || PERIOD_MAP['30D'];
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${cfg.interval}&range=${cfg.range}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    if (!response.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: 'Yahoo indisponible' }) };
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ticker introuvable' }) };
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const prices = timestamps.map((ts, i) => {
      if (!closes[i]) return null;
      return { date: new Date(ts * 1000).toISOString().split('T')[0], close: closes[i] };
    }).filter(Boolean);
    return {
      statusCode: 200,
      headers: { ...headers, 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify({ ticker: symbol, period, prices })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
