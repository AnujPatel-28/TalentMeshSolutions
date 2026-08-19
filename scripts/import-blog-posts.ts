/**
 * Imports the markdown drafts in content/blog/ into Sanity as `post` documents.
 *
 * The document shape written here was verified against the live dataset rather than
 * assumed: `slug` is a slug object, `body` is an array of `block`s using styles
 * `h2`/`h3`/`normal`, list items carry `listItem` + `level: 1`, inline marks are
 * `strong`/`em`, and links are `markDefs` entries of `_type: 'link'` with an `href`.
 *
 * Deliberately hand-rolled rather than using @sanity/block-tools: that route needs
 * block-tools + @sanity/schema + a markdown-to-HTML parser + a local copy of the
 * Studio schema, to convert a markdown subset we author ourselves and fully control.
 *
 * Supported markdown: `##`/`###` headings, paragraphs, `-` bullets, `1.` numbered
 * lists, `**strong**`, `*em*`/`_em_`, and `[text](href)` links. Anything else — code
 * fences, tables, blockquotes, `#` or `####`+ headings, horizontal rules — aborts the
 * run with a file and line number rather than being silently dropped.
 *
 * Cover images are never written. Sanity images need an uploaded asset, so the cover
 * is attached in the Studio. That is also why imports default to `status: draft`: a
 * published post with no cover renders as bare title text over an empty box on /blog
 * (see the `{featuredPost.coverImage && …}` guard in app/blog/page.tsx).
 *
 * Usage:
 *   npx tsx scripts/import-blog-posts.ts --all --dry-run     # plan only, writes nothing
 *   npx tsx scripts/import-blog-posts.ts content/blog/03-bulk-hiring-in-india-a-step-by-step-playbook.md
 *   npx tsx scripts/import-blog-posts.ts --all               # create everything missing
 *   npx tsx scripts/import-blog-posts.ts --all --replace     # also update posts already in Sanity
 *   npx tsx scripts/import-blog-posts.ts --all --status published
 *
 * Requires SANITY_API_WRITE_TOKEN in .env.local — create one at sanity.io/manage
 * (API > Tokens) with Editor permissions. Never commit it.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

['.env.local', '.env.development', '.env'].forEach((file) => {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) dotenv.config({ path: filePath });
});

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const TOKEN = process.env.SANITY_API_WRITE_TOKEN;
const API_VERSION = '2026-01-01'; // matches lib/sanity/client.ts
const BLOG_DIR = path.resolve(process.cwd(), 'content/blog');

// ---------------------------------------------------------------- portable text

interface Span { _key: string; _type: 'span'; marks: string[]; text: string }
interface MarkDef { _key: string; _type: 'link'; href: string }
interface Block {
  _key: string;
  _type: 'block';
  style: string;
  markDefs: MarkDef[];
  children: Span[];
  listItem?: 'bullet' | 'number';
  level?: number;
}

/** 12 hex chars, matching the _key format Sanity's own editor produces. */
function newKey(): string {
  let out = '';
  for (let i = 0; i < 12; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|(?<![*\w])\*([^*\n]+)\*(?!\w)|(?<![_\w])_([^_\n]+)_(?!\w)/;

/** Splits a line of markdown into spans, recursing so marks can nest (bold inside a link). */
function parseInline(text: string, marks: string[], markDefs: MarkDef[]): Span[] {
  const spans: Span[] = [];

  const pushText = (value: string) => {
    if (!value) return;
    const last = spans[spans.length - 1];
    const same = last && last.marks.length === marks.length && last.marks.every((m, i) => m === marks[i]);
    if (same) last.text += value;
    else spans.push({ _key: newKey(), _type: 'span', marks: [...marks], text: value });
  };

  let rest = text;
  while (rest) {
    const match = INLINE.exec(rest);
    if (!match) {
      pushText(rest);
      break;
    }
    pushText(rest.slice(0, match.index));

    const [full, linkText, href, strong, star, underscore] = match;
    if (linkText !== undefined) {
      const def: MarkDef = { _key: newKey(), _type: 'link', href };
      markDefs.push(def);
      spans.push(...parseInline(linkText, [...marks, def._key], markDefs));
    } else if (strong !== undefined) {
      spans.push(...parseInline(strong, [...marks, 'strong'], markDefs));
    } else {
      spans.push(...parseInline((star ?? underscore) as string, [...marks, 'em'], markDefs));
    }
    rest = rest.slice(match.index + full.length);
  }

  // A block with no children is invalid Portable Text.
  if (!spans.length) spans.push({ _key: newKey(), _type: 'span', marks: [], text: '' });
  return spans;
}

function textBlock(style: string, text: string): Block {
  const markDefs: MarkDef[] = [];
  const children = parseInline(text, [], markDefs);
  return { _key: newKey(), _type: 'block', style, markDefs, children };
}

/** `lineOffset` is how many lines the frontmatter consumed, so errors cite the real file line. */
function markdownToBlocks(markdown: string, file: string, lineOffset = 0): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let inComment = false;

  const flush = () => {
    if (!paragraph.length) return;
    blocks.push(textBlock('normal', paragraph.join(' ')));
    paragraph = [];
  };

  markdown.split(/\r?\n/).forEach((raw, index) => {
    const where = `${file}:${index + 1 + lineOffset}`;
    const line = raw.trim();

    if (inComment) {
      if (line.includes('-->')) inComment = false;
      return;
    }
    if (line.startsWith('<!--')) {
      if (!line.includes('-->')) inComment = true;
      return;
    }
    if (!line) return flush();

    if (line.startsWith('```')) throw new Error(`${where}: code blocks are not styled by app/blog/[slug]/page.tsx`);
    if (line.startsWith('|')) throw new Error(`${where}: tables are not styled by app/blog/[slug]/page.tsx`);
    if (line.startsWith('>')) throw new Error(`${where}: blockquotes are not styled by app/blog/[slug]/page.tsx`);
    if (/^([-*_])\1{2,}$/.test(line)) throw new Error(`${where}: horizontal rules have no Portable Text equivalent`);

    const heading = /^(#+)\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      if (level === 1) throw new Error(`${where}: body must not contain an H1 — the page renders the title as the h1`);
      if (level > 3) throw new Error(`${where}: only h2 and h3 are styled, found h${level}`);
      flush();
      blocks.push(textBlock(`h${level}`, heading[2]));
      return;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(line);
    const numbered = /^\d+\.\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flush();
      const item = textBlock('normal', (bullet ?? numbered)![1]);
      item.listItem = bullet ? 'bullet' : 'number';
      item.level = 1;
      blocks.push(item);
      return;
    }

    paragraph.push(line);
  });

  flush();
  return blocks;
}

// ---------------------------------------------------------------- drafts on disk

interface Draft {
  file: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  authorName: string;
  publishedAt: string;
  status: string;
  body: Block[];
}

const FIELDS = ['title', 'slug', 'excerpt', 'category', 'authorName', 'publishedAt', 'status'] as const;

function readDraft(filePath: string): Draft {
  const file = path.relative(process.cwd(), filePath);
  const source = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, '');

  if (!source.startsWith('---')) throw new Error(`${file}: missing frontmatter block`);
  const end = source.indexOf('\n---', 3);
  if (end === -1) throw new Error(`${file}: frontmatter block is not closed`);

  const front: Record<string, string> = {};
  source.slice(3, end).split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const colon = trimmed.indexOf(':');
    if (colon === -1) return;
    const key = trimmed.slice(0, colon).trim();
    if (!(FIELDS as readonly string[]).includes(key)) return; // ignores the prose `coverImage:` note
    front[key] = trimmed.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
  });

  for (const key of ['title', 'slug', 'excerpt', 'category', 'publishedAt'] as const) {
    if (!front[key]) throw new Error(`${file}: frontmatter is missing \`${key}\``);
  }

  const lineOffset = (source.slice(0, end + 4).match(/\n/g) ?? []).length;
  const body = markdownToBlocks(source.slice(end + 4), file, lineOffset);
  if (!body.length) throw new Error(`${file}: body is empty`);
  if (body[0].style !== 'h2') throw new Error(`${file}: body should open with an H2, found "${body[0].style}"`);

  return {
    file,
    title: front.title,
    slug: front.slug,
    excerpt: front.excerpt,
    category: front.category,
    authorName: front.authorName || 'TalentMesh Editorial',
    publishedAt: front.publishedAt,
    status: front.status || 'draft',
    body,
  };
}

