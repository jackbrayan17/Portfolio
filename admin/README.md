# JB Command Center

Private PWA administration for the portfolio.

## First deployment

1. Deploy on a PHP 8.1+ host with `pdo_sqlite` enabled and HTTPS.
2. Ensure PHP can write to `storage/`. The Apache rule blocks web access; add an equivalent `/storage/` deny rule on Nginx.
3. Open `/admin/` and sign in with the initial credentials supplied by the owner.
4. Immediately open **Settings** and replace the initial password with a unique password of at least 10 characters.
5. Install the PWA from the browser menu on desktop or mobile.

The database is created automatically at `storage/jb-admin.sqlite`. Back it up daily and test restoration periodically. Do not commit it to Git.

## Public lead sources

- `/automatisation/` writes automation quote requests into **Leads**.
- `/sites/` submits website and mobile application briefs into **Leads**.
- Email remains a notification channel; the database is the operational source of truth.

## Security

The admin uses server-side sessions, HTTP-only Strict cookies, CSRF tokens, one-hour inactivity expiry, login throttling, PBKDF2 password hashing, prepared SQL statements and audit logs. Keep HTTPS enabled, update PHP regularly, restrict `storage/`, and never add secrets to frontend files.

## Server checks

```sh
php -l api/jb-core.php
php -l api/admin.php
php -l api/project-request.php
php -l api/devis.php
php -m | grep -i sqlite
```
