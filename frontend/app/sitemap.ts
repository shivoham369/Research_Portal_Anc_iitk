/**
 * app/sitemap.ts
 *
 * Production-ready sitemap for the IITK Research Wing portal.
 *
 * Design decisions:
 * ─────────────────
 * 1. BASE_URL is the single source of truth. Change it here or supply
 *    NEXT_PUBLIC_SITE_URL as an environment variable to override it at
 *    build time without touching this file.
 *
 * 2. All pages are Server Component-rendered. The sitemap function is
 *    async so it can fetch live timestamps from the backend API (e.g.
 *    most-recently-published event / internship), giving Googlebot
 *    accurate lastModified signals instead of a hard-coded date.
 *
 * 3. Admin, login, and other private routes are intentionally omitted —
 *    they are also blocked in robots.ts, providing defence in depth.
 *
 * 4. The /portal route serves a single-page app-shell (professors +
 *    vacancies loaded client-side). It is still indexable because its
 *    HTML shell contains rich semantic content and the page returns
 *    HTTP 200.
 *
 * 5. If this portal grows to hundreds of professor or vacancy pages
 *    (e.g. /portal/faculty/[slug]), move those into a separate
 *    app/portal/faculty/sitemap.ts and use generateSitemaps() to split
 *    the index into 50,000-URL shards (Google's per-sitemap limit).
 *
 * Next.js 16 note: the MetadataRoute.Sitemap type is unchanged; the
 * breaking change in v16 only affects the `id` prop in generateSitemaps
 * sub-sitemaps (it is now a Promise<string>). This root sitemap is not
 * affected.
 */

import type { MetadataRoute } from "next";

// ─── Base URL ─────────────────────────────────────────────────────────────────
// NEXT_PUBLIC_SITE_URL takes priority so the deployed Vercel instance
// automatically uses the right origin.  Never falls back to localhost.
const BASE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://research-portal-anc-iitk-gamma.vercel.app"
).replace(/\/$/, ""); // strip any trailing slash for consistent URL construction

// ─── API Base ─────────────────────────────────────────────────────────────────
const API_BASE: string = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely fetch the most-recent `createdAt` / `updatedAt` / `deadline`
 * timestamp from an API array endpoint.  Returns undefined on any error
 * so the sitemap generation never fails due to a backend outage.
 */
async function fetchLatestTimestamp(
  endpoint: string,
  dateField: string = "createdAt"
): Promise<Date | undefined> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      // Cache for 1 hour at the CDN / Next.js data cache level.
      // This prevents the sitemap request from hammering the backend on
      // every crawler visit while still reflecting recent content.
      next: { revalidate: 3600 },
    });

    if (!res.ok) return undefined;

    const data: unknown = await res.json();
    const items = Array.isArray(data)
      ? data
      : (data as Record<string, unknown[]>)?.data ?? [];

    if (!Array.isArray(items) || items.length === 0) return undefined;

    // Find the most recent timestamp in the collection.
    const timestamps = items
      .map((item) => {
        const raw = (item as Record<string, unknown>)[dateField];
        if (!raw) return NaN;
        return new Date(raw as string).getTime();
      })
      .filter((t) => !isNaN(t));

    if (timestamps.length === 0) return undefined;
    return new Date(Math.max(...timestamps));
  } catch {
    // Network errors, JSON parse errors, etc. — fail silently.
    return undefined;
  }
}

// ─── Sitemap ──────────────────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch live timestamps in parallel — both requests fire simultaneously.
  const [latestEventDate, latestInternshipDate] = await Promise.all([
    fetchLatestTimestamp("/api/events", "createdAt"),
    fetchLatestTimestamp("/api/internships", "deadline"),
  ]);

  // Site launch date — used as a fallback lastModified for static pages
  // when no more-precise signal is available.
  const sitelaunchDate = new Date("2025-07-20T00:00:00.000Z");

  return [
    // ── Home ──────────────────────────────────────────────────────────────
    // The landing page is the single most important URL. Priority 1.0 and
    // `daily` frequency because the professor directory and events board
    // may surface new content whenever the backend is updated.
    {
      url: `${BASE_URL}/`,
      lastModified: sitelaunchDate,
      changeFrequency: "daily",
      priority: 1.0,
    },

    // ── Research Portal (student dashboard) ───────────────────────────────
    // Core product page. Contains professor directory and notice board in
    // a single-page tab layout. Receives content updates frequently.
    {
      url: `${BASE_URL}/portal`,
      lastModified: latestEventDate ?? sitelaunchDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // ── Events & Notices ──────────────────────────────────────────────────
    // Frequently published notices and events. Uses the most recent
    // event's createdAt as lastModified so Googlebot recrawls promptly
    // after new posts.
    {
      url: `${BASE_URL}/portal/events`,
      lastModified: latestEventDate ?? sitelaunchDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },

    // ── International Internships ─────────────────────────────────────────
    // Deadline-driven content; changes as new programs are added or
    // deadlines pass. Uses the most-recent deadline date as lastModified.
    {
      url: `${BASE_URL}/international-internships`,
      lastModified: latestInternshipDate ?? sitelaunchDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  /*
   * ─── Future expansion notes ───────────────────────────────────────────────
   *
   * When the portal introduces individual pages for faculty, publications,
   * or research projects, add dedicated sub-sitemaps to keep each file
   * under Google's 50,000-URL / 50 MB limit.
   *
   * Example for faculty pages (create app/portal/faculty/sitemap.ts):
   *
   *   import type { MetadataRoute } from 'next'
   *   import { BASE_URL } from '@/lib/seo'
   *
   *   export async function generateSitemaps() {
   *     const count = await getFacultyCount()
   *     const shards = Math.ceil(count / 50_000)
   *     return Array.from({ length: shards }, (_, i) => ({ id: String(i) }))
   *   }
   *
   *   export default async function sitemap(
   *     props: { id: Promise<string> }
   *   ): Promise<MetadataRoute.Sitemap> {
   *     const id = await props.id          // Next.js 16: id is a Promise
   *     const offset = Number(id) * 50_000
   *     const faculty = await getFaculty({ offset, limit: 50_000 })
   *     return faculty.map((f) => ({
   *       url: `${BASE_URL}/portal/faculty/${f.slug}`,
   *       lastModified: new Date(f.updatedAt),
   *       changeFrequency: 'monthly',
   *       priority: 0.7,
   *     }))
   *   }
   *
   * The sub-sitemap is automatically linked from the root sitemap index
   * at /sitemap.xml generated by Next.js.
   * ─────────────────────────────────────────────────────────────────────────
   */
}
