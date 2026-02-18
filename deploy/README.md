# Deployment: erp.orderinvests.net

## 1. DNS Setup

Add an **A record** in your DNS provider:

| Type | Name | Value      | TTL  |
|------|------|------------|------|
| A    | erp  | 62.84.189.9 | 300  |

(Or `erp.orderinvests.net` → `62.84.189.9` depending on your DNS UI)

Wait 5–30 minutes for propagation.

---

## 2. Option A: Dev server (http://erp.orderinvests.net:5173/)

After DNS propagates, open:

**http://erp.orderinvests.net:5173/**

No nginx needed. Vite is already configured to accept this host.

---

## 3. Option B: Port 80 via nginx (http://erp.orderinvests.net/)

### Windows

1. **Install nginx**: Download from [nginx.org](https://nginx.org/en/download.html), extract to `C:\nginx`.

2. **Include the config** in `C:\nginx\conf\nginx.conf` — add inside the `http { }` block:

   ```nginx
   include C:/Users/Administrator/Documents/GitHub/PipLineProV2/deploy/nginx-erp.conf;
   ```

   Or copy the server block from `deploy/nginx-erp.conf` into the `http` block.

3. **Allow port 80** in Windows Firewall (run PowerShell as Admin):

   ```powershell
   netsh advfirewall firewall add rule name="HTTP 80" dir=in action=allow protocol=TCP localport=80
   ```

4. **Test and start nginx** (from `C:\nginx`):

   ```powershell
   nginx -t
   nginx
   ```

   To reload after config changes: `nginx -s reload`

5. Keep `npm run dev` running. Access: **http://erp.orderinvests.net/**

### Linux (Dev server behind nginx)

```bash
# Copy config
sudo cp deploy/nginx-erp.conf /etc/nginx/sites-available/erp
sudo ln -s /etc/nginx/sites-available/erp /etc/nginx/sites-enabled/

# Edit: ensure proxy_pass points to 127.0.0.1:5173
# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

Keep `npm run dev` running. Access: **http://erp.orderinvests.net/**

### Production (static files)

1. Build: `npm run build`
2. Edit `deploy/nginx-erp-production.conf`: set `root` to your `dist/` path
3. Copy and enable the config
4. Reload nginx

---

## 4. Supabase

In Supabase Dashboard:

- **Auth → URL Configuration**: add `https://erp.orderinvests.net` (and `http://` for dev)
- **Edge Functions → Secrets**: add `https://erp.orderinvests.net` to `ALLOWED_ORIGINS`
