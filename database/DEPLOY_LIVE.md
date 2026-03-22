# Live server deployment — database & release notes

## 1. Changes since last commit (`2aad109` — “Enhance ticket management and admin interface”)

Your working tree **has not been committed** yet. Summary:

### Modified files (tracked)
| Area | Files |
|------|--------|
| **Backend** | `accountTicketsController.js`, `clientAccountsController.js`, `generalEntriesController.js`, `paymentWalletsController.js`, `admin.js`, `server.js` |
| **Database** | `migration_accounts.sql`, `migration_general_entries.sql`, `run_migrations.sh` |
| **Frontend** | `App.jsx`, admin **Reports** (`ReportsPage.jsx`, `reportsPage.css`), `usersPage.css` |
| **Client Transactions** | `TransactionsBody.jsx`, `transactionsApi.js`, `AmountInputRow.jsx`, `TicketPanel.jsx`, `DepositDetailsStep.jsx`, `transactionsBody.css` |

### New / untracked (not in last commit)
| Area | Items |
|------|--------|
| **Backend** | `routes/deposits.js`, `controllers/admin/depositTicketsController.js`, `middleware/uploadDepositFiles.js`, `utils/generalEntryPersistence.js`, `utils/generalEntryTransactionNumber.js`, `constants/` |
| **Frontend** | `admin/pages/Transactions/` (Deposit admin UI) |
| **Database** | See **§2** — deposit tickets, GE account ids, client account username, etc. |

**Deploy checklist (app):**
1. Deploy backend + frontend build; ensure `server.js` mounts `/api/deposits` and admin deposit routes exist.
2. Ensure upload dirs exist for deposit slips/evidence (see `uploadDepositFiles` / env).
3. Run **SQL migrations** on live MySQL before or during deploy (§3).

---

## 2. Migration files in this repo (reference)

| File | Purpose |
|------|---------|
| `migration_deposit_tickets.sql` | Creates `deposit_tickets` (includes `ledger_transaction_number`, `created_by_user_id` on **new** installs) |
| `migration_deposit_tickets_ledger_transaction_number.sql` | **Idempotent** — adds `ledger_transaction_number` if missing (old DBs) |
| `migration_deposit_tickets_created_by_user_id.sql` | **Idempotent** — adds `created_by_user_id`, backfills from `client_id` |
| `migration_general_entries_add_account_ids.sql` | **Idempotent** — adds `from_account_id` / `to_account_id` on `general_entries` |
| `migration_general_entries_backfill_account_ids.sql` | Safe to re-run — fills NULL ids from text |
| `migration_general_entries_transaction_number.sql` | Transaction numbers on GE (if used) |
| `migration_accounts_client_type.sql` | Adds `client` to `accounts.type` + backfill rows |
| `migration_accounts_strip_client_prefix.sql` | Safe re-run — strips `Client: ` prefix |
| `migration_client_accounts_suggested_username.sql` | **Idempotent** — adds `suggested_username` on `client_accounts` |
| `migration_client_wallets.sql` | Creates `client_wallets` (IF NOT EXISTS; no-op if exists) |
| `migration_withdraw_tickets.sql` | Creates `withdraw_tickets`; adds WD to `general_entry_sequences`; adds `min_withdraw`, `deposit_process_minutes`, `withdraw_process_minutes` to `wallet_companies` |
| `migration_withdraw_tickets_evidence.sql` | **Idempotent** — adds `evidence_path` to `withdraw_tickets` for optional rejection evidence image |
| `migration_withdraw_tickets_slip.sql` | **Idempotent** — adds `slip_path` to `withdraw_tickets` for optional payout slip on approve |

---

## 3. What to run on **LIVE** (existing database)

Run scripts in **this order** (adjust user/database):

```bash
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_accounts_client_type.sql
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_general_entries_add_account_ids.sql
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_general_entries_backfill_account_ids.sql
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_accounts_strip_client_prefix.sql
```

**Deposit tickets** (if the `deposit_tickets` table does **not** exist yet, create it first):

```bash
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_deposit_tickets.sql
```

Then always safe for older tables / partial installs:

```bash
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_deposit_tickets_ledger_transaction_number.sql
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_deposit_tickets_created_by_user_id.sql
```

**Client accounts** (only if `client_accounts` exists):

```bash
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_client_accounts_suggested_username.sql
```

**Client wallets** (if `client_wallets` does not exist):

```bash
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_client_wallets.sql
```

**Withdraw tickets** (requires `client_wallets` table to exist):

```bash
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_withdraw_tickets.sql
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_withdraw_tickets_evidence.sql
mysql -u YOUR_USER -p YOUR_DATABASE < database/migration_withdraw_tickets_slip.sql
```

**Optional** (only if you still use legacy optional scripts from `run_migrations.sh`):

- `migrate_email_to_username.sql`
- `migration_add_columns.sql`

### Fresh database

Use `./database/run_migrations.sh` (or run the **main** loop files in the order defined in `run_migrations.sh`), then run the **incremental** loop in the same file.

---

## 4. Notes

- **Idempotent** scripts can be re-run; they no-op when already applied.
- If live already ran an older `migration_deposit_tickets.sql` **without** `created_by_user_id` / `ledger_transaction_number`, the two small deposit migrations fix that without recreating the table.
- After changing schema, restart the Node process so connection pools see the new structure.

---

## 5. Troubleshooting: `GET /api/admin/general-entries` → 500

The admin **Reports → General entries** list needs `general_entries` to have either:

- **`transaction_number`** (current schema), or  
- **`trx_id`** (legacy), renamed by `migration_general_entries_transaction_number.sql`.

**On live, run (in order):**

1. `migration_general_entries.sql` — if the table does not exist yet.  
2. `migration_general_entries_transaction_number.sql` — if you still have `trx_id` only, this renames it and adds sequences.  
3. `migration_general_entries_add_account_ids.sql` — optional, for From/To **type** filters.

After deploying backend build **`2025-01+`**, the API no longer defaults to a wrong column name; if both columns are missing it returns **200** with an empty list and a **`warning`** field instead of 500. You should still run the migrations so data appears.

Check **Node server logs** (`pm2 logs` / hosting panel) for the real `sqlMessage` if errors persist (e.g. missing `accounts` table, connection errors).
