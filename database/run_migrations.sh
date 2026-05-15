#!/bin/bash
# Run all database migrations in order.
# Usage: ./run_migrations.sh [mysql_user] [mysql_database]
# Or set env: MYSQL_USER, MYSQL_DB, MYSQL_PWD
# Example: MYSQL_PWD=yourpass ./run_migrations.sh root jeetowin
#
# For LIVE incremental updates, see database/DEPLOY_LIVE.md

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

USER="${1:-${MYSQL_USER:-root}}"
DB="${2:-${MYSQL_DB:-jeetowin}}"

echo "Running migrations for database: $DB (user: $USER)"
echo "================================================"

# Order matters - run in dependency order (fresh / CI)
for f in schema.sql \
  migration_wallet_companies.sql \
  migration_wallet_companies_add_icon_svg.sql \
  migration_wallet_companies_deposit_withdraw.sql \
  migration_client_wallets.sql \
  migration_payment_wallets.sql \
  migration_deposit_tickets.sql \
  migration_general_entries.sql \
  migration_admin_account_balance.sql \
  migration_accounts.sql \
  migration_general_entries_transaction_number.sql; do
  if [ -f "$f" ]; then
    echo "Running $f..."
    if [ -n "$MYSQL_PWD" ]; then
      mysql -u "$USER" "$DB" < "$f"
    else
      mysql -u "$USER" -p "$DB" < "$f"
    fi
    echo "  OK"
  else
    echo "Skipping $f (not found)"
  fi
done

# Incremental / idempotent (safe on existing DBs; no-op when already applied)
for f in migration_accounts_client_type.sql \
  migration_general_entries_add_account_ids.sql \
  migration_general_entries_backfill_account_ids.sql \
  migration_accounts_strip_client_prefix.sql \
  migration_deposit_tickets_ledger_transaction_number.sql \
  migration_deposit_tickets_created_by_user_id.sql \
  migration_client_accounts_suggested_username.sql \
  migration_client_accounts_initial_password.sql \
  migration_client_accounts_created_by_username.sql \
  migration_withdraw_tickets.sql \
  migration_withdraw_tickets_evidence.sql \
  migration_withdraw_tickets_slip.sql \
  migration_users_last_login_at.sql \
  migration_clients_notes.sql \
  migration_promotions.sql \
  migration_promotions_status_flags.sql \
  migration_promotions_cta_popup.sql; do
  if [ -f "$f" ]; then
    echo "Running $f (incremental)..."
    if [ -n "$MYSQL_PWD" ]; then
      mysql -u "$USER" "$DB" < "$f"
    else
      mysql -u "$USER" -p "$DB" < "$f"
    fi
    echo "  OK"
  fi
done

# Legacy optional (may error if already applied — ignored)
for f in migrate_email_to_username.sql migration_add_columns.sql; do
  if [ -f "$f" ]; then
    echo "Running $f (legacy optional)..."
    if [ -n "$MYSQL_PWD" ]; then
      mysql -u "$USER" "$DB" < "$f" 2>/dev/null || echo "  Skipped (may already be applied)"
    else
      mysql -u "$USER" -p "$DB" < "$f" 2>/dev/null || echo "  Skipped (may already be applied)"
    fi
  fi
done

echo "================================================"
echo "Migrations complete."
