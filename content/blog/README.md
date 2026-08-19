# Blog drafts — how to publish these into Sanity

These five `.md` files are publish-ready drafts for the `/blog` section. The site reads
posts from Sanity (`lib/sanity/client.ts`), so these files are **source drafts**, not
something the app renders. Publishing means creating a `post` document in the Sanity
Studio and copying the content across.

## The five posts

| # | Title | Category | publishedAt |
|---|---|---|---|
| 01 | How to Choose a Recruitment Agency in Ahmedabad | Hiring Strategy | 2026-08-11 |
| 02 | RPO vs Staffing Agency vs In-House Recruiting | Hiring Strategy | 2026-08-04 |
| 03 | Bulk Hiring in India: A Step-by-Step Playbook | Hiring Strategy | 2026-07-28 |
| 04 | Background Verification in India | Compliance & Workforce | 2026-07-21 |
| 05 | Contract and Flexi Staffing in India | Compliance & Workforce | 2026-07-14 |

Only two categories are used, on purpose. `RELATED_POSTS_QUERY` in
`lib/sanity/queries.ts` matches `category` as an exact string, so a category with only
one post renders no "Related Articles" section. Keep every category at two or more posts.

The newest post becomes the featured hero on `/blog` — the listing is ordered by
`publishedAt desc` and `posts[0]` is rendered as the magazine cover. Post 01 is dated
newest deliberately. Change the dates if you want a different post in the hero.

## Current state in Sanity (checked against the live dataset)

Three `post` documents exist:

| Title | Slug | Category | Status |
|---|---|---|---|
| Hiring in India in 2026: what actually moves time-to-hire | `hiring-in-india-2026-what-actually-moves-time-to-hire` | AI & Recruitment | published |
| How to Choose a Recruitment Agency in Ahmedabad | `how-to-choose-a-recruitment-agency-in-ahmedabad` | Hiring | draft |
| RPO vs Staffing Agency vs In-House Recruiting | `rpo-vs-staffing-agency-vs-in-house-recruiting-which-hiring-model-fits-you` | Hiring | draft |

Two things to reconcile before publishing the rest:

1. **The RPO post's slug was changed** from the draft's `rpo-vs-staffing-agency-vs-in-house-recruitment`
   to the longer full-title version. Posts 01 and 03 cross-link to the short slug, so those
   links will 404. Either shorten the slug in the Studio, or update the two links and the
   `slug:` line in `02-…md` to match what is live. Shorter is better for SEO.
2. **Categories diverge.** The dataset uses `Hiring` and `AI & Recruitment`; these drafts use
   `Hiring Strategy` and `Compliance & Workforce`. Pick one taxonomy and apply it everywhere —
   Related Articles is an exact string match, and a category holding one post renders no
   related section at all. `AI & Recruitment` currently has exactly one post.

## Fields to fill in the Studio

The frontmatter block in each file maps 1:1 to the fields the site actually queries:

| Frontmatter key | Studio field | Notes |
|---|---|---|
| `title` | Title | Rendered as the `<h1>`; the body starts at H2 for this reason |
| `slug` | Slug | Becomes `/blog/<slug>` — do not change after publishing |
| `excerpt` | Excerpt | Shown on cards and the hero; kept near 150 chars |
| `category` | Category | Exact string match — watch capitalisation and the `&` |
| `authorName` | Author name | Falls back to "TalentMesh Editorial" if left empty |
| `publishedAt` | Published at | Controls ordering and the hero slot |
| `status` | Status | Must be `published` — everything else is filtered out by the queries |
| `coverImage` | Cover image | **Required in practice, see below** |

`readTimeMinutes` is *not* a field. It is computed inside the GROQ query from the body
length, so it appears automatically once the body is in.

The HTML comment block below the frontmatter (`seoTitle`, `metaDescription`, keywords,
cover image brief) is **reference only**. Those are not fields in the current schema — see
"Known SEO gap" below. Do not paste that block into the body.

## Cover images are not optional

`app/blog/page.tsx` guards the hero image with `{featuredPost.coverImage && …}`, so a post
without a cover renders as title text over an empty box. Every post needs an image uploaded
in the Studio before it goes live.

Each file contains a cover image brief and alt text in the reference comment. Target 1400px
wide minimum, 16:9. The detail page falls back to `/images/tech-office.jpg` if a cover is
missing, but the listing page does not.

## Importing with the script (recommended)

`scripts/import-blog-posts.ts` converts these files to Portable Text and writes them
straight into Sanity, including link annotations — which are the tedious part by hand.

