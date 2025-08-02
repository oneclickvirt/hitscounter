export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env.HITS)
  }
}
const ALLOWED_DOMAIN = '' // 设置你的域名
const AUTH_CODE = '' // 设置你的验证码
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
        return new Response(JSON.stringify({
          warning: '计数器已存在，以下是使用方法',
          exists: true,
          counter: counter
        }), {
          status: 200,
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
  <title>Hits访问计数器</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      text-align: center;
      color: #2c3e50;
      font-size: 32px;
      margin-bottom: 30px;
    }
    .section-title {
      color: #2c3e50;
      border-bottom: 2px solid #eee;
      padding-bottom: 8px;
      margin-top: 30px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
      color: #546e7a;
    }
    input, select {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
      font-size: 16px;
    }
    input:focus, select:focus {
      border-color: #2196F3;
      outline: none;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
    }
    small {
      display: block;
      color: #757575;
      margin-top: 5px;
    }
    .color-input {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .color-input input[type="color"] {
      width: 50px;
      height: 40px;
      padding: 2px;
    }
    .color-input input[type="text"] {
      flex: 1;
    }
    button {
      background: #2196F3;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      transition: background 0.3s;
      width: 100%;
    }
    button:hover {
      background: #1976D2;
    }
    .copy-btn {
      background: #607D8B;
      margin-top: 8px;
      font-size: 14px;
      width: auto;
    }
    .copy-btn:hover {
      background: #455A64;
    }
    .result {
      margin-top: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 4px;
      display: none;
    }
    .preview {
      margin: 20px 0;
      padding: 15px;
      border-radius: 4px;
      text-align: center;
    }
    .preview-controls {
      margin: 20px 0;
      padding: 20px;
      background: #fff;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    .warning {
      color: #ff9800;
      margin-top: 10px;
      display: none;
      background-color: #fff3e0;
      padding: 10px 15px;
      border-radius: 4px;
    }
    .error {
      color: #f44336;
      margin-top: 10px;
      display: none;
      background-color: #ffebee;
      padding: 10px 15px;
      border-radius: 4px;
    }
    code {
      display: block;
      padding: 15px;
      background: #263238;
      color: #fff;
      border-radius: 4px;
      margin: 10px 0;
      word-break: break-all;
      font-family: monospace;
      position: relative;
    }
    .preview-badge {
      margin: 20px 0;
      display: none;
      background: #fff;
      padding: 20px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center;
    }
    .live-badge {
      margin: 10px 0;
      display: none;
    }
    .result-group {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin: 20px 0;
    }
    .code-group {
      flex: 1;
    }
    .code-group p {
      font-weight: bold;
      color: #546e7a;
    }
    .badge-preview {
      text-align: center;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 4px;
      margin-top: 10px;
    }
    footer {
      margin-top: 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
      padding: 20px 0;
      border-top: 1px solid #eee;
    }
    footer a {
      color: #2196F3;
      text-decoration: none;
    }
    footer a:hover {
      text-decoration: underline;
    }
    .options {
      margin-top: 30px;
    }
    .options-header {
      font-size: 18px;
      color: #2196F3;
      margin-bottom: 15px;
    }
    .options-description {
      color: #757575;
      margin-bottom: 20px;
    }
    .preview-title {
      font-weight: bold;
      margin-bottom: 10px;
      color: #546e7a;
    }
    .badge-display {
      margin: 25px 0;
      text-align: center;
    }
    .badge-display img {
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    @media (min-width: 768px) {
      .result-group {
        flex-direction: row;
      }
      button {
        width: auto;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>GENERATE BADGE</h1>
    <!-- 创建计数器部分 -->
    <div class="form-group">
      <label for="counter">计数器名称</label>
      <input type="text" id="counter" pattern="[a-zA-Z0-9_-]+" placeholder="" required>
      <small>仅允许字母、数字、下划线和连字符，建议使用仓库名称</small>
    </div>
    <div class="form-group">
      <label for="authCode">验证码</label>
      <input type="password" id="authCode" required>
      <small>创建计数器需要验证码，请联系站长获取</small>
    </div>
    <!-- 自定义样式部分 -->
    <div class="options">
      <div class="form-group">
        <label for="edgeStyle">BORDER</label>
        <select id="edgeStyle" onchange="updatePreview()">
          <option value="false">ROUND</option>
          <option value="true">SQUARE</option>
        </select>
      </div>
      <div class="form-group">
        <label for="previewTitle">TITLE</label>
        <input type="text" id="previewTitle" value="hits" onchange="updatePreview()">
      </div>
      <div class="form-group">
        <label for="titleBg">TITLE BG COLOR</label>
        <div class="color-input">
          <input type="color" id="titleBgColor" value="#555555" onchange="updatePreview()">
          <input type="text" id="titleBg" value="#555555" onchange="updatePreview()">
        </div>
      </div>
      <div class="form-group">
        <label for="countBg">COUNT BG COLOR</label>
        <div class="color-input">
          <input type="color" id="countBgColor" value="#3aebee" onchange="updatePreview()">
          <input type="text" id="countBg" value="#3aebee" onchange="updatePreview()">
        </div>
      </div>
    </div>
    <div class="badge-display">
      <div class="preview-badge" id="previewBadge">
        <img src="/example.svg" alt="预览徽标">
      </div>
    </div>
    <button onclick="createCounter()">GENERATE BADGE</button>
    <div id="warning" class="warning"></div>
    <!-- 使用方法部分 -->
    <div id="result" class="result">
      <h3 class="section-title">MARKDOWN</h3>
      <div class="code-group">
        <code id="markdownCode"></code>
        <button class="copy-btn" onclick="copyCode('markdownCode')">COPY</button>
        <div class="badge-preview">
          <div id="markdownPreview" class="live-badge"></div>
        </div>
      </div>
      <h3 class="section-title">HTML LINK</h3>
      <div class="code-group">
        <code id="htmlCode"></code>
        <button class="copy-btn" onclick="copyCode('htmlCode')">COPY</button>
        <div class="badge-preview">
          <div id="htmlPreview" class="live-badge"></div>
        </div>
      </div>
      <h3 class="section-title">EMBED URL (NOTION)</h3>
      <div class="code-group">
        <code id="embedCode"></code>
        <button class="copy-btn" onclick="copyCode('embedCode')">COPY</button>
      </div>
      <div class="options-description">
        <p>参数说明：</p>
        <ul>
          <li>title: 修改显示文字</li>
          <li>count_bg: 计数背景色（将#替换为%23）</li>
          <li>title_bg: 标题背景色（将#替换为%23）</li>
          <li>edge_flat: 是否使用直角（true/false）</li>
          <li>action: 设为hit时增加计数，默认仅查看</li>
        </ul>
      </div>
    </div>
    <div id="error" class="error"></div>
  </div>
  <footer>
    本项目开源于 <a href="https://github.com/oneclickvirt/hitscounter" target="_blank">github.com/oneclickvirt/hitscounter</a>
  </footer>
  <script>
    // 页面加载时恢复保存的数据
    window.addEventListener('load', function() {
      const savedData = JSON.parse(localStorage.getItem('hitsCounterData') || '{}');
      // 恢复表单数据
      if (savedData.counter) document.getElementById('counter').value = savedData.counter;
      if (savedData.authCode) document.getElementById('authCode').value = savedData.authCode;
      if (savedData.title) document.getElementById('previewTitle').value = savedData.title;
      if (savedData.titleBg) {
        document.getElementById('titleBg').value = savedData.titleBg;
        document.getElementById('titleBgColor').value = savedData.titleBg;
      }
      if (savedData.countBg) {
        document.getElementById('countBg').value = savedData.countBg;
        document.getElementById('countBgColor').value = savedData.countBg;
      }
      if (savedData.edgeFlat) document.getElementById('edgeStyle').value = savedData.edgeFlat;
      // 如果有已创建的计数器，显示实际徽标
      if (savedData.createdUrl) {
        showCreatedBadge(savedData.createdUrl);
      } else {
        document.getElementById('previewBadge').style.display = 'block';
      }
    });
    function saveFormData() {
      const data = {
        counter: document.getElementById('counter').value,
        authCode: document.getElementById('authCode').value,
        title: document.getElementById('previewTitle').value,
        titleBg: document.getElementById('titleBg').value,
        countBg: document.getElementById('countBg').value,
        edgeFlat: document.getElementById('edgeStyle').value
      };
      localStorage.setItem('hitsCounterData', JSON.stringify(data));
    }
    function updatePreview() {
      const title = document.getElementById('previewTitle').value;
      const titleBg = document.getElementById('titleBg').value.replace('#', '%23');
      const countBg = document.getElementById('countBg').value.replace('#', '%23');
      const edgeFlat = document.getElementById('edgeStyle').value;
      const previewUrl = \`/example.svg?title=\${encodeURIComponent(title)}&title_bg=\${titleBg}&count_bg=\${countBg}&edge_flat=\${edgeFlat}\`;
      document.getElementById('previewBadge').innerHTML = \`<img src="\${previewUrl}" alt="预览徽标">\`;
      saveFormData();
    }
    function showCreatedBadge(url) {
      const domain = window.location.host;
      const title = document.getElementById('previewTitle').value || 'Hits';
      document.getElementById('previewBadge').style.display = 'none';
      document.getElementById('htmlPreview').innerHTML = \`<a href="https://\${domain}"><img src="\${url}" alt="\${title}"></a>\`;
      document.getElementById('markdownPreview').innerHTML = \`<a href="https://\${domain}"><img src="\${url}" alt="\${title}"></a>\`;
      document.getElementById('htmlPreview').style.display = 'block';
      document.getElementById('markdownPreview').style.display = 'block';
    }
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
      const warningDiv = document.getElementById('warning');
      try {
        const response = await fetch('/api/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ counter, authCode })
        });
        const data = await response.json();
        errorDiv.style.display = 'none';
        warningDiv.style.display = 'none';
        resultDiv.style.display = 'none';
        if (!response.ok) {
          errorDiv.textContent = data.error || '创建失败';
          errorDiv.style.display = 'block';
          return;
        }
        const domain = window.location.host;
        const title = document.getElementById('previewTitle').value || 'hits';
        const titleBg = document.getElementById('titleBg').value.replace('#', '%23');
        const countBg = document.getElementById('countBg').value.replace('#', '%23');
        const edgeFlat = document.getElementById('edgeStyle').value;
        const url = \`https://\${domain}/\${counter}.svg?action=hit&title=\${encodeURIComponent(title)}&title_bg=\${titleBg}&count_bg=\${countBg}&edge_flat=\${edgeFlat}\`;
        const encodedUrl = encodeURIComponent(\`https://\${domain}/\${counter}.svg?action=hit&title=\${encodeURIComponent(title)}&title_bg=\${titleBg}&count_bg=\${countBg}&edge_flat=\${edgeFlat}\`);
        // 保存创建的URL
        const savedData = JSON.parse(localStorage.getItem('hitsCounterData') || '{}');
        savedData.createdUrl = url;
        localStorage.setItem('hitsCounterData', JSON.stringify(savedData));
        document.getElementById('markdownCode').textContent = \`[![\${title}](\${url})](https://\${domain})\`;
        document.getElementById('htmlCode').textContent = \`<a href="https://\${domain}"><img src="\${url}" alt="\${title}"></a>\`;
        document.getElementById('embedCode').textContent = url;
        showCreatedBadge(url);
        if (data.exists) {
          warningDiv.textContent = data.warning;
          warningDiv.style.display = 'block';
        }
        resultDiv.style.display = 'block';
      } catch (e) {
        errorDiv.textContent = '请求失败';
        errorDiv.style.display = 'block';
        resultDiv.style.display = 'none';
        warningDiv.style.display = 'none';
      }
    }
    function copyCode(elementId) {
      const el = document.getElementById(elementId);
      const text = el.textContent;
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        const btn = el.nextElementSibling;
        const originalText = btn.textContent;
        if (successful) {
          btn.textContent = 'COPIED!';
        } else {
          btn.textContent = 'COPY FAILED';
        }
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('复制失败:', err);
      }
      document.body.removeChild(textArea);
    }
    updatePreview();
  </script>
</body>
</html>
  `.trim();
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}
