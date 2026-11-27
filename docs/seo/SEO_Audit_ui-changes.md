# SEO Audit: `ui-changes` branch

- **Date:** 2026-11-27
- **Commit audited:** `4754452` (ui-changes). This is a re-run; the first pass was on `8225907`. See "Changes since the first audit" below.
- **Method:** I followed the `seo-audit` skill from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills), the most-installed SEO skill for AI agents on the skills.sh registry. The priority order is crawlability, then technical, then on-page, then content, then authority.
- **How the evidence was collected:** I ran a production build (`next build`), started the server with `next start`, and crawled 23 URLs twice with headless Chromium: once with JavaScript off (what a non-rendering crawler sees) and once with it on. I measured page weight, LCP and CLS at desktop size and at mobile size on a throttled connection (1.6 Mbps, 150 ms latency). I also read the source code.
- **Not verifiable from the repo:** Search Console data, field Core Web Vitals, rankings, backlinks, and the blog posts. Blog content comes from Sanity, and no `NEXT_PUBLIC_SANITY_PROJECT_ID` was set locally. The live sitemap lists 2 posts, but I did not audit them. I also could not measure `/about` performance: the local image optimizer stalled encoding its 1920px hero to WebP. That is probably a limit of this container, so check it on a Vercel preview.

---

## Changes since the first audit (`8225907` → `4754452`)

I re-ran the build, the crawl and the performance measurements on the 28 new commits (nav rework, logo-zoom home intro, contact page redesign, office move).

| Area | Result |
|------|--------|
| Metadata (titles, descriptions, canonicals, robots, `og:image`) | **Unchanged** on all 23 URLs. |
| Home H1 merged words (4.1) | **Still present.** The crawler still extracts "ConnectingBusinesses WiththeRightTalent". |
| Nav headings before the H1 (4.5) | **Still present.** The nav was rebuilt but still emits `H3, H2, H2, H2` first. |
| Home page weight (2.1, 2.2) | **Unchanged:** 20.5 MB on desktop, and still 97 s to `load` on throttled mobile. |
| `/job-seekers` (2.3), `/talentmesh-portal` (2.4) | **Unchanged:** mobile LCP 34.1 s on `/job-seekers`; CLS 0.125 on `/talentmesh-portal`. |
| Soft 404 on `/blog/foo` (1.1), `/privacy` and `/terms` redirects (3.1) | **Unchanged.** |
| `/contact` | **Improved.** Content grew from 204 to 377 words, the page weighs 1.4 MB, LCP is a 20 KB WebP, and the address now has `geo` and `hasMap` in the schema. Two new minor items: 2.5 and 4.8. |

---

## Executive summary

The technical basics are solid: robots.txt and the sitemap are valid, every indexable page has its own self-referencing canonical, there is exactly one H1 per page, titles are unique, and every `<img>` has an alt attribute. The two biggest problems are **page weight** and **thin service pages**. The service pages are the ones that should rank for commercial queries.

**Top 5 issues**

| # | Issue | Impact |
|---|-------|--------|
| 1 | The home page downloads **20.5 MB**, including a single **13 MB PNG** background. On the throttled mobile profile the page took **97 s** to fire `load`. | High |
| 2 | `/job-seekers` has a mobile LCP of **34.1 s** because its LCP element is a 1.45 MB CSS background PNG. `/talentmesh-portal` is 7 MB with a mobile CLS of **0.125**, which fails the 0.1 threshold. | High |
| 3 | All 12 service pages are thin, with **135–184 words** in `<main>`. These pages target "contract staffing", "RPO services India", "executive search India" and similar queries. | High |
| 4 | **There is no Privacy Policy or Terms page.** `/privacy` and `/terms` redirect (308) to the home page, yet the site collects personal data through its forms. This hurts trust signals (E-E-A-T) and is a DPDP Act 2023 exposure. | High |
| 5 | Search engines read the home H1 as **"ConnectingBusinesses WiththeRightTalent"** because the word `<span>`s have no whitespace between them. It also does not contain the primary keyword. | Medium–High |

**Quick wins (under an hour each):** #5, compressing or replacing the 13 MB PNG, adding `og:image` to 6 pages, trimming meta descriptions to length, and making missing blog posts return a real 404.

---

## 1. Crawlability & indexation

