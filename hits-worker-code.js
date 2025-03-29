export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env.HITS)
  }
}
const ALLOWED_DOMAIN = 'hits.example.com' // 设置你的域名
const AUTH_CODE = 'your_auth_code' // 设置你的验证码
async function handleRequest(request, db) {
  const url = new URL(request.url)
  // 如果是主页请求，返回徽标生成页面
  if (url.pathname === '/' || url.pathname === '') {
    return serveBadgeGeneratorPage()
  }
  // 处理示例徽标
  if (url.pathname === '/example.svg') {
    return new Response(generateSvg({
      title: url.searchParams.get('title') || 'Hits',
      titleBg: url.searchParams.get('title_bg') || '#555555',
      countBg: url.searchParams.get('count_bg') || '#79C83D',
      edgeFlat: url.searchParams.get('edge_flat') === 'true',
      dailyCount: 123,
      totalCount: 456
    }), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
  // 处理API请求
  if (url.pathname === '/api/create') {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }
    try {
      const { counter, authCode } = await request.json()
      if (authCode !== AUTH_CODE) {
        return new Response(JSON.stringify({ error: '验证码错误' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      if (!counter || !/^[a-zA-Z0-9_-]+$/.test(counter)) {
        return new Response(JSON.stringify({ error: '计数器名称无效' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      // 检查计数器是否已存在
      const exists = await checkCounterExists(db, counter)
      if (exists) {
        return new Response(JSON.stringify({ error: '计数器已存在' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      // 创建新计数器
      await createCounter(db, counter)
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: '请求无效' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
  // 添加获取月度统计的API
  if (url.pathname === '/api/monthly') {
    const counterName = url.searchParams.get('counter')
    if (counterName === 'example') {
      // 生成示例数据
      const days = []
      const counts = []
      const today = new Date()
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        days.push(date.toISOString().split('T')[0])
        counts.push(Math.floor(Math.random() * 50) + 10) // 生成10-60之间的随机数
      }
      return new Response(JSON.stringify({ days, counts }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
    if (!counterName) {
      return new Response(JSON.stringify({ error: '缺少计数器名称' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    // 验证计数器是否存在
    const exists = await checkCounterExists(db, counterName)
    if (!exists) {
      return new Response(JSON.stringify({ error: '计数器不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    // 获取最近30天的数据
    const days = []
    const counts = []
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayStr = date.toISOString().split('T')[0]
      const dailyKey = `${counterName}:daily:${dayStr}`
      const count = await getCounter(db, dailyKey)
      days.unshift(dayStr)
      counts.unshift(count)
    }
    return new Response(JSON.stringify({ days, counts }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
  // 处理正常的计数器请求
  if (url.hostname !== ALLOWED_DOMAIN) {
    return new Response('Not Found', { status: 404 })
  }
  const pathParts = url.pathname.split('/').filter(Boolean)
  const counterName = pathParts[0]?.replace('.svg', '')
  if (!counterName) {
    return new Response('Not Found', { status: 404 })
  }
  // 验证计数器是否存在
  const exists = await checkCounterExists(db, counterName)
  if (!exists) {
    return new Response('Counter not found', { status: 404 })
  }
  const action = url.searchParams.get('action') || 'view'
  const isSvg = url.pathname.endsWith('.svg')
  const today = new Date().toISOString().split('T')[0]
  const totalKey = `${counterName}:total`
  const dailyKey = `${counterName}:daily:${today}`
  let total = await getCounter(db, totalKey)
  let daily = await getCounter(db, dailyKey)
  if (action.toLowerCase() === 'hit') {
    total++
    daily++
    await updateCounter(db, totalKey, total)
    await updateCounter(db, dailyKey, daily)
  }
  if (isSvg) {
    const countBg = url.searchParams.get('count_bg') || '#79C83D'
    const titleBg = url.searchParams.get('title_bg') || '#555555'
    const title = url.searchParams.get('title') || 'Hits'
    const edgeFlat = url.searchParams.get('edge_flat') === 'true'
    const svg = generateSvg({
      title,
      titleBg,
      countBg,
      edgeFlat,
      dailyCount: daily,
      totalCount: total
    })
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
  const responseData = {
    counter: counterName,
    action: action,
    total: total,
    daily: daily,
    date: today,
    timestamp: new Date().toISOString()
  }
  return new Response(JSON.stringify(responseData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
async function checkCounterExists(db, counter) {
  const { results } = await db.prepare(
    'SELECT 1 FROM counters WHERE name LIKE ? LIMIT 1'
  ).bind(`${counter}%`).all()
  return results.length > 0
}
async function createCounter(db, counter) {
  await db.prepare(
    'INSERT INTO counters (name, count) VALUES (?, 0)'
  ).bind(`${counter}:total`).run()
}
async function getCounter(db, key) {
  const { results } = await db.prepare(
    'SELECT count FROM counters WHERE name = ?'
  ).bind(key).all()
  return results.length > 0 ? results[0].count : 0
}
async function updateCounter(db, key, value) {
  await db.prepare(`
    INSERT INTO counters (name, count) 
    VALUES (?, ?) 
    ON CONFLICT(name) 
    DO UPDATE SET count = excluded.count
  `).bind(key, value).run()
}
function generateSvg({ title, titleBg, countBg, edgeFlat, dailyCount, totalCount }) {
  const borderRadius = edgeFlat ? '0' : '3'
  const countText = `${dailyCount} / ${totalCount}`
  const titleWidth = title.length * 7 + 10
  const countWidth = countText.length * 7 + 10
  const width = titleWidth + countWidth
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20">
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="round">
    <rect width="${width}" height="20" rx="${borderRadius}" ry="${borderRadius}" fill="#fff"/>
  </mask>
  <g mask="url(#round)">
    <rect width="${titleWidth}" height="20" fill="${titleBg}"/>
    <rect x="${titleWidth}" width="${countWidth}" height="20" fill="${countBg}"/>
    <rect width="${width}" height="20" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,Geneva,sans-serif" font-size="11">
    <text x="${titleWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${title}</text>
    <text x="${titleWidth / 2}" y="14" fill="#fff">${title}</text>
    <text x="${titleWidth + countWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${countText}</text>
    <text x="${titleWidth + countWidth / 2}" y="14" fill="#fff">${countText}</text>
  </g>
</svg>`.trim()
}
function serveBadgeGeneratorPage() {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hits! - 访问计数器</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    input, select {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
    }
    .color-input {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .color-input input[type="color"] {
      width: 50px;
    }
    .color-input input[type="text"] {
      flex: 1;
    }
    button {
      background: #4CAF50;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background: #45a049;
    }
    .result {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 4px;
      display: none;
    }
    .preview {
      margin: 20px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 4px;
      text-align: center;
    }
    .preview-controls {
      margin: 20px 0;
      padding: 15px;
      background: #fff;
      border-radius: 4px;
    }
    .chart-container {
      margin: 20px 0;
      padding: 15px;
      background: #fff;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .error {
      color: #dc3545;
      margin-top: 10px;
      display: none;
    }
    code {
      display: block;
      padding: 10px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin: 10px 0;
      word-break: break-all;
    }
    .copy-btn {
      background: #6c757d;
      margin-top: 5px;
      font-size: 14px;
    }
    .copy-btn:hover {
      background: #5a6268;
    }
    .preview-badge {
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>访问计数器生成器</h1>
    <div class="form-group">
      <label for="counter">计数器名称(仅允许字母/数字/下划线/连字符,建议填仓库名称)</label>
      <input type="text" id="counter" pattern="[a-zA-Z0-9_-]+" required>
    </div>
    <div class="form-group">
      <label for="authCode">验证码(没有站长的验证码无法创建计数器)</label>
      <input type="password" id="authCode" required>
    </div>
    <div class="preview-controls">
      <h3>自定义预览</h3>
      <div class="form-group">
        <label for="previewTitle">标题文字</label>
        <input type="text" id="previewTitle" value="Hits" onchange="updatePreview()">
      </div>
      <div class="form-group">
        <label for="titleBg">标题背景色</label>
        <div class="color-input">
          <input type="color" id="titleBgColor" value="#555555" onchange="updatePreview()">
          <input type="text" id="titleBg" value="#555555" onchange="updatePreview()">
        </div>
      </div>
      <div class="form-group">
        <label for="countBg">计数背景色</label>
        <div class="color-input">
          <input type="color" id="countBgColor" value="#79C83D" onchange="updatePreview()">
          <input type="text" id="countBg" value="#79C83D" onchange="updatePreview()">
        </div>
      </div>
      <div class="form-group">
        <label for="edgeStyle">边角样式</label>
        <select id="edgeStyle" onchange="updatePreview()">
          <option value="false">圆角</option>
          <option value="true">直角</option>
        </select>
      </div>
      <div class="preview-badge" id="previewBadge">
        <img src="/example.svg" alt="预览徽标">
      </div>
    </div>
    <button onclick="createCounter()">创建计数器</button>
    <div id="result" class="result">
      <h3>使用方法</h3>
      <p>HTML 代码：</p>
      <code id="htmlCode"></code>
      <button class="copy-btn" onclick="copyCode('htmlCode')">复制 HTML</button>
      <p>Markdown 代码：</p>
      <code id="markdownCode"></code>
      <button class="copy-btn" onclick="copyCode('markdownCode')">复制 Markdown</button>
      <h4>月度统计图</h4>
      <p>获取最近30天的访问统计数据：</p>
      <code id="monthlyApiCode"></code>
      <button class="copy-btn" onclick="copyCode('monthlyApiCode')">复制 API URL</button>
      <p>API 返回格式：</p>
      <pre>
{
  "days": ["2024-01-01", "2024-01-02", ...],
  "counts": [10, 15, ...]
}
      </pre>
      <p>你可以使用这些数据配合任何图表库（如 Chart.js、ECharts 等）来绘制访问量趋势图。</p>
      <p>自定义参数说明：</p>
      <ul>
        <li>title: 修改显示文字</li>
        <li>count_bg: 计数背景色（十六进制颜色码，需要将#替换为%23）</li>
        <li>title_bg: 标题背景色（十六进制颜色码，需要将#替换为%23）</li>
        <li>edge_flat: 是否使用直角（true/false）</li>
      </ul>
    </div>
    <div id="error" class="error"></div>
  </div>
  <script>
    function updatePreview() {
      const title = document.getElementById('previewTitle').value;
      const titleBg = document.getElementById('titleBg').value.replace('#', '%23');
      const countBg = document.getElementById('countBg').value.replace('#', '%23');
      const edgeFlat = document.getElementById('edgeStyle').value;
      const previewUrl = \`/example.svg?title=\${encodeURIComponent(title)}&title_bg=\${titleBg}&count_bg=\${countBg}&edge_flat=\${edgeFlat}\`;
      document.getElementById('previewBadge').innerHTML = \`<img src="\${previewUrl}" alt="预览徽标">\`;
    }
    // 颜色输入框同步
    document.getElementById('titleBgColor').addEventListener('input', function(e) {
      document.getElementById('titleBg').value = e.target.value;
      updatePreview();
    });
    document.getElementById('countBgColor').addEventListener('input', function(e) {
      document.getElementById('countBg').value = e.target.value;
      updatePreview();
    });
    async function createCounter() {
      const counter = document.getElementById('counter').value;
      const authCode = document.getElementById('authCode').value;
      const resultDiv = document.getElementById('result');
      const errorDiv = document.getElementById('error');
      try {
        const response = await fetch('/api/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ counter, authCode })
        });
        const data = await response.json();
        // 生成使用方法的URL和代码
        const domain = window.location.host;
        const title = document.getElementById('previewTitle').value;
        const titleBg = document.getElementById('titleBg').value.replace('#', '%23');
        const countBg = document.getElementById('countBg').value.replace('#', '%23');
        const edgeFlat = document.getElementById('edgeStyle').value;
        const url = \`https://\${domain}/\${counter}.svg?action=hit&title=\${encodeURIComponent(title)}&title_bg=\${titleBg}&count_bg=\${countBg}&edge_flat=\${edgeFlat}\`;
        const monthlyApiUrl = \`https://\${domain}/api/monthly?counter=\${counter}\`;
        document.getElementById('htmlCode').textContent = \`<img src="\${url}" alt="访问计数">\`;
        document.getElementById('markdownCode').textContent = \`![访问计数](\${url})\`;
        document.getElementById('monthlyApiCode').textContent = monthlyApiUrl;
        resultDiv.style.display = 'block';
        if (!response.ok) {
          // 显示错误信息的同时保持结果可见
          errorDiv.textContent = data.error || '创建失败';
          errorDiv.style.display = 'block';
        } else {
          errorDiv.style.display = 'none';
        }
      } catch (e) {
        errorDiv.textContent = '请求失败';
        errorDiv.style.display = 'block';
        // 保持结果可见
        resultDiv.style.display = 'block';
      }
    }
    function copyCode(elementId) {
      const el = document.getElementById(elementId);
      const text = el.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const btn = el.nextElementSibling;
        const originalText = btn.textContent;
        btn.textContent = '已复制！';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      });
    }
    // 初始化预览
    updatePreview();
  </script>
</body>
</html>
  `.trim();
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}