```
npx tsx scripts/import-blog-posts.ts --all --dry-run     # plan only, writes nothing
npx tsx scripts/import-blog-posts.ts --all --dry-run --verbose   # + block/mark breakdown
npx tsx scripts/import-blog-posts.ts --all               # create everything missing
npx tsx scripts/import-blog-posts.ts --all --replace     # also overwrite posts already there
npx tsx scripts/import-blog-posts.ts content/blog/03-*.md
```

It needs `SANITY_API_WRITE_TOKEN` in `.env.local` — create one at sanity.io/manage under
API > Tokens with Editor permissions. Do not commit it.

Behaviour worth knowing:

- **Imports as `status: draft`** regardless of what the frontmatter says. Cover images can
  only be attached in the Studio, and a published post without one breaks the listing hero.
  Pass `--status published` to override.
- **An update only patches what the markdown owns** — title, slug, excerpt, category,
  author, body. `coverImage`, `status` and `publishedAt` are left untouched, so re-importing
  an edited draft will not un-publish a live post, wipe its cover image, or undo a date you
  changed to control the featured hero. (`--status` still applies if you pass it explicitly.)
- **Skips posts already in Sanity**, matched on slug *or* title, unless you pass `--replace`.
- **Aborts on unsupported markdown** — code fences, tables, blockquotes, `#` or `####`+
  headings, horizontal rules — naming the file and line rather than dropping content.

The converter is hand-rolled rather than `@sanity/block-tools`, which would need block-tools
plus `@sanity/schema` plus a markdown-to-HTML parser plus a local copy of the Studio schema
to handle a markdown subset we author and fully control.

## Pasting the body by hand (fallback)

`app/blog/[slug]/page.tsx` renders Portable Text with a custom component map that covers:

- `h2`, `h3`
- normal paragraphs
- bulleted and numbered lists
- inline images

Anything outside that set falls back to default rendering or is dropped. So when pasting:

- **Do not add an H1.** The page already renders the title as the `<h1>`.
- **Do not use H4 or deeper**, tables, code blocks or callouts — none are styled.
- **Markdown links become link annotations.** Select the text in the Studio editor and add
  the link annotation manually; the `[text](/path)` syntax will not convert itself.
- **Bold and italic** work as standard marks.

All internal links used in the bodies were checked against `app/` and exist:
`/portals/jobs/contact`, `/employers/post-job`, `/employers/sourcing`, `/employers/rpo`.

### Publish all five, or fix the cross-links

The posts link to each other on purpose — 01 → 02, 02 → 03, 03 → 02 and 05, 04 ↔ 05.
Those `/blog/<slug>` targets only resolve once the linked post is published, so either
publish the whole set, or drop the cross-links from any post whose target is not live yet.
Each file lists its own cross-links in the reference comment.

## Before you publish posts 04 and 05

Both compliance posts carry a `LEGAL REVIEW NOTE` in their reference comment. They name
statutes but deliberately avoid quoting wage ceilings, contribution rates, headcount
thresholds and commencement dates, because those change and several are state-specific.
Do not add specific figures without confirming the current position. Both posts carry an
explicit "confirm with your own advisor" line — keep it.

## Claims policy applied to these drafts

Following the rule stated at the top of `content/home.ts`, these posts contain **no invented
TalentMesh metrics** — no client counts, placement counts, years in business or case studies —
and no unattributed third-party statistics. Company claims are limited to what is already
stated on the site: Ahmedabad HQ recruiting across India, the service and engagement models,
the five-stage process, the industries served, background verification and reference checks
as part of the service range, and the 48–72 hour shortlist expectation for standard mandates
(with the caveat that niche, senior and confidential searches take longer).

If you want to add statistics later, source them and cite them inline.

## Known SEO gap (not fixed here)

These posts will be indexed with generic metadata until two things change:

1. `app/blog/[slug]/page.tsx` has no `generateMetadata` export — there is no per-post
   `<title>`, meta description, canonical URL, Open Graph or Twitter card, and no Article
   JSON-LD. Every post currently inherits the root layout's metadata.
2. `app/blog/page.tsx` is a client component that sets `document.title` inside a
   `useEffect`, and fetches posts client-side. The listing has no server-rendered metadata
   and no server-rendered post content.

`app/sitemap.ts` does already pull published slugs from Sanity, so the URLs will be
discovered. The `seoTitle` / `metaDescription` / keyword blocks in each draft are written
and ready for whenever the metadata work happens.
