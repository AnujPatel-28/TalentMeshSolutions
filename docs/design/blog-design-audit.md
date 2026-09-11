# TalentMesh blog: discovery audit

Reviewed 11 September 2026. Design discovery only; no application or CMS changes.

## Confirmed brief

The publication should cover practical learning about changing work, skills, technology, tools and productivity alongside hiring. Build categories as content is published. The user identifies one published article: `/blog/hiring-in-india-2026-what-actually-moves-time-to-hire`. Content production follows UI/UX decisions.

## Existing implementation

- Next.js App Router, React 19, Tailwind CSS pinned to 3.4.0, and CSS Modules. Sanity supplies blog content; this surface does not use InsForge.
- `app/blog/page.tsx` fetches published articles in a client effect, showing a full loading screen first. The newest article becomes the feature automatically. Subsequent articles appear in a grid.
- The index has no publication introduction or topic navigation. The featured article title becomes the index H1. A fixed reading-progress indicator measures scrolling on the index.
- Blog styles use Inter for body text and Playfair Display for editorial headings. Global tokens include navy #071A2B, blue #0878B5 and cloud #F4F8FA; compatibility tokens also remain in use.
- The feature overlays text on a photograph with a dark gradient. Large rounded containers, shadows and hover transforms recur. The stylesheet includes substantial unused sections for resources, newsletter and topic lists.
- Article pages are server rendered, use Portable Text, display author/date/read time, and query related articles by exact category string. There is no contents navigation; heading styles are inline.
- Canonicals and article Open Graph/Twitter metadata exist. The sitemap queries published Sanity posts. No Article/BlogPosting JSON-LD was found in the article template. Inline body images currently have empty alt text.
- Repository documentation records older category inconsistencies and five Markdown drafts. Those files are not rendered by the application. Its recorded Sanity inventory is historical, not a fresh live-data verification.
- Uncommitted changes exist in the main layout, homepage, header, footer and other files. Preserve those during implementation.

## UX requirements for the design round

Design explicitly for one published story. Avoid empty category sections, duplicate story cards, invented popular content, and nonfunctional newsletter forms. Keep the existing article URL. Distinguish load failures from an empty publication.

As the library grows, show only populated categories. Hiring & Recruitment is the proposed home for the existing story; Future Skills & Workflows becomes visible when relevant content is published. Category assignment remains a later content decision.

Article designs should account for long titles, missing covers, mobile reading, linked headings, accessible tables/code examples, source links and honest author/date information. Navigation and text must work without hover or motion. Use visible focus and readable contrast.

## SEO implementation priorities

1. Server render article links, titles and excerpts on the index. Keep interactive filters as an enhancement.
2. Preserve canonical URLs and the published-post sitemap; broaden the index title and description to match the approved editorial scope.
3. Add truthful BlogPosting structured data with headline, images, author and publication date. Use modification dates only when tracked reliably.
4. Use descriptive headings and crawlable links. Add category landing pages only when they have useful content; do not generate empty archives.
5. Supply responsive image sizes and meaningful alternative text for informative images. Remove the index's unconditional image-optimization bypass if the configured image pipeline supports the source.
6. Verify rendered HTML, metadata, structured data, mobile layout and keyboard access during implementation. These checks do not guarantee search rankings.

## References

- Inspiration collection: https://www.sitebuilderreport.com/inspiration/blog-examples — useful starting points include Deem, Perplexity Hub, Ali Abdaal and Benedict Evans. Individual sites have not yet been visually audited.
- Google JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google Article structured data: https://developers.google.com/search/docs/appearance/structured-data/article

## Pending discovery

The user has been asked whether this round includes the article page and whether to retain the main TalentMesh navigation. Visual direction and typography are not yet approved. Continue the Impeccable discovery flow from those answers before selecting the final concept.