### ✅ Passed
- `robots.txt` allows `/` and points to `https://talentmeshsolutions.com/sitemap.xml` (`app/robots.ts`).
- `sitemap.xml` is valid and lists 20 static URLs plus blog posts from Sanity (`app/sitemap.ts`).
- Every indexable page has a self-referencing absolute canonical. `/login` (`noindex, follow`) and the 404 page (`noindex`) are correctly excluded.
- Removed legacy routes return 308 to their new homes (`proxy.ts`).
- Rewrites are canonicalised correctly: `/portals/jobs/contact` → canonical `/contact`.

### 1.1 Missing blog posts return a soft 404 (HTTP 200)
- **Evidence:** `GET /blog/foo` returns `200` with `<meta name="robots" content="noindex, follow">` and the title "Article not found".
- **Cause:** `app/blog/[slug]/page.tsx:78` calls `notFound()`, but `app/blog/loading.tsx` creates a Suspense boundary. The response starts streaming with status 200 before `notFound()` runs.
- **Impact:** Medium. The `noindex` keeps these URLs out of the index, but Google reports them as soft 404s and they waste crawl budget whenever an old slug is renamed or deleted.
- **Fix:** Remove `app/blog/loading.tsx` (or move it so it does not wrap `[slug]`), or resolve the post in a layout before streaming starts. Then confirm `curl -I /blog/foo` returns `404`.

### 1.2 The sitemap has no `lastmod` for static pages
- **Evidence:** In `app/sitemap.ts:30-34` the comment says lastModified is omitted on purpose. `changefreq` and `priority` are set, but Google ignores both.
- **Impact:** Low.
- **Fix:** Add `lastModified` from a per-page constant or the git commit date when content changes. Leave `changefreq` and `priority` as they are, since they are harmless.

### 1.3 The blog depends on an environment variable and fails silently
- **Evidence:** In `lib/sanity/client.ts:9-16`, if `NEXT_PUBLIC_SANITY_PROJECT_ID` is missing, a stub client returns `null`. `/blog` then renders "Our next chapter is on its way" and stays **indexable and listed in the sitemap**.
- **Impact:** Low in production, where the live sitemap lists 2 posts. High if a deployment ships without the variable.
- **Fix:** Fail the build in production when the variable is missing, for example through `scripts/check-env.ts`, which already exists. Alternatively, `noindex` `/blog` when there are zero posts.

### 1.4 Duplicate 200 URLs from rewrites
- **Evidence:** `/portals/jobs/contact` and `/portals/jobs/job-seekers` both return `200` with the same content as `/contact` and `/job-seekers` (rewrites in `next.config.ts`). The canonicals point to the right URL.
- **Impact:** Low.
- **Fix (optional):** Add 308 redirects in `proxy.ts` from `/portals/jobs/{contact,job-seekers}` to the clean URLs.

---

## 2. Technical: performance and Core Web Vitals

These are lab measurements from the local production server. Field data from Search Console or CrUX takes precedence when it exists.

| Page | Viewport | Total transfer | LCP | CLS | `load` |
|------|----------|---------------:|----:|----:|-------:|
| `/` | desktop | **20.53 MB** | 0.2 s* | 0 | 0.4 s |
| `/` | mobile (throttled) | **19.98 MB** | 1.7 s* | 0 | **97.5 s** |
| `/job-seekers` | mobile (throttled) | 6.80 MB | **34.1 s** | 0.063 | 34.4 s |
| `/talentmesh-portal` | mobile (throttled) | 6.74 MB | 1.4 s | **0.125** | 34.0 s |
| `/contingent-staffing` | mobile (throttled) | **0.58 MB** | 1.5 s | 0.002 | 2.5 s |

\*On the home page the lab LCP element is the logo in the intro overlay, so the real hero LCP is probably later.

The service pages are a good benchmark: under 0.6 MB, with images served through `next/image`. The other pages should match them.

### 2.1 A 13 MB PNG background on the home page
- **Evidence:** `components/home/home.module.css:1373` (and `:1601`) set `url('/images/about/ascii-magic-2.png')`, which transfers **13.00 MB**. CSS backgrounds bypass `next/image`, so this file is never resized or converted to WebP or AVIF.
- **Impact:** High. It costs mobile users data (a real concern for Indian mobile visitors), drags down Lighthouse scores, and makes the home page slow to finish loading. It may also delay LCP, depending on the viewport.
- **Fix:** Export the image as AVIF/WebP at 1920px wide (it should come out under 300 KB) and provide a smaller variant for mobile through `image-set()` or a media query. Better still, render it with `<Image fill sizes="100vw">`. Also delete `public/images/about/ascii-magic-1.png` (14 MB), which nothing in `app/`, `components/` or `content/` references.

