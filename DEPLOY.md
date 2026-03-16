# Deployment Guide - JeetOWin

## 1. Pull Code on Live Server

```bash
cd /path/to/your/project
git pull origin main
```

## 2. Run Database Migrations (MySQL)

Run migrations in this order:

```bash
cd database

# Set your MySQL credentials (or use -u and -p in each command)
export MYSQL_USER=your_mysql_user
export MYSQL_DB=jeetowin

# Run all migrations in order
# mysql -u $MYSQL_USER -p $MYSQL_DB < schema.sql
mysql -u $MYSQL_USER -p $MYSQL_DB < migration_wallet_companies.sql
mysql -u $MYSQL_USER -p $MYSQL_DB < migration_wallet_companies_add_icon_svg.sql
mysql -u $MYSQL_USER -p $MYSQL_DB < migration_wallet_companies_deposit_withdraw.sql
mysql -u $MYSQL_USER -p $MYSQL_DB < migration_payment_wallets.sql
mysql -u $MYSQL_USER -p $MYSQL_DB < migration_general_entries.sql
mysql -u $MYSQL_USER -p $MYSQL_DB < migration_admin_account_balance.sql
mysql -u $MYSQL_USER -p $MYSQL_DB < migration_accounts.sql
mysql -u $MYSQL_USER -p $MYSQL_DB < migration_wallet_companies_icon_path.sql
```

Or use the script (Linux/Mac):

```bash
chmod +x database/run_migrations.sh
MYSQL_PWD=yourpassword ./database/run_migrations.sh your_user jeetowin
```

**Note:** If some tables already exist, skip or modify those migration steps. Use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` where possible. Some migrations may fail with "already exists" — that's fine if you've run them before.

## 3. Backend Setup

```bash
cd backend
npm install
```

Create/update `.env`:

```
PORT=3000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=jeetowin
JWT_SECRET=your_secret_key
```

Start backend (with PM2 for production):

```bash
pm2 start server.js --name jeetowin-api
# or: node server.js
```

## 4. Frontend Build

```bash
cd frontend
npm install
npm run build
```

Build output goes to `frontend/dist/`. Serve this folder with nginx, Apache, or your hosting provider's static file serving.

## 5. Environment Variables for Frontend

If your API URL differs on production, set in `frontend/.env` (or `frontend/.env.production`):

```
VITE_API_BASE_URL=https://your-api-domain.com/api
```

Then rebuild: `npm run build`

## 6. Nginx Example (optional)

To avoid **413 Request Entity Too Large** on wallet icon uploads and large API bodies, set `client_max_body_size` (e.g. in `http` or `server`). Example:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    client_max_body_size 10M;

    root /path/to/project/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /uploads {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

- **client_max_body_size 10M** — allows uploads (e.g. wallet SVG icons) and large JSON bodies without 413.
- **Cache-Control** on `/uploads` — lets browsers and CDNs cache wallet icons (and other static uploads) for 1 year. Omit if you prefer shorter cache.

## 7. Quick Migration-Only Command (for existing DB)

If you already have the base schema and only need new migrations:

```bash
cd /path/to/project/database

mysql -u USER -p jeetowin < migration_general_entries.sql
mysql -u USER -p jeetowin < migration_admin_account_balance.sql
mysql -u USER -p jeetowin < migration_accounts.sql
```

## Migration Order Summary

| Order | File | Purpose |
|-------|------|---------|
| 1 | schema.sql | Base tables |
| 2 | migration_wallet_companies.sql | Wallet companies |
| 3 | migration_wallet_companies_add_icon_svg.sql | Icon SVG column |
| 4 | migration_wallet_companies_deposit_withdraw.sql | Deposit/withdraw flags |
| 5 | migration_payment_wallets.sql | Payment wallets |
| 6 | migration_general_entries.sql | General ledger entries |
| 7 | migration_admin_account_balance.sql | Admin account balance |
| 8 | migration_accounts.sql | Accounts table (account-based ledger) |
| 9 | migration_wallet_companies_icon_path.sql | Icon file path (file-based wallet icons) |
