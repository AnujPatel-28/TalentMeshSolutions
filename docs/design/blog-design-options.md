# TalentMesh blog design options

Status: option 2, Modern Journal, approved and implemented for /blog and article reading pages. Existing header and footer remain unchanged; generated chrome is illustrative. See DESIGN.md for the final scoped system and blog-direction.md for the approved brief. Specifications below record exploration intentions; final measurements and behavior are documented in DESIGN.md.

## Options

1. The Work Review: substantial editorial serif, ivory ground, navy ink, fine rules, lead story beside its image. Article contents occupy a side rail on wide screens. More formal publication identity; the proposed name is optional.
2. The Modern Journal (recommended): expressive Instrument Serif-style headings, Inter body and controls, cloud-white ground, navy text, blue links. Large introductory typography above a split feature. Article contents are an inline disclosure. Familiar editorial layout with stronger emphasis on approachable learning. Instrument Serif and Inter are already imported by the root layout; inspect mounted variables and loaded styles before implementation.
3. Classic blog: Inter throughout, white ground, compact introduction and one conventional featured story card. Simple single-column article reading layout.

All options are image proposals, not verified browser layouts. Sample article text and generated office photography are presentation material only. Preserve the real article title, body, author, dates, cover and URL when implementing. The main shared header/footer must use the actual existing components, not the generated approximations.

## Proposed implementation specification after selection

- Body: Inter 18px desktop and 17px mobile, 1.6 line height, approximately 65 characters per line. Metadata 14px. Article H1 approximately 48px desktop and 34px mobile; final wrapping to be tested with the actual title.
- Keep headings in a descending semantic hierarchy, underlined inline links, selectable text and visible keyboard focus. Respect reduced motion and ensure article text is visible without entrance animations.
- Desktop index: maximum content width around 1200px; collapse feature into one column when title and image cannot fit comfortably. On small screens use 20px page margins, intro, story title and supporting metadata, then image and excerpt.
- Article: contents disclosure on mobile; side rail only for the Work Review when width permits. Anchor offsets must clear the fixed site header. Tables and code scroll inside their own regions, not the entire page.
- One published story: feature once, no repeated archive entry, no empty category filter, no fake popular posts. With more stories, add the archive below the feature and expose populated categories. Retain author, real publication date and estimated read time in the finished UI.
- Keep /blog/hiring-in-india-2026-what-actually-moves-time-to-hire. Future category work should reconcile the existing Sanity category strings without changing article URLs.
- Server render the index and article content. Preserve canonical/social metadata and sitemap, add accurate BlogPosting JSON-LD, and improve responsive image delivery and informative alt text. See blog-design-audit.md for source links and existing implementation findings.
- Distinguish unavailable content from an empty library. Missing covers must produce a deliberate text-led feature rather than a broken or arbitrary image.

## Mockup inventory

All images contain both homepage and article concepts. Exact prompts are embedded and recorded in adjacent JSON files. Modern Journal is approved; the other images remain unselected explorations.

- .impeccable/mocks/decision/work-review.png
- .impeccable/mocks/decision/modern-journal.png
- .impeccable/mocks/decision/classic-blog.png

Comparison page: http://127.0.0.1:53915/ (local session only).
Historical decision key: e42fb71a. Selection is complete; no new decision is required.


