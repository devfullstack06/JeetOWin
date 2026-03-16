#!/bin/bash
# Run all database migrations in order.
# Usage: ./run_migrations.sh [mysql_user] [mysql_database]
# Or set env: MYSQL_USER, MYSQL_DB, MYSQL_PWD
# Example: MYSQL_PWD=yourpass ./run_migrations.sh root jeetowin

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

USER="${1:-${MYSQL_USER:-root}}"
DB="${2:-${MYSQL_DB:-jeetowin}}"

echo "Running migrations for database: $DB (user: $USER)"
echo "================================================"

# Order matters - run in dependency order
for f in schema.sql \
  migration_wallet_companies.sql \
  migration_wallet_companies_add_icon_svg.sql \
  migration_wallet_companies_deposit_withdraw.sql \
  migration_payment_wallets.sql \
  migration_general_entries.sql \
  migration_admin_account_balance.sql \
  migration_accounts.sql; do
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

# Optional migrations (may not exist or may have been run)
for f in migrate_email_to_username.sql migration_add_columns.sql; do
  if [ -f "$f" ]; then
    echo "Running $f (optional)..."
    if [ -n "$MYSQL_PWD" ]; then
      mysql -u "$USER" "$DB" < "$f" 2>/dev/null || echo "  Skipped (may already be applied)"
    else
      mysql -u "$USER" -p "$DB" < "$f" 2>/dev/null || echo "  Skipped (may already be applied)"
    fi
  fi
done

echo "================================================"
echo "Migrations complete."