### 2.2 Unoptimised industry photos on the home page
- **Evidence:** `components/home/IndustriesGrid.tsx:123` and `:157` use plain `<img src={ind.image}>` with PNGs listed in `content/home.ts:268-278`. Each file is about 0.7–0.84 MB: `manufacturing_photo.png`, `Customer services.png`, `Human research.png`, `Finance management.png`, `retail_photo.png` and others.
- **Impact:** High. About 7 MB of the home page's weight comes from these files.
- **Fix:** Switch to `next/image` with `sizes`, or pre-convert the files to WebP at display size. Rename them without spaces using descriptive slugs, for example `/images/industries/manufacturing.webp`.

### 2.3 `/job-seekers`: the LCP element is a 1.45 MB CSS background
- **Evidence:** `app/portals/jobs/job-seekers/job-seekers.module.css:60` sets `background-image: url('/back13.png')`, which is the LCP element and took 34.1 s on throttled mobile. Other heavy backgrounds on the page: `bentomountain.png` 1.36 MB, `back2.2.png` 1.14 MB, `bgbg.png` 1.12 MB, `blurblue.png` 1.02 MB, `1.1_illu.png` 1.19 MB.
- **Impact:** High. This is the main candidate-acquisition page, and it fails LCP badly.
- **Fix:** Convert the backgrounds to AVIF/WebP, preload the hero background (`<link rel="preload" as="image" imagesrcset=…>`) or render it with `<Image priority>`, and lazy-load the backgrounds below the fold.

### 2.4 `/talentmesh-portal`: 7 MB and CLS 0.125
- **Evidence:** `components/sections/sections.module.css:94` loads `Background.png` (1.5 MB). The page also includes the industry PNGs from `components/sections/Industries.tsx:22`. Mobile CLS measured **0.125**, which fails the 0.1 threshold.
- **Fix:** Optimise the images as in 2.2. For CLS, reserve space (`aspect-ratio` or fixed height) for the sections that render late. Run the Chrome DevTools Performance panel's "Layout shifts" track to find the element that moves.

### 2.5 `/contact` loads the Google Maps script on page load (new)
- **Evidence:** About 330 KB of Maps JavaScript (`places.js`, `main.js`, `init_embed.js`, `util.js`) loads before any interaction. It accounts for most of the page's 1.4 MB, and `load` on desktop is 1.7 s compared with about 0.3 s on other pages.
- **Impact:** Low. LCP is unaffected (0.2 s on desktop, 1.7 s on throttled mobile), but it adds main-thread work that affects INP.
- **Fix:** Add `loading="lazy"` to the map `<iframe>`, or show a static map image (the address card already links to Google Maps) and load the embed on click.

### 2.6 `public/` is 121 MB
- **Evidence:** `du -sh public` returns 121 MB. More than 20 PNGs are over 1.5 MB, and the folder contains files such as `ChatGPT Image Jun 17, 2026, 08_03_00 PM (1).png`, `logo-circle-review.png` and `graintest.png`.
- **Impact:** Low for SEO. It increases deploy size and the risk of shipping heavy assets by accident.
- **Fix:** Audit references with `grep`, delete unused assets, and convert the rest.

---

## 3. Trust, E-E-A-T and compliance

### 3.1 No Privacy Policy or Terms of Service
- **Evidence:** `proxy.ts` lists `'/privacy', '/terms'` in `REMOVED_PORTAL_PREFIXES`, so both 308 to `/`. `components/layout/Footer/Footer.tsx` has no link to either. Meanwhile the site collects names, emails and phone numbers through Web3Forms (the contact and post-job forms) and through the footer newsletter.
- **Impact:** High. Google's quality rater guidelines treat clear privacy and contact information as trust signals for YMYL-adjacent topics, and employment counts as one. India's **Digital Personal Data Protection Act 2023** requires a notice before personal data is collected. International visitors (GDPR, CCPA) expect the same.
- **Fix:** Publish `/privacy` and `/terms` as static pages, remove them from `REMOVED_PORTAL_PREFIXES`, link them from the footer, add them to the sitemap, and link the privacy notice next to every form submit button.

