export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env.HITS)
  }
}

const ALLOWED_DOMAIN = 'your.domain.com'
const ALLOWED_PATHS = ['keyword1', 'keyword2', 'keyword3']

async function handleRequest(request, db) {
  const url = new URL(request.url)
  
  // 如果是主页请求，返回徽标生成页面
  if (url.pathname === '/' || url.pathname === '') {
    return serveBadgeGeneratorPage()
  }
  
  if (url.hostname !== ALLOWED_DOMAIN) {
    return new Response('Not Found', { status: 404 })
  }
  
  const pathParts = url.pathname.split('/').filter(Boolean)
  const counterName = pathParts[0]?.replace('.svg', '')
  
  if (!ALLOWED_PATHS.includes(counterName)) {
    return new Response('Not Found', { status: 404 })
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
    const icon = url.searchParams.get('icon') || ''
    
    const svg = generateSvg({
      title,
      titleBg,
      countBg,
      edgeFlat,
      dailyCount: daily,
      totalCount: total,
      icon
    })
    
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
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

async function getCounter(db, key) {
  const { results } = await db.prepare('SELECT count FROM counters WHERE name = ?').bind(key).all()
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

// 加载 SimpleIcons
async function getSimpleIcon(iconName) {
  if (!iconName) return null
  
  try {
    const response = await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/${iconName}.svg`)
    if (response.ok) {
      const svgText = await response.text()
      // 提取路径数据
      const pathMatch = svgText.match(/<path\s+d="([^"]+)"/)
      if (pathMatch && pathMatch[1]) {
        return {
          path: pathMatch[1],
          exists: true
        }
      }
    }
    return { exists: false }
  } catch (e) {
    return { exists: false }
  }
}

function generateSvg({ title, titleBg, countBg, edgeFlat, dailyCount, totalCount, icon }) {
  const borderRadius = edgeFlat ? '0' : '3'
  const countText = `${dailyCount} / ${totalCount}`
  
  // 计算宽度
  let titleWidth = title.length * 7 + 10
  const countWidth = countText.length * 7 + 10
  let iconWidth = 0
  
  // 如果有图标，为图标留空间
  if (icon) {
    iconWidth = 20; // 图标宽度
    titleWidth += iconWidth;
  }
  
  const width = countWidth + titleWidth
  
  // 构建SVG
  let svg = `
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
  `
  
  // 如果有图标，添加图标
  if (icon) {
    svg += `
    <defs>
      <path id="si-${icon}" d="ICON_PATH_PLACEHOLDER" />
    </defs>
    <g transform="translate(10, 10) scale(0.035) translate(-256, -256)" fill="#fff">
      <use xlink:href="#si-${icon}" />
    </g>
    <text x="${titleWidth/2 + 5}" y="15" fill="#010101" fill-opacity=".3">${title}</text>
    <text x="${titleWidth/2 + 5}" y="14" fill="#fff">${title}</text>
    `
  } else {
    svg += `
    <text x="${titleWidth/2}" y="15" fill="#010101" fill-opacity=".3">${title}</text>
    <text x="${titleWidth/2}" y="14" fill="#fff">${title}</text>
    `
  }
  
  svg += `
    <text x="${titleWidth + countWidth/2}" y="15" fill="#010101" fill-opacity=".3">${countText}</text>
    <text x="${titleWidth + countWidth/2}" y="14" fill="#fff">${countText}</text>
  </g>
</svg>
  `.trim()
  
  return svg
}

function serveBadgeGeneratorPage() {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hits! - 徽标生成器</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 30px;
      margin-bottom: 30px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    select, input, button {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }
    input[type="color"] {
      height: 40px;
      cursor: pointer;
    }
    button {
      background-color: #3498db;
      color: white;
      border: none;
      cursor: pointer;
      margin-top: 20px;
      font-weight: bold;
      transition: background-color 0.3s;
    }
    button:hover {
      background-color: #2980b9;
    }
    .preview {
      margin: 20px 0;
      padding: 20px;
      background-color: #f5f5f5;
      border-radius: 4px;
      text-align: center;
    }
    .result {
      margin-top: 20px;
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      font-family: monospace;
      word-break: break-all;
    }
    .copy-btn {
      background-color: #27ae60;
      margin-top: 10px;
    }
    .copy-btn:hover {
      background-color: #219653;
    }
    .tabs {
      display: flex;
      margin-bottom: 20px;
      border-bottom: 1px solid #ddd;
    }
    .tab {
      padding: 10px 20px;
      cursor: pointer;
      margin-right: 5px;
      border-radius: 4px 4px 0 0;
    }
    .tab.active {
      background-color: #3498db;
      color: white;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .gallery-item {
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 4px;
      text-align: center;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .gallery-item:hover {
      transform: scale(1.05);
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    @media (max-width: 768px) {
      .gallery {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      }
    }
    .icon-search {
      margin-bottom: 20px;
    }
    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
      max-height: 300px;
      overflow-y: auto;
      margin-top: 15px;
    }
    .icon-item {
      padding: 10px;
      text-align: center;
      border: 1px solid #eee;
      border-radius: 4px;
      cursor: pointer;
    }
    .icon-item:hover {
      background-color: #f0f0f0;
    }
    .icon-item img {
      width: 24px;
      height: 24px;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hits! - 访问计数徽标生成器</h1>
    <p>基于 Cloudflare Workers 的轻量级访问计数器，支持 SimpleIcons 图标集成</p>
    
    <div class="tabs">
      <div class="tab active" data-tab="generator">徽标生成器</div>
      <div class="tab" data-tab="gallery">预设样式库</div>
      <div class="tab" data-tab="docs">使用文档</div>
    </div>
    
    <div class="tab-content active" id="generator">
      <div class="form-group">
        <label for="counter">计数器标识</label>
        <select id="counter">
          <option value="keyword1">keyword1</option>
          <option value="keyword2">keyword2</option>
          <option value="keyword3">keyword3</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="action">动作类型</label>
        <select id="action">
          <option value="view">仅查看 (view)</option>
          <option value="hit">点击并查看 (hit)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="title">标题文字</label>
        <input type="text" id="title" value="Visits" />
      </div>
      
      <div class="form-group">
        <label for="titleBg">标题背景颜色</label>
        <input type="color" id="titleBg" value="#555555" />
      </div>
      
      <div class="form-group">
        <label for="countBg">计数背景颜色</label>
        <input type="color" id="countBg" value="#79C83D" />
      </div>
      
      <div class="form-group">
        <label for="edgeFlat">边角样式</label>
        <select id="edgeFlat">
          <option value="false">圆角</option>
          <option value="true">直角</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="icon">图标 (来自 SimpleIcons)</label>
        <input type="text" id="icon" placeholder="例如: github" />
        <div class="icon-search">
          <input type="text" id="iconSearch" placeholder="搜索图标..." style="margin-top: 10px;">
          <div class="icon-grid" id="iconGrid"></div>
        </div>
      </div>
      
      <button id="generate">生成徽标</button>
      
      <div class="preview">
        <h3>预览</h3>
        <div id="badgePreview"></div>
      </div>
      
      <div class="result">
        <h3>HTML 代码</h3>
        <code id="htmlCode"></code>
        <button class="copy-btn" data-target="htmlCode">复制 HTML</button>
      </div>
      
      <div class="result">
        <h3>Markdown 代码</h3>
        <code id="markdownCode"></code>
        <button class="copy-btn" data-target="markdownCode">复制 Markdown</button>
      </div>
      
      <div class="result">
        <h3>URL 链接</h3>
        <code id="urlCode"></code>
        <button class="copy-btn" data-target="urlCode">复制 URL</button>
      </div>
    </div>
    
    <div class="tab-content" id="gallery">
      <h2>预设样式库</h2>
      <p>点击任意样式应用到徽标生成器</p>
      
      <div class="gallery" id="styleGallery">
        <!-- 样式库将通过JavaScript动态生成 -->
      </div>
    </div>
    
    <div class="tab-content" id="docs">
      <h2>使用文档</h2>
      
      <h3>基本用法</h3>
      <p>在你的网站或GitHub README中添加以下代码:</p>
      <div class="result">
        <code>&lt;img src="https://your.domain.com/keyword1.svg?action=hit&title=访问量" /&gt;</code>
      </div>
      
      <h3>参数说明</h3>
      <table border="1" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <th style="padding: 8px;">参数</th>
          <th style="padding: 8px;">可选值</th>
          <th style="padding: 8px;">说明</th>
        </tr>
        <tr>
          <td style="padding: 8px;">action</td>
          <td style="padding: 8px;">view / hit</td>
          <td style="padding: 8px;">view只显示计数，hit会增加计数</td>
        </tr>
        <tr>
          <td style="padding: 8px;">title</td>
          <td style="padding: 8px;">任意文本</td>
          <td style="padding: 8px;">徽标左侧显示的文字</td>
        </tr>
        <tr>
          <td style="padding: 8px;">count_bg</td>
          <td style="padding: 8px;">%23后跟颜色代码</td>
          <td style="padding: 8px;">计数区域的背景颜色</td>
        </tr>
        <tr>
          <td style="padding: 8px;">title_bg</td>
          <td style="padding: 8px;">%23后跟颜色代码</td>
          <td style="padding: 8px;">标题区域的背景颜色</td>
        </tr>
        <tr>
          <td style="padding: 8px;">edge_flat</td>
          <td style="padding: 8px;">true / false</td>
          <td style="padding: 8px;">true为直角，false为圆角</td>
        </tr>
        <tr>
          <td style="padding: 8px;">icon</td>
          <td style="padding: 8px;">SimpleIcons图标名</td>
          <td style="padding: 8px;">在标题前显示的图标</td>
        </tr>
      </table>
      
      <h3>JSON 格式</h3>
      <p>也可以获取 JSON 格式的计数数据:</p>
      <div class="result">
        <code>https://your.domain.com/keyword1?action=hit</code>
      </div>
      <p>返回格式:</p>
      <div class="result">
        <code>{
  "counter": "keyword1",
  "action": "hit",
  "total": 1024,
  "daily": 64,
  "date": "2025-03-25",
  "timestamp": "2025-03-25T09:50:53.096Z"
}</code>
      </div>
    </div>
  </div>
  
  <script>
    // SimpleIcons 图标列表 (截取的部分常用图标)
    const simpleIcons = [
      'github', 'twitter', 'facebook', 'instagram', 'linkedin', 'youtube',
      'reddit', 'discord', 'twitch', 'medium', 'npm', 'docker', 'kubernetes',
      'rust', 'python', 'javascript', 'typescript', 'react', 'vuedotjs', 'angular',
      'nodejs', 'php', 'go', 'ruby', 'swift', 'kotlin', 'java', 'csharp',
      'html5', 'css3', 'sass', 'tailwindcss', 'bootstrap', 'postgresql', 'mysql',
      'mongodb', 'redis', 'amazonaws', 'googlecloud', 'microsoftazure',
      'firebase', 'vercel', 'netlify', 'cloudflare', 'githubactions', 'circleci',
      'travisci', 'jira', 'confluence', 'slack', 'telegram', 'whatsapp',
      'wechat', 'wordpress', 'shopify', 'wix', 'figma', 'adobephotoshop',
      'adobeillustrator', 'sketch', 'linux', 'windows', 'apple', 'android'
    ];
    
    // 预设样式库
    const presetStyles = [
      { title: "GitHub", countBg: "#4c1", titleBg: "#555", title: "stars", icon: "github", edgeFlat: "false" },
      { title: "访问量", countBg: "#4c1", titleBg: "#555", title: "访问量", icon: "", edgeFlat: "false" },
      { title: "下载", countBg: "#007ec6", titleBg: "#555", title: "downloads", icon: "npm", edgeFlat: "false" },
      { title: "React", countBg: "#61dafb", titleBg: "#20232a", title: "React", icon: "react", edgeFlat: "false" },
      { title: "Vue", countBg: "#4FC08D", titleBg: "#2c3e50", title: "Vue", icon: "vuedotjs", edgeFlat: "false" },
      { title: "Angular", countBg: "#DD0031", titleBg: "#555", title: "Angular", icon: "angular", edgeFlat: "false" },
      { title: "TypeScript", countBg: "#007ACC", titleBg: "#555", title: "TypeScript", icon: "typescript", edgeFlat: "false" },
      { title: "JavaScript", countBg: "#F7DF1E", titleBg: "#555", title: "JavaScript", icon: "javascript", edgeFlat: "false" },
      { title: "Python", countBg: "#3776AB", titleBg: "#FFD43B", title: "Python", icon: "python", edgeFlat: "false" },
      { title: "Node.js", countBg: "#339933", titleBg: "#555", title: "Node.js", icon: "nodejs", edgeFlat: "false" },
      { title: "Docker", countBg: "#2496ED", titleBg: "#555", title: "Docker", icon: "docker", edgeFlat: "false" },
      { title: "Kubernetes", countBg: "#326CE5", titleBg: "#555", title: "Kubernetes", icon: "kubernetes", edgeFlat: "false" }
    ];
    
    // 生成预设样式库
    function generateStyleGallery() {
      const gallery = document.getElementById('styleGallery');
      
      presetStyles.forEach(style => {
        const hexTitleBg = style.titleBg.replace('#', '%23');
        const hexCountBg = style.countBg.replace('#', '%23');
        
        const item = document.createElement('div');
        item.className = 'gallery-item';
        
        // 构建预览URL
        const previewUrl = \`https://your.domain.com/keyword1.svg?action=view&title=\${style.title}&count_bg=\${hexCountBg}&title_bg=\${hexTitleBg}&edge_flat=\${style.edgeFlat}&icon=\${style.icon}\`;
        
        item.innerHTML = \`
          <img src="\${previewUrl}" alt="\${style.title} 样式" />
          <p>\${style.title}</p>
        \`;
        
        item.addEventListener('click', () => {
          // 应用样式到生成器
          document.getElementById('title').value = style.title;
          document.getElementById('titleBg').value = style.titleBg;
          document.getElementById('countBg').value = style.countBg;
          document.getElementById('edgeFlat').value = style.edgeFlat;
          document.getElementById('icon').value = style.icon;
          
          // 切换到生成器选项卡
          document.querySelector('[data-tab="generator"]').click();
          
          // 立即生成预览
          generateBadge();
        });
        
        gallery.appendChild(item);
      });
    }
    
    // 切换选项卡
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // 移除所有活动标签
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // 设置当前标签为活动
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });
    
    // 生成徽标
    function generateBadge() {
      const counter = document.getElementById('counter').value;
      const action = document.getElementById('action').value;
      const title = document.getElementById('title').value;
      const titleBg = document.getElementById('titleBg').value.replace('#', '%23');
      const countBg = document.getElementById('countBg').value.replace('#', '%23');
      const edgeFlat = document.getElementById('edgeFlat').value;
      const icon = document.getElementById('icon').value;
      
      // 构建URL
      const domain = 'your.domain.com';
      const url = \`https://\${domain}/\${counter}.svg?action=\${action}&title=\${encodeURIComponent(title)}&count_bg=\${countBg}&title_bg=\${titleBg}&edge_flat=\${edgeFlat}\${icon ? '&icon=' + icon : ''}\`;
      
      // 更新预览
      document.getElementById('badgePreview').innerHTML = \`<img src="\${url}" alt="\${title}" />\`;
      
      // 更新代码示例
      document.getElementById('htmlCode').textContent = \`<img src="\${url}" alt="\${title}" />\`;
      document.getElementById('markdownCode').textContent = \`![\${title}](\${url})\`;
      document.getElementById('urlCode').textContent = url;
    }
    
    // 复制按钮功能
    document.querySelectorAll('.copy-btn').forEach(button => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.target;
        const text = document.getElementById(targetId).textContent;
        
        navigator.clipboard.writeText(text).then(() => {
          const originalText = button.textContent;
          button.textContent = '已复制！';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        });
      });
    });
    
    // 加载图标数据
    function loadIconGrid() {
      const iconGrid = document.getElementById('iconGrid');
      
      simpleIcons.forEach(icon => {
        const item = document.createElement('div');
        item.className = 'icon-item';
        item.innerHTML = \`
          <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/\${icon}.svg" alt="\${icon}" />
          <div>\${icon}</div>
        \`;
        
        item.addEventListener('click', () => {
          document.getElementById('icon').value = icon;
        });
        
        iconGrid.appendChild(item);
      });
    }
    
    // 图标搜索功能
    document.getElementById('iconSearch').addEventListener('input', e => {
      const searchTerm = e.target.value.toLowerCase();
      
      document.querySelectorAll('.icon-item').forEach(item => {
        const iconName = item.querySelector('div').textContent.toLowerCase();
        if (searchTerm === '' || iconName.includes(searchTerm)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
    
    // 生成按钮事件
    document.getElementById('generate').addEventListener('click', generateBadge);
    
    // 初始化页面
    document.addEventListener('DOMContentLoaded', () => {
      generateStyleGallery();
      loadIconGrid();
      generateBadge(); // 生成初始预览
    });
  </script>
</body>
</html>
  `;
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
    },
  });
}
