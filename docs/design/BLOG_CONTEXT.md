# TalentMesh blog: context and handoff

Last updated: 11 September 2026. Read this before working on `/blog` or `/blog/[slug]`.

This document records user decisions and the current implementation. It is scoped to the blog, not the whole website. Verify the current code and CMS before making changes; content counts and verification results below are snapshots.

## Purpose and editorial direction

TalentMesh Journal helps people understand how work, skills, hiring and technology are changing, and how to adapt. The user explicitly wants a broader publication than recruitment, staffing and predictions alone.

Publish useful education about new tools, AI, automation, practical skills and better ways of working. A guide should explain how to use or integrate something into a real workflow, rather than only announcing that it exists. Relevant readers can include developers, recruiters, HR teams, designers, managers and other working professionals; a narrower primary audience has not been decided.

Current masthead copy:

> TalentMesh Journal
>
> Ideas for a changing world of work.
>
> Practical perspectives on hiring, skills, technology, and better ways to work.

## Categories: agreed direction versus live data

**Build content first and grow categories around actual published articles. Do not launch empty category pages, empty filters or fabricated articles to fill a design.** Category distribution and CMS migration were deferred until after the UI work.

| Category | Intended scope | Status |
| --- | --- | --- |
| Hiring & Recruitment | Hiring processes, sourcing, interviews, candidate experience, time-to-hire | Intended home for the existing India hiring article; not yet migrated |
| Future Skills & Workflows | Practical AI, new tools, automation, programming, productivity and modern workflows | Accepted category name and editorial direction; introduce visibly when content exists |
| Career & Learning | Career growth, interview preparation and upskilling | Possible future category, not a required launch category |
| Market & Talent Trends | Emerging roles, skills demand and hiring-market changes | Possible future category, not a required launch category |

The live article still displays **AI & Recruitment**, its existing Sanity category. This was intentionally preserved during the design work. Do not confuse that legacy value with the intended taxonomy or silently assume the migration has happened. Queries currently treat category as a value and use exact equality for related stories; inspect the actual Studio schema before changing its representation.

The prior conversation discussed a possible article titled “AI Engineering Interviews Are Changing: What to Expect in 2026”, provisionally under Future Skills & Workflows. This is an idea, not a written or published article. The original YouTube/image source has not been established in this handoff; obtain and verify it before writing source-dependent claims.

## Existing content

At the last inspection there was one published article:

- Title: Hiring in India in 2026: what actually moves time-to-hire
- URL: `/blog/hiring-in-india-2026-what-actually-moves-time-to-hire`
- Author: TalentMesh Editorial
- Published date shown by the CMS: 6 August 2026
- Displayed reading time: 6 minutes, estimated by the query
- Category currently stored: AI & Recruitment

Preserve existing URLs, body content, publication metadata and real imagery unless the user requests an editorial change. Draft Markdown, mockup copy and example titles are not authorization to publish. Do not invent author credentials, dates, claims or additional stories.

## Approved UI and typography

The user approved the **Modern Journal** visual direction, then approved a reading refinement inspired by the left contents navigation in their OpenAI article screenshot. Apply the navigation principle, not a copy of the entire OpenAI site or a chat application shell.

- Preserve the existing shared TalentMesh header and footer.
- Use an open editorial layout, cool light background, navy text, restrained blue accents and softly rounded images.
- Keep Instrument Serif for the `/blog` masthead headline. Schibsted Grotesk now carries story titles, article titles, section headings, body and metadata. Both are already configured in the root layout.
- The original implementation used Instrument Serif headings with Inter body. Older mockups and early design notes may still show that superseded pairing.
- Article title: up to 60px on desktop, 34–48px on mobile; weight 600. Article H2: 32px desktop, 28px mobile.
- Body: 18px desktop, 17px mobile, line-height 1.65 and maximum measure 68ch. Metadata: 14px.
- Intro-to-feature gap: 48px desktop, 36px mobile. Feature image-to-copy gap: 40px desktop, 28px mobile.
- Story-title hover changes to darker blue without an underline. The old heavy multiline underline was rejected. Dotted underlines were discussed but not chosen.
- Keep the visible “Read article” arrow link and keyboard focus outline. Inline prose links remain underlined.

The index shows the newest published story as the feature. Remaining real stories populate “More from the journal”; with one story, it appears only once. There is no category filter or category archive implementation yet.

## Article navigation and responsive behaviour

- At 1200px and wider, contents form a 220px sticky left rail, separated from the reading column by 48px.
- The title and cover introduce the article; the rail starts beside the body.
- Current-section tracking adds `aria-current="location"`, a vertical marker and stronger text, rather than relying on colour alone.
- The rail stays within the article reading layout and can scroll internally if its content exceeds the available height.
- Narrower views use a native, initially closed “On this page” disclosure before the article body.
- Contents are derived from actual top-level body headings. IDs are based on Sanity block keys. Anchor headings clear the fixed header with a 110px scroll margin.
- Keep server-rendered article text and ordinary anchor links. Only active-section tracking needs client JavaScript.
- Preserve readable mobile gutters, wrapping, focus visibility and reduced-motion handling. Check actual long headings when changing fonts or column widths.