### 3.2 Positive signals already present
Organization/EmploymentAgency JSON-LD includes the legal name, the full postal address (1203, Ganesh Glory, Gota, Ahmedabad 382470), `geo` coordinates, `hasMap`, phone, email and `sameAs` profiles. The `/contact` page shows the same NAP (name, address, phone) and a map. The JSON-LD, `content/home.ts` and the contact page all agree. Keep these consistent with the Google Business Profile.

---

## 4. On-page SEO

### 4.1 The home H1 is extracted with merged words and no keyword
- **Evidence:** `components/home/HomeHero.tsx:233-252` renders each word in its own `<span>` with no whitespace between them. The crawler's extracted text is `"ConnectingBusinesses WiththeRightTalent"`. The `aria-label` holds the correct phrase, but search engines index text content, not `aria-label`. The H1 also never mentions recruitment, staffing or a location, while the `<title>` targets "Recruitment & Staffing Agency in Ahmedabad".
- **Impact:** Medium–High. The H1 is the strongest on-page relevance signal after the title.
- **Fix:** Add `{' '}` after each word span, keeping the visual layout the same. Then consider a headline or eyebrow line that carries the keyword, for example an H1 of "Recruitment & Staffing Agency for Growing Teams" with the current line as the visual tagline.

### 4.2 Meta description lengths
Target: 120–160 characters, with each page's description unique.

| Page | Length | Problem |
|------|-------:|---------|
| `/about` | 216 | too long, will be truncated |
| `/contingent-staffing` | 214 | too long |
| `/executive-search` | 202 | too long |
| `/technology-talent-sourcing` | 180 | too long |
| `/managed-talent-solutions` | 167 | slightly long |
| `/job-seekers` | 93 | too short, no keyword (e.g. "jobs in India") |
| `/blog` | 94 | too short |
| `/skill-upskilling` | 116 | short |
| `/career-advice` | 118 | short |

Also, the root fallback description in `app/layout.tsx:51` is 191 characters, and pages without their own description inherit it.

### 4.3 Titles miss query and location modifiers
- **Evidence:** The service titles are just the service name plus the brand, e.g. "Contingent Staffing | Talentmesh Solutions" (42 characters, so about 15–20 characters are unused). `/about` is "About Us | Talentmesh Solutions". `/skill-upskilling` repeats itself and is not a phrase people search for.
- **Impact:** Medium.
- **Fix:** Use a pattern like `{Service} Services in India | Talentmesh` and stay within 60 characters. Examples:
  - "Contingent Staffing Services in India | Talentmesh Solutions"
  - "RPO Services in India | Recruitment Process Outsourcing"
  - "Executive Search Firm in India | Talentmesh Solutions"
  - "GCC Setup & Hiring in India | Talentmesh Solutions" (aimed at international buyers)
  - Rename `/skill-upskilling` to "Corporate Upskilling & Training Programs". Keep the URL, or 308 it to `/upskilling`.

### 4.4 Six indexable pages have no `og:image` or `twitter:image`
- **Evidence (crawl):** `/job-seekers`, `/contact`, `/career-advice`, `/employers/post-job`, `/talentmesh-portal` and `/blog` have neither tag. Each of these segments sets its own `openGraph` object without `images` (e.g. `app/portals/jobs/job-seekers/layout.tsx:10-16`), and that object replaces the root `app/opengraph-image.tsx` image instead of inheriting it.
- **Impact:** Medium. LinkedIn, WhatsApp and X shares show no preview image, and LinkedIn is a key channel for recruiters.
- **Fix:** Add `images: ['/opengraph-image']` (or a page-specific image) to each of those `openGraph` objects, or add an `opengraph-image.tsx` in each segment.

### 4.5 Heading hierarchy starts in the nav
- **Evidence:** On every page the outline begins `H3(empty), H2 "Talent Solutions", H2 "Talent Portal", H2 "Company"`, and only then the H1. The source is `components/layout/Navbar/Navbar.tsx:385` (mega-menu `<h3>`) and `:628` (mobile menu `<h2>`). The footer adds H3/H4 (`Footer.tsx:63-146`).
- **Impact:** Low–Medium. It muddies the document outline for crawlers, AI answer engines and screen readers.
- **Fix:** Change the nav and footer headings to `<p>` or `<span>` with the same classes, or use `role="presentation"`-free `<div>`s. Keep real headings inside `<main>` only.

