# Client Chat Integration

## Environment fallback settings

Set these in your frontend env file (used as fallback if API settings are unavailable):

- `VITE_CHAT_PROVIDER=tawk`
- `VITE_TAWK_SRC=https://embed.tawk.to/698386442e3d611c421de86a/1jgks8vk2`

To disable chat quickly:

- `VITE_CHAT_PROVIDER=none`

## Current behavior

- Chat loads only on client routes.
- Chat is hidden on `/admin/*`, `/login`, `/signup`, and `/terms`.
- Widget starts minimized (floating bubble style).
- Runtime settings are fetched from `/api/chat-widget/settings`.

## Operations setup (Tawk dashboard)

1. Add agent accounts and roles.
2. Configure business hours and away/offline behavior.
3. Add canned responses and greeting triggers.
4. Set widget position/offset in Tawk dashboard if any page overlap appears.

## Admin control (Phase B)

- Admin page: `/admin/content/chat`
- API:
  - `GET /api/admin/chat-widget-settings`
  - `PATCH /api/admin/chat-widget-settings`
- DB migration:
  - `database/migration_chat_widget_settings.sql`

This allows provider switching and script URL replacement from admin without frontend redeploy.
