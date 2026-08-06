// GROQ queries against the `post` document type (see the Studio's postType.ts schema).
// Read time is estimated in-query (200 wpm) so the listing page doesn't need to fetch body.

export const POSTS_LIST_QUERY = `*[_type == "post" && status == "published" && defined(slug.current)]
  | order(publishedAt desc) {
    "id": _id,
    title,
    "slug": slug.current,
    excerpt,
    category,
    coverImage,
    authorName,
    publishedAt,
    "readTimeMinutes": round(length(pt::text(body)) / 5 / 200) + 1
  }`;

export const POST_BY_SLUG_QUERY = `*[_type == "post" && status == "published" && slug.current == $slug][0] {
  "id": _id,
  title,
  "slug": slug.current,
  excerpt,
  category,
  coverImage,
  authorName,
  publishedAt,
  body,
  "readTimeMinutes": round(length(pt::text(body)) / 5 / 200) + 1
}`;

export const RELATED_POSTS_QUERY = `*[_type == "post" && status == "published" && category == $category && _id != $id]
  | order(publishedAt desc)[0...3] {
    "id": _id,
    title,
    "slug": slug.current,
    category,
    coverImage
  }`;
