# CSRF and cookie-based authentication

Kubrick stores JWT **access** and **refresh** tokens in **httpOnly** cookies (see `backend/app/core/security.py`). The browser sends them on credentialed requests (`fetch` / Axios with `withCredentials: true` in the dashboard app).

That pattern is strong against **XSS stealing tokens** (httpOnly), but **cookie-based sessions** are still subject to **CSRF** unless you have a deliberate strategy.

This document is the project’s **CSRF story**: what we rely on today, what breaks that model, and how to harden further.

---

## How auth works today

1. **Token resolution** (`get_current_user` / `_extract_token`): the API accepts the access JWT from the **`access_token` cookie first**, then falls back to the **`Authorization: Bearer`** header.
2. **Refresh**: `POST /api/auth/refresh` uses the **`refresh_token` cookie** (scoped to path `/api/auth`).
3. **CORS**: `ALLOWED_ORIGINS` in the backend restricts which browser origins may use credentialed cross-origin requests.
4. **SameSite**: `AUTH_COOKIE_SAMESITE` (default **`lax`**) and optional `AUTH_COOKIE_DOMAIN` control how cookies are attached to cross-site requests.

---

## CSRF threat (short)

An attacker’s page (another origin) tries to trigger a **state-changing** request to your API **using the victim’s cookies** (e.g. hidden form POST, or script-driven request if cookies are sent).

If the request is authenticated **only** because the browser attached cookies, and the server cannot tell that the request came from **your** frontend, that is a classic CSRF problem.

---

## What SameSite gives you (and what it does not)

| Setting | Typical effect |
|--------|----------------|
| **`Lax` (default)** | Cookies are **not** sent on cross-site **subresource** requests (e.g. `fetch` from `evil.com` → your API). They **are** sent on **top-level navigations** with “safe” methods (e.g. GET). **Unsafe** cross-site requests (e.g. POST from a form on another site) generally **do not** get `Lax` cookies in modern browsers. |
| **`Strict`** | Stronger: no cookie on any cross-site request, including top-level GET. |
| **`None`** | Cookie sent on cross-site requests, but **requires `Secure`**. Needed for some **cross-site** SPA + API setups; **increases CSRF surface** unless you add other defenses (CSRF tokens, custom headers, or strict Origin checks). |

**Important:** “Same-site” is **not** the same as “same origin”. Two hosts under the same **site** (e.g. `app.example.com` and `api.example.com`) can still be **same-site** for cookie purposes when `Domain` is set appropriately (e.g. `.example.com`). That is convenient for subdomains but means you should not assume “different subdomains” alone block cookies.

**Brittle parts:**

- Deployments where the SPA and API are **true cross-site** (different registrable domains) often push you toward **`SameSite=None; Secure`**, which **does not** give you Lax-style CSRF mitigation for credentialed XHR.
- **Local dev** (`localhost` with different ports) is a special case; behavior can differ from production. Do not infer production CSRF posture from localhost alone.

---

## What we rely on operationally

1. **SameSite `lax` by default** — good baseline when the app and API are deployed in a **same-site** configuration compatible with Lax.
2. **CORS allowlist** — reduces who can trigger **browser-based** credentialed XHR from web pages; it is **not** a complete CSRF defense by itself (same-origin policy + credentialed CORS interact in subtle ways), but it is required for the SPA and should stay **minimal** in production.
3. **Refresh cookie path** — `refresh_token` is limited to `/api/auth`, shrinking where it is sent (see `REFRESH_COOKIE_PATH`).

We do **not** currently implement a **CSRF token** (e.g. double-submit cookie) or **Origin** validation middleware as a universal gate for mutating requests.

---

## Safer directions (choose based on deployment)

### A) Stay same-site + keep Lax (or Strict)

**When:** SPA and API share a **same-site** deployment (e.g. reverse proxy serves both, or subdomains under one registrable domain with cookies scoped correctly).

**Actions:**

- Prefer **`AUTH_COOKIE_SAMESITE=lax`** (or `strict` if you can tolerate UX limits).
- Avoid **`none`** unless you truly need cross-site credentialed requests.
- Keep **`ALLOWED_ORIGINS`** tight.

This covers **many** dashboard scenarios but remains **configuration-sensitive** (DNS, TLS, proxy paths, cookie `Domain`).

### B) Double-submit cookie or synchronizer token

**When:** You need **`SameSite=None`** or want defense in depth regardless of cookie policy.

**Pattern:** Issue a non-httpOnly CSRF token (or pair) and require a matching header (e.g. `X-CSRF-Token`) on **unsafe** methods. The frontend reads the token from a cookie or bootstrap endpoint and sends it on each mutating request.

**Tradeoffs:** Extra implementation and testing; must rotate/validate tokens correctly.

### C) Authorization header only (no access cookie)

**When:** You want the browser **not** to send the access token automatically.

**Pattern:** Keep access token **only** in memory (or sessionStorage if you accept XSS risk) and send **`Authorization: Bearer`**. Refresh can remain httpOnly + path-limited, or move to a BFF pattern.

**Tradeoffs:** Loses automatic cookie attachment; implement refresh and storage carefully. **Refresh token** in a cookie can still be CSRF-relevant for `POST /api/auth/refresh` unless mitigated (SameSite + minimal CORS + optional CSRF token).

---

## Checklist for production

- [ ] Confirm **actual** browser origin(s) for the SPA and document them in **`ALLOWED_ORIGINS`**.
- [ ] Set **`AUTH_COOKIE_SAMESITE`** and **`AUTH_COOKIE_DOMAIN`** deliberately for your hostname layout; do not copy `.env` values from another environment blindly.
- [ ] If you must use **`SameSite=None`**, treat **CSRF** as a **first-class** requirement (token or strict Origin checks on state-changing routes).
- [ ] Revisit this doc when adding **new** cookie-based flows or **third-party** embeds that call your API with credentials.

---

## Code references

- Cookie attributes and helpers: `backend/app/core/security.py` (`_resolve_auth_cookie_attributes`, `set_auth_cookies`, `clear_auth_cookies`).
- CORS: `backend/app/main.py`.
- Frontend credentialed client: `frontend/src/utils/api.ts` (`withCredentials: true`).
