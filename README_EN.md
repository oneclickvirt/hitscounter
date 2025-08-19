# hitscounter

![Visit Counter](https://hits.spiritlhl.net/hitscounter.svg?action=hit&title=Hits&title_bg=%23555555&count_bg=%233aebee&edge_flat=false)

A lightweight visit counter based on **Cloudflare Workers** and **D1 Database**.

## Deployment Guide

1. **Create a D1 Database**  
   Go to **Cloudflare Dashboard** → **Storage & Databases** → **D1 SQL Database** → **Create**, name it `hits`, then run the following SQL in the **Console**:

   ```sql
   CREATE TABLE counters ( name TEXT PRIMARY KEY, count INTEGER DEFAULT 0 );
   ```

2. **Create a Worker**
   Navigate to **Workers & Pages** → **Create application** → **Create Worker** → choose **"Hello World" Worker**.
   Rename it to `hits` and copy the code from `hits-worker-code.js` into the Worker editor (`worker.js`). Deploy it.

3. **Set Authentication Code**
   In the Worker code, locate the `AUTH_CODE` constant and replace `your_auth_code_here` with your own secret code.
   This code is required to create new counters.

4. **Configure Domain and Bindings**

   * Update the `ALLOWED_DOMAIN` constant in the Worker code to your counter’s domain (without protocol).
   * In **Worker Settings > Bindings > Add > D1 Database**:

     * Variable name: `HITS`
     * Database: `hits`
   * In **Domains & Routes** → **Add** → **Custom domain**, bind your counter domain.

After the deployment is complete, visit your configured domain to see the counter generator page, follow the page prompts to create and use counters.

Only 30 days of daily access records are retained, only the total number of records exceeding 30 days are counted, so as to avoid the unlimited increase of the database over time to exhaust the free credits.

**Please be careful not to disclose the authentication code you set when deploying, no authentication code can not create a new counter SVG, to avoid others to create an increase in free credits consumption**.

## Free Plan Quota

Cloudflare provides generous free limits, which are sufficient for personal usage:
[https://blog.cloudflare.com/making-full-stack-easier-d1-ga-hyperdrive-queues/](https://blog.cloudflare.com/making-full-stack-easier-d1-ga-hyperdrive-queues/)

![Quota Example](https://github.com/user-attachments/assets/27586cd9-8943-4911-8770-4e74e208c63c)

## Deployment Screenshots

<details>
<summary>Click to view detailed screenshots</summary>

![step1](https://github.com/user-attachments/assets/b0dab5e6-741e-4b25-ad0a-94968a883925)
![step2](https://github.com/user-attachments/assets/1b330664-c21f-4482-95be-895033911dfc)
![step3](https://github.com/user-attachments/assets/aa08ce20-6def-4a12-95f0-0563fb763755)
![step4](https://github.com/user-attachments/assets/f502d54c-fcf8-4f6d-baf5-67379acb3a91)
![step5](https://github.com/user-attachments/assets/a4de8cba-0f3a-48f9-a3a8-8d28576df5a9)
![step6](https://github.com/user-attachments/assets/bdfe3160-fa91-4d88-8b19-64b6abecb391)
![step7](https://github.com/user-attachments/assets/9d2a391c-8b09-4808-a986-ac6be68576f6)
![step8](https://github.com/user-attachments/assets/ca735203-7588-4d26-a580-ac32abbee6fe)
![step9](https://github.com/user-attachments/assets/030fbd0b-6086-4a26-b5eb-a73ff84966ed)
![step10](https://github.com/user-attachments/assets/7d8713e5-5dbc-4df9-b608-8250dc0ab019)
![step11](https://github.com/user-attachments/assets/6f3553f8-78f0-42e9-9590-1c27f120b866)
![step12](https://github.com/user-attachments/assets/ee7d8cc1-137f-427b-881c-564113cc8c11)
![step13](https://github.com/user-attachments/assets/0490e4c5-e4b6-470a-8bfd-77672db71745)

</details>

## Example

[![hits](https://hits.spiritlhl.net/goecs.svg?action=hit\&title=hits\&title_bg=%23555555\&count_bg=%233aebee\&edge_flat=false)](https://hits.spiritlhl.net)

![goecs Chart](https://hits.spiritlhl.net/chart/goecs.svg)

## Thanks

Special thanks to [hits.seeyoufarm.com](https://hits.seeyoufarm.com), which provided a similar service in the past.

The original project [gjbae1212/hit-counter](https://github.com/gjbae1212/hit-counter) has been archived, and this project was inspired by it.
