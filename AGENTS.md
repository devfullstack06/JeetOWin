# AGENTS.md

## Cursor Cloud specific instructions

JeetOWin is a full-stack app with three parts:

- **backend/** — Express (CommonJS) API on port `3000`. Entry: `backend/server.js` (`node server.js`). Uses MySQL via `mysql2`.
- **frontend/** — React 19 + Vite dev server on port `5173` (`npm run dev`). Vite proxies `/api` and `/uploads` to `http://localhost:3000` (see `frontend/vite.config.js`), so run the backend too.
- **database/** — MySQL schema (`schema.sql`) + many `migration_*.sql` files. `frontend_legacy/` is dead static HTML/JS; ignore it.

### Database (MySQL 8 — NOT MariaDB)

- The migrations use MySQL-8-only features (e.g. `utf8mb4_0900_ai_ci` collation). **MariaDB fails**; use MySQL 8.
- The `update_script` only refreshes npm deps. MySQL is installed once during environment setup and its data dir (`/var/lib/mysql`) persists in the VM snapshot, but the **server is not auto-started**. At session start, if `mysqladmin ping` fails, start it: `sudo mysqld --user=mysql` (run it in a tmux/background session).
- Dev DB + app user (already created; recreate only if the data dir was reset):
  - DB `jeetowin`, user `jeetowin` / password `jeetowin` (also `root`/`root`).
  - The unix socket is root-only in this VM; connect over **TCP** (`-h 127.0.0.1 -P 3306`). The backend reads `backend/.env` (gitignored) with `DB_HOST=127.0.0.1`, `DB_USER=jeetowin`, `DB_PASSWORD=jeetowin`, `DB_NAME=jeetowin`, `JWT_SECRET=...`.

### Migration gotchas (pre-existing repo issues, do not "fix" in migrations)

- `database/run_migrations.sh` has `set -e` and stops on the first "already exists" error because several migrations aren't idempotent. To (re)build a fresh DB, run `schema.sql` then loop over all `migration_*.sql` files **twice, continue-on-error** (a second pass resolves cross-file dependency ordering).
- The `revoked_tokens` table has **no migration** but is queried by `backend/middleware/auth.js` on every authenticated request and inserted by logout. Without it, all authenticated calls (and `/api/auth/me`) return `Invalid or expired token`, which breaks login/session. It must exist:
  ```sql
  CREATE TABLE IF NOT EXISTS revoked_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_revoked_token_hash (token_hash)
  );
  ```
- `wallet_companies.id` is `INT`, but `client_wallets` / `payment_wallets` / `deposit_tickets` / `withdraw_tickets` migrations declare `wallet_company_id BIGINT UNSIGNED` and FK to it, so those four tables fail to create (FK type mismatch). This is a pre-existing schema inconsistency; the deposit/withdraw wallet feature depends on those tables. Core auth/admin/most features work without them.

### Backend deps note

- `backend/` code `require`s `bcryptjs`, which is declared in the **root** `package.json`, not `backend/package.json` (Node resolves it from `/workspace/node_modules`). Run `npm install` in both `/workspace` and `/workspace/backend`.

### Lint / test / build

- Frontend lint: `npm run lint` in `frontend/` (works, but reports many pre-existing errors in the repo source).
- There are no automated test suites (`backend` `npm test` is a placeholder that exits 1).
- Frontend prod build: `npm run build` in `frontend/`. For development use `npm run dev`.

### Quick start each session

1. `sudo mysqld --user=mysql` (if not already running).
2. `node server.js` in `backend/`.
3. `npm run dev` in `frontend/`, open `http://localhost:5173`.
