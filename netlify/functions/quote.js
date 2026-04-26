exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const ticker = event.queryStringParameters?.ticker;
  if (!ticker) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ticker manquant' }) };
  const symbol = ticker.toUpperCase();
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    if (!response.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: 'Yahoo indisponible' }) };
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ticker introuvable' }) };
    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.previousClose;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const change = price - prevClose;
    const changePercent = prevClose ? ((change / prevClose) * 100) : 0;
    return {
      statusCode: 200,
      headers: { ...headers, 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify({
        ticker: symbol,
        price: price.toFixed(4),
        change: change.toFixed(4),
        changePercent: changePercent.toFixed(4),
        currency: meta.currency || 'USD',
        marketState: meta.marketState || 'CLOSED',
      })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
