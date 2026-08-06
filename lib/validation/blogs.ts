import { z } from 'zod';

const BLOG_STATUS_VALUES = ['draft', 'published', 'archived', 'deleted'] as const;
const BLOG_CATEGORY_VALUES = [
  'General',
  'Technology',
  'Career Advice',
  'AI & Recruitment',
  'Success Stories',
  'Product Updates',
  'Culture',
  'Engineering',
  'Product'
] as const;

const normalizeCategory = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  const match = BLOG_CATEGORY_VALUES.find((entry) => entry.toLowerCase() === trimmed.toLowerCase());
  return match || trimmed;
};

export const blogBaseSchema = z.object({
  title: z.string().min(6, 'Title must be at least 6 characters').max(180, 'Title must be less than 180 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').max(200, 'Slug must be less than 200 characters').optional(),
  excerpt: z.string().min(20, 'Excerpt must be at least 20 characters').max(320, 'Excerpt must be less than 320 characters'),
  content: z.string().min(80, 'Content must be at least 80 characters').max(30000, 'Content must be less than 30000 characters'),
  category: z.preprocess(normalizeCategory, z.enum(BLOG_CATEGORY_VALUES)),
  cover_image: z.string().url('Cover image must be a valid URL').or(z.literal('')).optional(),
  status: z.enum(BLOG_STATUS_VALUES).optional(),
  author_id: z.string().min(1).optional(),
});

export const createBlogSchema = blogBaseSchema;
export const updateBlogSchema = blogBaseSchema.partial();

export const blogFilterSchema = z.object({
  search: z.string().trim().optional(),
  category: z.preprocess(normalizeCategory, z.enum(['All', ...BLOG_CATEGORY_VALUES]).optional()),
  status: z.enum(['all', ...BLOG_STATUS_VALUES]).optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
export type BlogFilterInput = z.infer<typeof blogFilterSchema>;

const flattenErrors = (error: z.ZodError) => {
  const errors: Record<string, string> = {};
  error.issues.forEach((issue: z.ZodIssue) => {
    const path = issue.path[0]?.toString();
    if (path && !errors[path]) {
      errors[path] = issue.message;
    }
  });
  return errors;
};

export const validateCreateBlog = (data: unknown) => {
  const result = createBlogSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateUpdateBlog = (data: unknown) => {
  const result = updateBlogSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};

export const validateBlogFilter = (data: unknown) => {
  const result = blogFilterSchema.safeParse(data);
  return result.success
    ? { success: true, data: result.data, errors: null }
    : { success: false, data: null, errors: flattenErrors(result.error) };
};
