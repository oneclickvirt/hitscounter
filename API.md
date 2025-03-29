# Hits Counter API 文档

## 1. 创建计数器

### 请求
- **URL:** `/api/create`
- **方法:** `POST`
- **请求头:** `Content-Type: application/json`
- **请求体:**
  ```json
  {
    "counter": "my-repo",
    "authCode": "your_auth_code"
  }
  ```
- **说明:**  
  - `counter` 指定计数器名称（如 GitHub 仓库名称）。
  - `authCode` 用于验证身份，防止滥用。

### 返回结果
- **成功创建:**
  ```json
  {
    "success": true
  }
  ```
- **计数器已存在:**
  ```json
  {
    "warning": "计数器已存在，以下是使用方法",
    "exists": true,
    "counter": "my-repo"
  }
  ```
- **错误示例:**
  - **验证码错误**
    ```json
    {
      "error": "验证码错误"
    }
    ```
  - **计数器名称无效**
    ```json
    {
      "error": "计数器名称无效"
    }
    ```

---

## 2. 获取计数器的访问统计

### 请求
- **URL:** `/api/monthly?counter=my-repo`
- **方法:** `GET`
- **说明:**  
  - `counter` 指定需要查询的计数器名称。

### 返回结果
- **示例返回（30 天数据）：**
  ```json
  {
    "days": [
      "2025-02-28",
      "2025-02-27",
      ...
      "2025-02-01"
    ],
    "counts": [
      12,
      34,
      ...
      45
    ]
  }
  ```
  - `days` 数组表示最近 30 天的日期。
  - `counts` 数组表示对应日期的访问量。

- **错误示例:**
  - **缺少计数器名称**
    ```json
    {
      "error": "缺少计数器名称"
    }
    ```
  - **计数器不存在**
    ```json
    {
      "error": "计数器不存在"
    }
    ```

---

## 3. 获取或增加访问计数

### 请求
- **URL:** `https://hits.example.com/my-repo.svg?action=hit`
- **方法:** `GET`
- **说明:**  
  - `my-repo.svg` 表示计数器名称，`.svg` 表示返回一个徽标图片。
  - `action=hit` 表示增加访问计数。

### 返回结果
#### 1. 返回 SVG 图片
- 示例：
  ```xml
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="20">
    <g>
      <text x="10" y="15">Hits: 123</text>
    </g>
  </svg>
  ```
  - 这是一张访问计数的徽标图片。

#### 2. 返回 JSON 数据（如果不带 `.svg` 后缀）
- 示例：
  ```json
  {
    "counter": "my-repo",
    "action": "hit",
    "total": 1234,
    "daily": 56,
    "date": "2025-03-29",
    "timestamp": "2025-03-29T12:34:56Z"
  }
  ```
  - `total` 是总访问量。
  - `daily` 是当天访问量。

---

## 4. 自定义示例徽标

### 请求
- **URL:** `/example.svg?title=Views&title_bg=#555555&count_bg=#79C83D&edge_flat=true`
- **方法:** `GET`
- **说明:**  
  - `title` 自定义标题，如 "Views"。
  - `title_bg` 设置标题背景色。
  - `count_bg` 设置计数背景色。
  - `edge_flat=true` 设为直角边框。

### 返回结果
- **SVG 徽标**
  ```xml
  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="20">
    <g>
      <text x="10" y="15">Views: 123</text>
    </g>
  </svg>
  ```
  - 自定义的访问计数徽标。

---

## 总结
1. `/api/create` 允许创建计数器（需要验证码）。
2. `/api/monthly` 获取某个计数器的最近 30 天访问量。
3. `/my-repo.svg?action=hit` 记录访问量并返回 SVG 或 JSON。
4. `/example.svg` 生成示例徽标，允许自定义样式。
