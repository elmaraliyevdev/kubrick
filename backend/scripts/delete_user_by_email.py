#!/usr/bin/env python3
"""
One-off maintenance: delete a user row by email so the address can be reused.
Removes token_blacklist rows (no FK) then the user (CASCADE handles refresh_tokens, jobs, otp.user_id, etc.).
Usage: from backend/: python scripts/delete_user_by_email.py user@example.com
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# backend/ as cwd
BACKEND_ROOT = Path(__file__).resolve().parent.parent


def _load_database_url() -> str:
    env_path = BACKEND_ROOT / ".env"
    if not env_path.is_file():
        print("No backend/.env found.", file=sys.stderr)
        sys.exit(1)
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    print("DATABASE_URL not set in backend/.env", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python scripts/delete_user_by_email.py <email>", file=sys.stderr)
        sys.exit(1)

    raw = sys.argv[1].strip()
    if not raw or "@" not in raw:
        print("Invalid email.", file=sys.stderr)
        sys.exit(1)

    # Safe for single-quoted SQL literal (no ' in icloud.com address)
    if "'" in raw:
        print("Email contains a quote; aborting.", file=sys.stderr)
        sys.exit(1)

    try:
        from sqlalchemy import create_engine, text
    except ImportError:
        print("Install dependencies: pip install sqlalchemy psycopg2-binary python-dotenv", file=sys.stderr)
        sys.exit(1)

    url = os.environ.get("DATABASE_URL") or _load_database_url()
    engine = create_engine(url)

    email_lower = raw.lower()

    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT id, email FROM users WHERE lower(email) = :e"),
            {"e": email_lower},
        ).fetchone()
        if row is None:
            print(f"No user found with email matching: {raw!r}")
            return

        uid, db_email = row[0], row[1]
        print(f"Deleting user id={uid} email={db_email!r} ...")

        conn.execute(
            text("DELETE FROM token_blacklist WHERE user_id = :uid"),
            {"uid": uid},
        )
        # otp_codes: older DBs have no user_id column (pre–email-change migration)
        cols = conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = 'otp_codes'"
            )
        ).fetchall()
        col_names = {c[0] for c in cols}
        if "user_id" in col_names:
            conn.execute(
                text(
                    "DELETE FROM otp_codes WHERE lower(email) = :e OR user_id = :uid"
                ),
                {"e": email_lower, "uid": uid},
            )
        else:
            conn.execute(
                text("DELETE FROM otp_codes WHERE lower(email) = :e"),
                {"e": email_lower},
            )
        conn.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": uid})

    print("Done. That email address is free to use again.")


if __name__ == "__main__":
    main()
