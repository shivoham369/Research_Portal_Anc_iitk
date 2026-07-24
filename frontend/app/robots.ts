/**
 * app/robots.ts
 *
 * Production-ready robots.txt for the IITK Research Wing portal.
 *
 * Design decisions:
 * ─────────────────
 * 1. Adopt a default-allow posture: everything is crawlable unless
 *    explicitly blocked.  This prevents accidental de-indexing of public
 *    pages that may be added in the future.
 *
 * 2. Only private, auth-gated, or irrelevant paths are blocked:
 *    /portal/admin   — admin panel (JWT-gated, no public value)
 *    /portal/admin/  — catches any sub-paths under admin
 *    /login          — login / auth pages have no indexable content
 *    /api            — REST endpoints; not intended for crawlers
 *
 *    NOTE: robots.txt is NOT a security control. These routes are also
 *    protected by JWT authentication middleware on the backend.
 *    Do not rely on robots.txt to hide sensitive data.
 *
 * 3. CSS, JS, fonts, images and _next/static are deliberately NOT
 *    blocked.  Googlebot needs them to render pages and assess Core
 *    Web Vitals.  Blocking them causes "Googlebot can't access your
 *    CSS and JS files" errors in Search Console.
 *
 * 4. The sitemap URL is included so crawlers can auto-discover it.
 *
 * 5. BASE_URL is derived from the environment so the same code works
 *    in preview deployments without modification.
 *
 * Next.js 16: MetadataRoute.Robots type is unchanged from v14/v15.
 */

import type { MetadataRoute } from "next";

// ─── Base URL ─────────────────────────────────────────────────────────────────
const BASE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://research-portal-anc-iitk-gamma.vercel.app"
).replace(/\/$/, "");

// ─── Robots ───────────────────────────────────────────────────────────────────

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Single rule for all crawlers.  Wildcards are avoided where a
        // precise path is sufficient — overly broad wildcards can
        // accidentally block valid URLs.
        userAgent: "*",

        allow: [
          "/",                        // home / landing page
          "/portal",                  // research student dashboard
          "/portal/events",           // events & notices feed
          "/international-internships", // international internship listings
        ],

        disallow: [
          "/portal/admin",            // admin panel (auth-gated)
          "/api/",                    // all REST API routes
        ],
      },
    ],

    // Absolute sitemap URL so any crawler — not just Google — can find it.
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