### 4.6 `<main>` landmark missing on key pages
- **Evidence:** `/`, `/about`, `/talentmesh-portal` and `/login` render no `<main>` element. All other pages have one.
- **Impact:** Low. It helps content extraction and accessibility.
- **Fix:** Wrap the page body in `<main id="main">` in `app/page.tsx`, `app/about/page.tsx` and `app/talentmesh-portal/page.tsx`.

### 4.8 The `/contact` H1 is generic (new)
- **Evidence:** The redesign changed the H1 from "Let's talk about your next hire." to **"Contact our Team"**.
- **Impact:** Low. Contact pages rarely rank on their H1, but the title and H1 are the place to say "recruitment agency in Ahmedabad", which is the query for this page's local intent.
- **Fix (optional):** Keep the visual heading and add a keyword-bearing line, for example a visible eyebrow above it or a subheading "Talentmesh Solutions, recruitment and staffing agency in Gota, Ahmedabad". The `<title>` "Contact Us | Talentmesh Solutions" can carry the same phrase.

### 4.7 Images
- ✅ Every `<img>` has an `alt` attribute.
- The home industry images use `alt=""` (`IndustriesGrid.tsx:123`). That is fine if they are decorative, but descriptive alt text such as "Manufacturing workforce" would add relevance.
- Filenames have spaces and are not descriptive (`Customer services.png`, `bg2.png`, `card 2.1.png`, `TalentMesh_page-0002-removebg-preview.png`). That last file is also the Organization schema `logo`. Rename it to `/talentmesh-logo.png`.

---

## 5. Content quality

### 5.1 The service pages are thin
- **Evidence:** Words inside `<main>` (rendered): contingent-staffing 184, contract-to-hire 168, managed-talent 164, remote-hiring 158, offshore 157, RPO 155, GCC 150, executive-search 149, technology-sourcing 143, upskilling 140, direct-hire 137, hire-train-deploy 135. All 12 pages share the same template, with the heading pattern `H1, H2, H2, H2`.
- **Impact:** High. These are the commercial pages. In India, competitors' pages for "RPO services India" or "contract staffing company" typically run 1,000–2,000 words with FAQs, process steps, industries, pricing models and case studies.
- **Fix:** Expand each page to roughly 800–1,200 useful words. Add:
  - a clear definition of the service and who it is for
  - the process, with timelines (e.g. "shortlist in 48–72 hours", a claim already used in the footer)
  - industries and roles covered, linking to the home industries section
  - engagement and pricing models (INR, GST-inclusive where relevant)
  - 4–6 FAQs, also marked up as FAQPage
  - one anonymised case study with numbers
  - cross-links to 2–3 related services
  - a CTA

  For international buyers (offshore staffing, GCC setup, remote hiring), add time-zone, compliance and EOR details.

### 5.2 Keyword targeting and cannibalisation
- `/talentmesh-portal` (1,098 words, H1 "Scale Your Team Not Your Workload") and the home page both target general hiring. Give the portal page a distinct product-led query, for example "recruitment software for hiring teams".
- `/employers/post-job` has only 90–124 words. The page is mostly a form, so either add explanatory content or accept that it will not rank on its own.

### 5.3 Structured data gaps
- ✅ Site-wide `Organization`/`EmploymentAgency`, home `WebSite`+`FAQPage`, `/about` `AboutPage`, `/contact` `FAQPage` (all valid JSON-LD).
- ❌ The 12 service pages have no `Service` schema and no `BreadcrumbList`. **Fix:** Add `Service` (`provider: {"@id": ".../#org"}`, `areaServed`, `serviceType`) and `BreadcrumbList` (Home › Services › {Service}) to the shared service-page template.
- `/about` references `isPartOf: {"@id": ".../#website"}` (`app/about/page.tsx:58`), but the `WebSite` node is only emitted on `/`. Google tolerates the dangling reference, but moving the `WebSite` node to `app/layout.tsx` next to the Organization node makes the graph consistent.
- In the JS-rendered DOM of `/contact` I once saw **two** Organization nodes. The raw HTML has one. I did not confirm the cause, so re-test in the Rich Results Test.
- Note: since 2023 Google shows FAQ rich results only for authoritative government and health sites. FAQPage markup still helps AI answer engines.

