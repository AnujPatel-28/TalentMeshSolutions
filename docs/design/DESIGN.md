---
name: TalentMesh Modern Journal
description: Implemented visual system for /blog and /blog/[slug] only.
colors:
  journal-ground: "#f4f8fa"
  journal-ink: "#071a2b"
  journal-muted: "#4b5d6c"
  journal-blue: "#0878b5"
  journal-rule: "#d8e2e9"
  reading-ink: "#253e50"
  reading-link: "#006da6"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(60px,7.2vw,96px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(42px,5.2vw,68px)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-.025em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "18px"
    lineHeight: 1.65
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: ".12em"
rounded:
  media: "8px"
  retry: "6px"
spacing:
  mobile-gutter: "20px"
  desktop-gutter: "40px"
  feature-gap: "44px"
components:
  read-link:
    textColor: "{colors.journal-blue}"
  retry:
    backgroundColor: "transparent"
    textColor: "{colors.journal-blue}"
    rounded: "{rounded.retry}"
    padding: "10px 20px"
---

# Design System: TalentMesh Modern Journal

For editorial scope, category decisions, implementation context and future-session handoff, read [BLOG_CONTEXT.md](BLOG_CONTEXT.md) first. Its approved reading refinement supersedes older typography and contents descriptions below.

## Overview

**Creative North Star: "Modern Journal"**

This document records the implemented blog system, approved through `.impeccable/mocks/decision/modern-journal.png`. Its authority is limited to `/blog` and `/blog/[slug]`. It does not govern other site pages, the shared header, or the shared footer.

Cloud-white surfaces, navy typography and blue links support an approachable learning publication. Expressive serif headings sit above restrained sans-serif reading text. The existing shared navigation and footer frame these surfaces.

**Key Characteristics:**

- Open editorial compositions.
- Instrument Serif headings with Inter reading text.
- Flat surfaces, fine rules and softly rounded images.
- Real published content determines density and wrapping.

The approved comp establishes direction rather than exact content or geometry. The final implementation retains original Sanity imagery, metadata and article URLs; it introduces no shipping raster assets. Earlier option notes are intentions, not final measurements. The finish reviewer returned **ship**, with no code findings; production build, standalone TypeScript and blog ESLint passed. Desktop and mobile full-page screenshot artifacts document the reviewed surfaces; clean viewport evidence is recorded separately by the implementation task.

## Colors

The palette combines cool paper with deep navy and a clear blue accent.

- **Primary:** journal-blue identifies navigation, categories and reading actions; reading-link is the darker inline prose link.
- **Neutral:** journal-ground is the page surface; journal-ink is heading and author ink; journal-muted supports excerpts and metadata; journal-rule separates sections; reading-ink carries long-form text.

## Typography

Display and article titles use Instrument Serif with Georgia fallback. Body, metadata and controls use Inter with sans-serif fallback. The fonts are supplied by the existing root layout.

Feature titles scale from 32px to 46px with 1.12 leading. Article section headings use 38px serif; subheadings use 23px semibold Inter. Reading text is limited to 68ch. Metadata is 13px, differing from the exploratory 14px target. Actual article titles reach 68px on desktop rather than the preliminary 48px proposal.

## Layout

The index container is 1200px maximum; the article container is 900px maximum. Desktop gutters are 40px. The feature places image left and copy right in a 1.35:1 grid. Below 1000px the ratio becomes 1.15:1 and the gap narrows to 28px. The archive changes from three to two columns.

At 760px and below, gutters become 20px, feature and archive become single-column, and the feature image remains before story copy. This is the final order, superseding the early mobile text-first proposal. Intro type uses `clamp(48px,10.4vw,72px)`; article titles use `clamp(38px,8vw,56px)`; prose becomes 17px with 1.65 leading. Top/bottom page padding changes from 142px/100px to 112px/64px.

Tables and code scroll within their own regions. Article heading anchors clear the fixed header with a 110px scroll margin.

## Elevation & Depth

Blog surfaces have no shadows. Fine horizontal rules, image clipping and spacing establish separation. Cover hover gently darkens the image over 240ms ease-out; reduced motion removes the transition.

## Shapes

Images and code regions use softly rounded media corners. Feature images use a 16:10 ratio; article covers use 16:7 on desktop and 16:10 on mobile. Stories remain open compositions without enclosing card borders.

## Components

- **Reading links:** blue text and arrow, minimum 44px target height; hover underlines. Inline prose links are always underlined.
- **Focus:** links, summaries and buttons receive a 2px blue outline with 5px offset and 3px corners.
- **Category labels:** small uppercase blue text, descriptive rather than a filter control. No category filter is implemented.
- **Contents:** inline native disclosure, open initially on both desktop and mobile, framed by horizontal rules. Links target real article headings; it is absent when there are no eligible headings.
- **Story previews:** image, category, serif title, excerpt, author/date/read time and reading action. Missing images produce text-led previews. One published story appears once; additional real stories populate the archive.
- **Retry:** transparent outlined button with minimum 44px height. Empty, loading and error states exist; they were not populated with synthetic content for visual review.

## Do's and Don'ts

- **Do** preserve the approved Modern Journal direction within the blog scope.
- **Do** let real content determine wrapping, feature height and archive density.
- **Do** retain readable prose, visible focus and native contents disclosure.
- **Don't** apply this document to other site pages or shared chrome.
- **Don't** publish illustrative copy or generated comp photography as real content.
- **Don't** treat preliminary option measurements as the implemented design.


## Approved reading refinement — September 11, 2026

Supersedes the typography and contents descriptions above: Schibsted Grotesk now carries article titles, story titles, reading text and metadata. Instrument Serif remains the journal masthead. Story hover changes to dark blue without an underline; inline prose links remain underlined. Metadata is 14px. Intro-to-feature spacing is 48px desktop, 36px mobile; feature gap is 40px desktop, 28px mobile.

At 1200px and wider, article contents occupy a 220px sticky left rail with a 48px gap to the reading column. Active sections use aria-current, a vertical marker and semibold text. The rail remains within the article body and scrolls internally when tall. Narrower views use a native, initially closed disclosure before the body. Article headings retain a 110px anchor clearance. Article text remains server rendered; only section tracking runs on the client.

Validation: production build, standalone TypeScript and blog ESLint passed. Desktop anchor verification found no horizontal overflow and a 110px target offset; the selected section updated correctly.

The article landing section now uses independent centred widths: 800px header and breadcrumb, 900px cover, within a 1068px desktop article container. Only the body uses the 220px contents rail and 48px gap. Removed the previous whole-container right translation; mobile layout is unchanged.
