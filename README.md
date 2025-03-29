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

## 部署图示

![1743226928598](https://github.com/user-attachments/assets/b0dab5e6-741e-4b25-ad0a-94968a883925)

![1743227024678](https://github.com/user-attachments/assets/1b330664-c21f-4482-95be-895033911dfc)

![1743227069293](https://github.com/user-attachments/assets/aa08ce20-6def-4a12-95f0-0563fb763755)

![图片](https://github.com/user-attachments/assets/f502d54c-fcf8-4f6d-baf5-67379acb3a91)

![图片](https://github.com/user-attachments/assets/a4de8cba-0f3a-48f9-a3a8-8d28576df5a9)

![图片](https://github.com/user-attachments/assets/bdfe3160-fa91-4d88-8b19-64b6abecb391)

![图片](https://github.com/user-attachments/assets/9d2a391c-8b09-4808-a986-ac6be68576f6)

![图片](https://github.com/user-attachments/assets/ca735203-7588-4d26-a580-ac32abbee6fe)

![图片](https://github.com/user-attachments/assets/030fbd0b-6086-4a26-b5eb-a73ff84966ed)

![图片](https://github.com/user-attachments/assets/7d8713e5-5dbc-4df9-b608-8250dc0ab019)

![图片](https://github.com/user-attachments/assets/6f3553f8-78f0-42e9-9590-1c27f120b866)

![图片](https://github.com/user-attachments/assets/ee7d8cc1-137f-427b-881c-564113cc8c11)

![图片](https://github.com/user-attachments/assets/0490e4c5-e4b6-470a-8bfd-77672db71745)
