import { createClient } from 'npm:@insforge/sdk';

type BlogRecord = {
  id: string;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  content?: string | null;
  category?: string | null;
  cover_image?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  author_id?: string | null;
  author?: {
    name?: string | null;
  } | null;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function getReadMinutes(content?: string | null) {
  const words = (content || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function serializeBlog(record: BlogRecord) {
  return {
    ...record,
    slug: record.slug || slugify(record.title),
    excerpt: record.excerpt || '',
    content: record.content || '',
    category: record.category || 'Technology',
    cover_image: record.cover_image || '',
    status: record.status || 'draft',
    read_minutes: getReadMinutes(record.content),
    author: {
      name: record.author?.name || 'TalentMesh Editorial',
    },
  };
}

const baseUrl = Deno.env.get('NEXT_PUBLIC_INSFORGE_URL') || Deno.env.get('INSFORGE_URL')!;
const anonKey = Deno.env.get('NEXT_PUBLIC_INSFORGE_ANON_KEY') || Deno.env.get('INSFORGE_ANON_KEY')!;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug parameter is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const client = createClient({ baseUrl, anonKey });

    const { data, error } = await client.database
      .from('blog')
      .select('id, title, slug, excerpt, content, category, cover_image, status, created_at, author_id, author:profiles(name)')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Blog not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const blog = serializeBlog(data as unknown as BlogRecord);
    return new Response(JSON.stringify({ blog }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const status = err.message === 'Blog not found' ? 404 : 500;
    return new Response(JSON.stringify({ error: err.message || 'Failed to load blog' }), { status, headers: { 'Content-Type': 'application/json' } });
  }
}
