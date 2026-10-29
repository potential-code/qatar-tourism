#!/bin/sh
# Runs on every container start (nginx image entrypoint hook). Writes the htpasswd file from
# BASIC_AUTH_USER / BASIC_AUTH_PASS. If either is missing, the guard stays a blanket 503 so
# the site is never served unprotected. BASIC_AUTH=off serves it openly (local runs only).
set -eu

conf=/etc/nginx/basic-auth.conf

if [ "${BASIC_AUTH:-}" = "off" ]; then
  : > "$conf"
  echo "basic-auth: off (BASIC_AUTH=off)"
elif [ -n "${BASIC_AUTH_USER:-}" ] && [ -n "${BASIC_AUTH_PASS:-}" ]; then
  htpasswd -bcB /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASS" >/dev/null 2>&1
  printf 'auth_basic "Qatar Tourism Academy mockup";\nauth_basic_user_file /etc/nginx/.htpasswd;\n' > "$conf"
  echo "basic-auth: enabled for user $BASIC_AUTH_USER"
else
  printf 'return 503;\n' > "$conf"
  echo "basic-auth: BASIC_AUTH_USER/BASIC_AUTH_PASS not set, serving 503" >&2
fi
