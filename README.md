# hitscounter

![访问计数](https://hits.spiritlhl.net/hitscounter.svg?action=hit&title=Hits&title_bg=%23555555&count_bg=%233aebee&edge_flat=false)

一个基于 Cloudflare Workers 和 D1 数据库的轻量级访问计数器。

## 部署步骤

1. 创建D1数据库
   进入```Cloudflare Dashboard```，导航至 ```Storage & Databases``` > ```D1 SQL Database``` - ```Create```，命名为```hits```，在 ```Console``` 中执行以下SQL创建表:

```sql
CREATE TABLE counters ( name TEXT PRIMARY KEY, count INTEGER DEFAULT 0 );
```

2. 创建Workers
   导航至 ```Workers & Pages``` > ```Create application``` > ```Create Worker``` > ```"Hello World" Worker``` ，新建后重命名为 ```hits``` ，复制 ```hits-worker-code.js``` 代码到Worker编辑器中的```worker.js```应用部署。

3. 设置验证码
   在Worker代码中找到 ```AUTH_CODE``` 常量，将 ```your_auth_code_here``` 修改为你想要的验证码。这个验证码将用于创建新的计数器。

4. 配置域名和绑定
   - 修改 ```ALLOWED_DOMAIN``` 为你的计数器域名
   - 在Worker的 ```Settings > Bindings > Add > D1 Database``` 中：
     - 变量名称输入： ```HITS```
     - 数据库选择： ```hits```
   - 在Worker的 ```Domains & Routes``` - ```Add``` - ```Custom domain``` 中添加你的计数器域名

部署完成后，访问你配置的域名即可看到计数器生成器页面，按照页面提示创建和使用计数器。