### 5.4 Locale signals are inconsistent (relevant for international expansion)
- **Evidence:** `<html lang="en">` (`app/layout.tsx:153`), `og:locale = en_US` (`app/layout.tsx:63`), `WebSite.inLanguage = en-IN` (`app/page.tsx`), and `areaServed: India` only (`app/layout.tsx:109`). Meanwhile, the GCC setup, offshore staffing and remote hiring pages are aimed at clients outside India.
- **Fix:** Set `og:locale` to `en_IN` and extend `areaServed` to include the target countries (e.g. US, UK, AE, SG). Keep `lang="en"`. Only add hreflang if you later publish region-specific versions of pages. A single English site needs none.

---

## 6. Internal linking
- ✅ All 20 sitemap URLs are linked from the nav or footer on every page, so none are orphaned and all are within one click of home.
- ✅ Anchor text is descriptive (the apparently empty anchors were hidden dropdown items with real text).
- `/login`, a `noindex` page, gets about 6 links per page (145 across the crawl). That is harmless, but you could drop the duplicates.
- Missing: contextual in-body links between related services, and from blog posts to service pages. Add these when expanding content (5.1).

---

## 7. Other issues found

| Issue | Evidence | Risk |
|-------|----------|------|
| Lockfile out of sync | `npm ci` fails with "Missing: @emnapi/runtime@1.11.3, @emnapi/core@1.11.3 from lock file". `npm install` succeeds. | Build reproducibility. Fix with `npm install` and commit `package-lock.json`. |
| Type errors ignored at build | `next.config.ts`: `typescript.ignoreBuildErrors: true` | Regressions such as a broken `generateMetadata` can ship unnoticed. |
| `keywords` meta tag | `app/layout.tsx:52`, `app/page.tsx:26` | Google ignores it. Harmless, so no action needed. |

---

## Prioritised action plan

**1. Critical (fix before the next release)**
- 2.1 Replace or compress the 13 MB `ascii-magic-2.png`, and delete the unused `ascii-magic-1.png`.
- 2.3 Optimise the `/job-seekers` backgrounds (LCP 34 s on mobile).
- 3.1 Publish Privacy Policy and Terms pages, and stop redirecting `/privacy` and `/terms`.

**2. High impact**
- 5.1 Expand the 12 service pages to about 800–1,200 words, with FAQs and a case study.
- 4.3 Rewrite the service and about titles with query and location modifiers.
- 2.2 / 2.4 Move the industry photos and portal background to `next/image`/WebP, and fix the 0.125 CLS.
- 5.3 Add `Service` and `BreadcrumbList` schema to the service template.

**3. Quick wins**
- 4.1 Add whitespace between the H1 word spans.
- 4.4 Add `og:image` to the 6 pages that lack it.
- 4.2 Bring meta descriptions to 120–160 characters.
- 1.1 Make missing blog slugs return a real 404.
- 4.6 Add `<main>` to `/`, `/about` and `/talentmesh-portal`.

**4. Longer term**
- 4.5 Remove headings from the nav and footer.
- 2.5 Lazy-load the Maps embed on `/contact`, and 4.8 add local keywords to the contact heading.
- 5.4 Set `og:locale` to `en_IN` and widen `areaServed` for international clients.
- 1.2 Add `lastModified` to the sitemap.
- Build topical blog clusters, e.g. "Hiring in India" and "GCC setup", that link to the service pages.
- Connect Google Search Console and Bing Webmaster Tools, submit the sitemap, and track field Core Web Vitals.

---

### Sources
- Skill used: [coreyhaines31/marketingskills: seo-audit](https://claudemarketplaces.com/skills/coreyhaines31/marketingskills/seo-audit) (SKILL.md v2.2.10)
- Alternatives considered: [AgriciDaniel/claude-seo](https://github.com/AgricIDaniel/claude-seo), [Bhanunamikaze/Agentic-SEO-Skill](https://raw.githubusercontent.com/Bhanunamikaze/Agentic-SEO-Skill/HEAD/README.md), [seranking/seo-skills](https://github.com/seranking/seo-skills)
- Ranking reference: [Best SEO Skills for Claude Code (2026)](https://claudeskills.info/best/seo-skills/), [skillselion guide](https://skillselion.com/guides/seo-skills-claude-code)
