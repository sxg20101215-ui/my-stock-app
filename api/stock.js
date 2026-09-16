// api/stock.js
export default async function handler(req, res) {
  // 设置 CORS 跨域响应头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { code = '600088' } = req.query;
  // 东方财富市场标识：沪市 1.，深市 0.
  const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`;

  try {
    // 1. 获取日 K 线数据（近90个交易日）
    const klineUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&end=20500101&lmt=90`;
    const klineRes = await fetch(klineUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://quote.eastmoney.com/'
      }
    });
    const klineJson = await klineRes.json();

    // 2. 获取龙虎榜明细数据
    const lhbUrl = `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_LHB_RLDETAIL&columns=SECURITY_CODE,TRADE_DATE,EXPLANATION,NET_BUY_AMT&filter=(SECURITY_CODE="${code}")&pageNumber=1&pageSize=50`;
    const lhbRes = await fetch(lhbUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://data.eastmoney.com/'
      }
    });
    const lhbJson = await lhbRes.json();

    return res.status(200).json({
      success: true,
      kline: klineJson,
      lhb: lhbJson
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || '数据拉取失败'
    });
  }
}