// ---------------------------------------------------------------- sanity api

async function sanityRequest(kind: 'query' | 'mutate', init: RequestInit & { search?: string } = {}) {
  const { search = '', ...rest } = init;
  const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/${kind}/${DATASET}${search}`;
  const response = await fetch(url, {
    ...rest,
    headers: {
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const json: any = await response.json();
  if (!response.ok || json.error) {
    throw new Error(`Sanity ${kind} failed (${response.status}): ${JSON.stringify(json.error ?? json)}`);
  }
  return json;
}

interface Existing { _id: string; title: string; slug: string | null; status: string | null }

async function fetchExisting(): Promise<Existing[]> {
  const query = `*[_type == "post"]{_id, title, "slug": slug.current, status}`;
  const json = await sanityRequest('query', { search: `?query=${encodeURIComponent(query)}` });
  return json.result ?? [];
}

// ---------------------------------------------------------------- run

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const replace = args.includes('--replace');
  const statusIndex = args.indexOf('--status');
  const statusOverride = statusIndex === -1 ? undefined : args[statusIndex + 1];

  if (statusIndex !== -1 && !['draft', 'published'].includes(statusOverride ?? '')) {
    throw new Error(`--status must be followed by "draft" or "published", got "${statusOverride ?? '(nothing)'}"`);
  }
  if (!PROJECT_ID) {
    throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set — add it to .env.local');
  }

  const explicit = args.filter((a) => a.endsWith('.md'));
  const files = explicit.length
    ? explicit.map((f) => path.resolve(process.cwd(), f))
    : args.includes('--all')
      ? fs.readdirSync(BLOG_DIR).filter((f) => /^\d+.*\.md$/.test(f)).sort().map((f) => path.join(BLOG_DIR, f))
      : [];

  if (!files.length) {
    console.log('Nothing to do. Pass one or more .md paths, or --all for every numbered draft in content/blog/.');
    console.log('Add --dry-run first to see the plan without writing anything.');
    return;
  }

  // Parse everything before touching the network, so a bad file aborts the whole run.
  const drafts = files.map(readDraft);
  const existing = await fetchExisting();

  interface Action { draft: Draft; verb: 'create' | 'update' | 'skip'; target?: Existing; note?: string }
  const actions: Action[] = drafts.map((draft) => {
    const bySlug = existing.find((e) => e.slug === draft.slug);
    const byTitle = existing.find((e) => e.title === draft.title);
    const target = bySlug ?? byTitle;

    if (!target) return { draft, verb: 'create' };
    const note = !bySlug && byTitle
      ? `matched on title, not slug — Sanity has "${byTitle.slug}", this draft has "${draft.slug}"`
      : undefined;
    return replace ? { draft, verb: 'update', target, note } : { draft, verb: 'skip', target, note };
  });

  console.log(`\nProject ${PROJECT_ID} / dataset ${DATASET}\n`);
  actions.forEach(({ draft, verb, target, note }) => {
    const status = verb === 'update' && !statusOverride
      ? 'status/publishedAt left as-is'
      : `status ${statusOverride ?? 'draft'}`;
    const label = verb === 'skip' ? 'SKIP  ' : verb === 'update' ? 'UPDATE' : 'CREATE';
    console.log(`${label} ${draft.slug}`);
    console.log(`       ${draft.body.length} blocks · category "${draft.category}" · ${status} · from ${draft.file}`);
    if (target) console.log(`       existing document ${target._id} (status ${target.status})`);
    if (note) console.log(`       ! ${note}`);
    if (verb === 'skip') console.log('       already in Sanity — pass --replace to overwrite it');
    if (verb === 'update' && note) console.log('       ! --replace will change the slug in Sanity, breaking any live link to the old one');
  });

  if (args.includes('--verbose')) {
    console.log('\nConverted block breakdown:');
    drafts.forEach((draft) => {
      const tally: Record<string, number> = {};
      const bump = (k: string) => { tally[k] = (tally[k] ?? 0) + 1; };
      draft.body.forEach((b) => {
        bump(b.listItem ? `list:${b.listItem}` : b.style);
        b.markDefs.forEach(() => bump('link'));
        const defKeys = new Set(b.markDefs.map((d) => d._key));
        b.children.forEach((c) => c.marks.forEach((m) => bump(defKeys.has(m) ? 'link-span' : `mark:${m}`)));
      });
      const counts = Object.entries(tally).sort().map(([k, v]) => `${k}=${v}`).join(' ');
      console.log(`  ${draft.slug}\n    ${counts}`);
    });

    console.log('\nSample converted blocks (first heading, a list item, and a block with a link):');
    const sample = drafts[0];
    const picks = [
      sample.body.find((b) => b.style === 'h2'),
      sample.body.find((b) => b.listItem),
      sample.body.find((b) => b.markDefs.length),
    ].filter(Boolean) as Block[];
    picks.forEach((b) => console.log(`  ${JSON.stringify(b)}`));
  }

  const writes = actions.filter((a) => a.verb !== 'skip');
  if (!writes.length) {
    console.log('\nNothing to write.\n');
    return;
  }
  if (dryRun) {
    console.log(`\nDry run — ${writes.length} document(s) would be written. Re-run without --dry-run to apply.\n`);
    return;
  }
  if (!TOKEN) {
    throw new Error('SANITY_API_WRITE_TOKEN is not set — add an Editor token from sanity.io/manage to .env.local');
  }

  const mutations = writes.map(({ draft, verb, target }) => {
    // Only the fields the markdown owns. `coverImage` is absent because it needs an
    // uploaded asset; on an update `status` and `publishedAt` are absent too, since
    // those are set in the Studio after import — re-sending them would un-publish a
    // live post and undo any date change made to control the featured hero.
    const doc: Record<string, unknown> = {
      title: draft.title,
      slug: { _type: 'slug', current: draft.slug },
      excerpt: draft.excerpt,
      category: draft.category,
      authorName: draft.authorName,
      body: draft.body,
    };
    if (verb === 'create') {
      doc.publishedAt = draft.publishedAt;
      doc.status = statusOverride ?? 'draft';
    } else if (statusOverride) {
      doc.status = statusOverride;
    }
    return verb === 'create'
      ? { create: { _type: 'post', ...doc } }
      : { patch: { id: target!._id, set: doc } };
  });

  const result = await sanityRequest('mutate', {
    method: 'POST',
    search: '?returnIds=true',
    body: JSON.stringify({ mutations }),
  });

  console.log(`\nWrote ${result.results?.length ?? mutations.length} document(s).`);
  (result.results ?? []).forEach((r: any) => console.log(`  ${r.operation} ${r.id}`));
  console.log('\nNext, in the Studio:');
  console.log('  1. Upload a cover image on each post — /blog hides the hero image without one.');
  console.log('  2. Check the category matches the others exactly; Related Articles is an exact string match.');
  console.log('  3. Flip status to published when the post is ready.\n');
}

main().catch((error) => {
  console.error(`\n${error.message}\n`);
  process.exit(1);
});
