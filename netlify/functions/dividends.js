exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const { ticker } = event.queryStringParameters || {};
  if (!ticker) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ticker manquant' }) };
  const polygonKey = process.env.POLYGON_API_KEY;
  if (!polygonKey) return { statusCode: 503, headers, body: JSON.stringify({ error: 'Cle Polygon non configuree' }) };
  const symbol = ticker.toUpperCase().replace(/\.TO$/i, '');
  try {
    const massiveUrl = `https://api.massive.com/stocks/v1/dividends?ticker=${encodeURIComponent(symbol)}&limit=20&sort=ex_dividend_date.desc&distribution_type=recurring`;
    const r1 = await fetch(massiveUrl, { headers: { 'Authorization': `Bearer ${polygonKey}` } });
    if (r1.ok) {
      const d1 = await r1.json();
      if (d1.results && d1.results.length) {
        return { statusCode: 200, headers: { ...headers, 'Cache-Control': 'public, max-age=86400' }, body: JSON.stringify({ results: d1.results }) };
      }
    }
  } catch (e) {}
  try {
    const legacyUrl = `https://api.polygon.io/v3/reference/dividends?ticker=${encodeURIComponent(symbol)}&limit=20&order=desc&sort=ex_dividend_date&apiKey=${polygonKey}`;
    const r2 = await fetch(legacyUrl);
    if (r2.ok) {
      const d2 = await r2.json();
      if (d2.results && d2.results.length) {
        return { statusCode: 200, headers: { ...headers, 'Cache-Control': 'public, max-age=86400' }, body: JSON.stringify({ results: d2.results }) };
      }
    }
  } catch (e) {}
  return { statusCode: 200, headers, body: JSON.stringify({ results: [], message: 'Aucun dividende pour ' + symbol }) };
};
