/**
 * Detect if the current hostname is a career page subdomain.
 *
 * Production: acme.kubrick.app → "acme"
 * Dev: acme.localhost → "acme"
 *
 * Returns the org slug if on a career subdomain, null otherwise.
 * Reserved subdomains (app, api, www) are excluded.
 */

const RESERVED = new Set(["app", "api", "www", "mail", "admin"]);

export function getCareerSubdomain(): string | null {
  const hostname = window.location.hostname;

  // Production: {slug}.kubrick.app
  const prodMatch = hostname.match(/^([a-z0-9][a-z0-9-]*)\.kubrick\.app$/);
  if (prodMatch && !RESERVED.has(prodMatch[1])) {
    return prodMatch[1];
  }

  // Dev: {slug}.localhost
  const devMatch = hostname.match(/^([a-z0-9][a-z0-9-]*)\.localhost$/);
  if (devMatch && !RESERVED.has(devMatch[1])) {
    return devMatch[1];
  }

  return null;
}