## Implementation map

| File | Responsibility |
| --- | --- |
| `app/blog/page.tsx` | Server-rendered listing, feature, archive and empty state |
| `app/blog/[slug]/page.tsx` | Article fetching, metadata, JSON-LD, Portable Text, cover and related stories |
| `app/blog/article-contents.tsx` | Client-side section tracking, desktop rail and mobile disclosure |
| `app/blog/post-preview.tsx` | Story previews, metadata and date formatting |
| `app/blog/blog.module.css` | Blog styles and responsive reading refinement |
| `app/blog/blog-image.tsx` | Responsive Next Image wrapper with Sanity CDN loader |
| `app/blog/layout.tsx` | Blog layout metadata |
| `app/blog/loading.tsx`, `error.tsx`, `not-found.tsx` | Loading, recovery and missing-article states |
| `lib/sanity/client.ts`, `queries.ts`, `image.ts` | Sanity client, GROQ queries and image URL helpers |
| `app/layout.tsx` | Existing site font configuration and shared application context |

Blog content is in **Sanity**. Do not introduce an InsForge integration to replace it as part of routine blog work. The query filters `status == "published"` and defined slugs, orders by `publishedAt` descending, and estimates reading time. Related stories match the exact category and exclude the current article. Routes use a 60-second revalidation interval.

The custom image loader requests responsive sizes directly from Sanity. It was introduced after the local Next image optimizer rejected a CDN resolution as a private IP. Do not weaken network protections to work around that problem.

## SEO and content safeguards

Preserve server rendering, meaningful heading hierarchy, descriptive links, canonical URLs, social metadata and escaped BlogPosting JSON-LD. The current canonical site origin is `https://talentmeshsolutions.com`. Keep structured data consistent with real visible CMS content. Missing articles use not-found behaviour; a related-content failure should not hide the primary article.

Before taxonomy or publishing work, inspect the current CMS schema, sitemap and linking behaviour. Category landing pages, tags, pagination, search, author profiles and new publishing workflows have not been agreed or implemented as part of this redesign. Introduce them when the content and user request justify them.

## Working conventions and verification

Read applicable `AGENTS.md`, `PRODUCT.md` and `DESIGN.md`. The local `.agents/skills/better-interface` and its domain skills informed the review. The additional design router is at `.agent-skills/DESIGN_SKILL_ROUTER.md` (not a nested DESIGN/_SKILL_ROUTER.md path).

Preserve unrelated user edits, especially shared navigation, footer, homepage and font setup. Keep Tailwind CSS at the required 3.4 version. Do not deploy or commit merely because the previous design session completed.

Useful checks from the project root:

```powershell
npm run build
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
npx eslint app/blog
```

The separate TypeScript check matters: the Next build configuration skips type validation. Builds may need network access to fetch already configured Google Fonts; a network failure is not evidence of a source-code failure.

Last refinement checks passed: production build, standalone TypeScript and blog ESLint. Browser checks confirmed no horizontal overflow at 1440px and 390px, desktop active-section updates, 110px anchor clearance, and mobile disclosure expansion. These are historical checks, not a guarantee for later edits. A full screen-reader audit, 200% zoom and all future content shapes were not verified in that pass.

Local preview used `http://localhost:3000/blog` with `npm run start` after building. Do not assume an old process is still running or that a production preview reflects new source edits. No deployment was performed in this task.

## Next work

1. Confirm the next real article topic and its source material with the user.
2. Write and verify useful content without filling the UI with placeholder publications.
3. When ready, align Sanity categories with the intended taxonomy and review related-story matching and any new category links.
4. Recheck desktop rail fit, active state, mobile disclosure, hover/focus and long-title wrapping after future UI or content changes.

Supporting history lives in `docs/blog-design-audit.md`, `docs/blog-design-options.md`, `docs/blog-direction.md` and `docs/blog-verification.md`. Earlier mockups under `.impeccable/mocks/decision/` record design exploration; current source and the approved refinement above take precedence over their illustrative content and old font choices.

## Article introduction alignment refinement

The article introduction is now centred independently of the reading columns. At 1200px and wider, the outer article container is 1068px maximum, the left-aligned breadcrumb and header form a centred 800px column, and the cover forms a centred 900px column. The body uses a 220px left contents rail, a 48px gap and the remaining reading column. There is no whole-container translation or negative margin. Narrower layouts retain their previous centred container and mobile disclosure. This supersedes the earlier shifted article-container arrangement.
