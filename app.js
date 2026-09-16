// app.js
let myChart = echarts.init(document.getElementById('chart'));

// 龙虎榜标签样式定义
const lhbStyle = {
  '振幅': { color: '#ef4444', label: '振' },
  '换手': { color: '#f59e0b', label: '换' },
  '偏离': { color: '#3b82f6', label: '偏' },
  '默认': { color: '#dc2626', label: '龙' }
};

async function fetchData() {
  let code = document.getElementById('stockCode').value.trim() || '600088';

  // 隐藏已打开的卡片
  document.getElementById('lhbCard').style.display = 'none';

  try {
    // 请求自身的 Serverless 中转接口
    const res = await fetch(`/api/stock?code=${code}`);
    const data = await res.json();

    if (!data.success || !data.kline || !data.kline.data || !data.kline.data.klines) {
      alert('未查询到该股票数据，请检查代码格式是否正确');
      return;
    }

    // 1. 解析 K 线数据
    // 原始格式: "日期,开盘,收盘,最高,最低,成交量..."
    const kData = data.kline.data.klines.map(line => {
      const p = line.split(',');
      return [
        p[0],                 // 日期
        parseFloat(p[1]),     // 开盘
        parseFloat(p[2]),     // 收盘
        parseFloat(p[5]),     // 最低
        parseFloat(p[4])      // 最高
      ];
    });

    // 2. 解析龙虎榜明细
    const lhbMap = {};
    if (data.lhb && data.lhb.result && data.lhb.result.data) {
      data.lhb.result.data.forEach(row => {
        const date = row.TRADE_DATE.split(' ')[0];
        const reason = row.EXPLANATION || '';
        let type = '默认';
        if (reason.includes('振幅')) type = '振幅';
        else if (reason.includes('换手')) type = '换手';
        else if (reason.includes('偏离') || reason.includes('涨幅') || reason.includes('跌幅')) type = '偏离';
        
        lhbMap[date] = {
          reason: reason,
          type: type,
          netAmount: row.NET_BUY_AMT ? (row.NET_BUY_AMT / 10000).toFixed(2) : '0.00'
        };
      });
    }

    renderChart(kData, lhbMap);
  } catch (err) {
    console.error(err);
    alert('请求失败，请检查网络连接');
  }
}

function renderChart(kData, lhbMap) {
  const markPoints = [];
  
  // 遍历日 K 线，如果当天有上榜记录，在最高价顶部标注 Marker
  kData.forEach(item => {
    const date = item[0];
    const high = item[4]; // 最高价
    if (lhbMap[date]) {
      const info = lhbMap[date];
      const style = lhbStyle[info.type] || lhbStyle['默认'];
      
      markPoints.push({
        name: info.reason,
        value: style.label,
        coord: [date, high],
        symbolSize: 32,
        itemStyle: { color: style.color },
        lhbDetail: { date, ...info }
      });
    }
  });

  const option = {
    grid: { 
      left: '12%', 
      right: '4%', 
      top: '10%', 
      bottom: '15%' 
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    xAxis: { 
      type: 'category', 
      data: kData.map(i => i[0]),
      scale: true 
    },
    yAxis: { 
      scale: true,
      splitLine: { show: true, lineStyle: { color: '#f1f5f9' } }
    },
    series: [{
      type: 'candlestick',
      data: kData.map(i => [i[1], i[2], i[3], i[4]]), // [open, close, lowest, highest]
      itemStyle: {
        color: '#ef4444',        // 阳线填充红
        color0: '#22c55e',       // 阴线填充绿
        borderColor: '#ef4444',  // 阳线边框
        borderColor0: '#22c55e'  // 阴线边框
      },
      markPoint: { 
        symbol: 'pin', 
        data: markPoints,
        label: {
          show: true,
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: 12
        }
      }
    }]
  };

  myChart.setOption(option, true);

  // 点击龙虎榜大头针展示浮窗
  myChart.off('click');
  myChart.on('click', function(params) {
    if (params.componentType === 'markPoint') {
      const d = params.data.lhbDetail;
      document.getElementById('lhbCard').style.display = 'block';
      document.getElementById('lhbDate').innerText = d.date;
      document.getElementById('lhbReason').innerText = d.reason;
      document.getElementById('lhbNet').innerText = d.netAmount;
    }
  });
}

// 屏幕尺寸变化自动自适应图标大小
window.addEventListener('resize', () => myChart.resize());

// 页面初始化自动加载
fetchData();
