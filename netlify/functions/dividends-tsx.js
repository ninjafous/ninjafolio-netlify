exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const { ticker } = event.queryStringParameters || {};
  if (!ticker) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ticker manquant' }) };
  const symbol = ticker.toUpperCase().endsWith('.TO') ? ticker.toUpperCase() : ticker.toUpperCase() + '.TO';
  try {
    const now = Math.floor(Date.now() / 1000);
    const fiveYearsAgo = now - (5 * 365 * 24 * 3600);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${fiveYearsAgo}&period2=${now}&interval=1d&events=dividends`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    if (!response.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: 'Yahoo indisponible' }) };
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ticker introuvable: ' + symbol }) };
    const dividendEvents = result?.events?.dividends;
    if (!dividendEvents || Object.keys(dividendEvents).length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ results: [], message: 'Aucun dividende pour ' + symbol }) };
    }
    let results = Object.values(dividendEvents).map(div => {
      const payDate = new Date(div.date * 1000).toISOString().split('T')[0];
      return { ticker: symbol, cash_amount: div.amount, pay_date: payDate, ex_dividend_date: payDate, currency: 'CAD', frequency: 4, distribution_type: 'recurring' };
    }).sort((a, b) => b.pay_date.localeCompare(a.pay_date));
    if (results.length >= 2) {
      const sorted = [...results].sort((a, b) => a.pay_date.localeCompare(b.pay_date));
      const intervals = [];
      for (let i = 1; i < Math.min(sorted.length, 5); i++) {
        intervals.push((new Date(sorted[i].pay_date) - new Date(sorted[i-1].pay_date)) / 86400000);
      }
      const avgDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const frequency = avgDays < 40 ? 12 : avgDays < 120 ? 4 : avgDays < 250 ? 2 : 1;
      results.forEach(r => r.frequency = frequency);
    }
    return { statusCode: 200, headers: { ...headers, 'Cache-Control': 'public, max-age=86400' }, body: JSON.stringify({ results }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
