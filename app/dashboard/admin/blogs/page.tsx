'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Ico from 'lucide-react';
import styles from './blogs.module.css';
import { invokeFunction } from '@/lib/insforge';
import { useAuth } from '@/lib/auth/AuthContext';
import RichTextEditor from '@/components/ui/RichTextEditor';


interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  cover_image: string | null;
  category: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  author_id?: string;
}

interface BlogFormState {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  cover_image: string;
  category: string;
  status: 'draft' | 'published';
}

const defaultFormState: BlogFormState = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  cover_image: '',
  category: 'General',
  status: 'draft',
};

const categoryOptions = [
  'General',
  'Technology',
  'Career Advice',
  'AI & Recruitment',
  'Success Stories',
  'Product Updates'
];

const statusOptions = ['all', 'draft', 'published', 'archived'];

export default function AdminBlogsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogFormState>(defaultFormState);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [avgReadTime, setAvgReadTime] = useState(0);
  const [autoSlug, setAutoSlug] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  // Real-time Slug Generation
  useEffect(() => {
    if (autoSlug && !selectedPost) {
      const slug = form.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setForm(prev => ({ ...prev, slug }));
    }
  }, [form.title, autoSlug, selectedPost]);

  const fetchPosts = useCallback(async (currentSearch = search, currentStatus = status) => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await invokeFunction('admin-blogs', {
        method: 'GET',
        queries: {
          search: currentSearch || undefined,
          status: currentStatus !== 'all' ? currentStatus : undefined,
        }
      });

      
      if (fetchError) throw new Error(fetchError.message);
      
      if (data) {
        const blogList: BlogPost[] = Array.isArray(data.blogs) ? data.blogs : [];
        setPosts(blogList);
        // Compute avg read time from real content (avg 200 words/min)
        if (blogList.length > 0) {
          const totalWords = blogList.reduce((sum, p) => sum + (p.content?.split(/\s+/).filter(Boolean).length || 0), 0);
          const avgWords = totalWords / blogList.length;
          setAvgReadTime(Math.max(1, Math.round(avgWords / 200)));
        } else {
          setAvgReadTime(0);
        }
      }
    } catch (err) {
      setError('Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  const handleCreate = () => {
    setSelectedPost(null);
    setForm(defaultFormState);
    setAutoSlug(true);
    setIsEditing(true);
    setIsPreview(false);
    setError('');
    setSuccess('');
  };

  const handleEdit = (post: BlogPost) => {
    setSelectedPost(post);
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || '',
      cover_image: post.cover_image || '',
      category: post.category || 'General',
      status: post.status === 'archived' ? 'draft' : post.status as any,
    });
    setAutoSlug(false);
    setIsEditing(true);
    setIsPreview(false);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      setError('Title and Content are required to publish');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data, error: saveError } = await invokeFunction('admin-blogs', {
        method: selectedPost ? 'PATCH' : 'POST',
        path: selectedPost ? `/${selectedPost.id}` : undefined,
        body: form
      });

      
      if (saveError) throw new Error(saveError.message);
      
      if (data) {
        setSuccess(selectedPost ? 'Article updated' : 'Article published successfully');
        setTimeout(() => setIsEditing(false), 1500);
        fetchPosts();
      }
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      const { error: deleteError } = await invokeFunction('admin-blogs', {
        method: 'DELETE',
        path: `/${id}`
      });

      if (deleteError) throw new Error(deleteError.message);
      
      setSuccess('Article deleted');
      fetchPosts();
    } catch (err) {
      setError('Delete failed');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const { data, error: uploadError } = await invokeFunction('upload-blog-image', {
        method: 'POST',
        body: formData,
      });


      if (uploadError) throw new Error(uploadError.message);

      if (data?.url) {
        setForm(prev => ({ ...prev, cover_image: data.url }));
        setSuccess('Image uploaded');
      }
    } catch (err) {
      setError('Image upload failed');
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className={styles.editorOverlay}>
        <header className={styles.editorHeader}>
          <div className={styles.headerLeft}>
            <button className={styles.iconButton} onClick={() => setIsEditing(false)}>
              <Ico.ChevronLeft />
            </button>
            <input 
              className={styles.editorTitleInput}
              placeholder="Article Title..."
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              autoFocus
            />
          </div>
          <div className={styles.headerRight}>
            <button className={styles.secondaryButton} onClick={() => setIsPreview(!isPreview)}>
              {isPreview ? 'Back to Editor' : 'Story Preview'}
            </button>
            <button className={styles.primaryButton} onClick={handleSave} disabled={saving}>
              {saving ? <Ico.Loader2 className="animate-spin" /> : <Ico.Send />}
              <span className={styles.desktopOnly}>{selectedPost ? 'Update' : 'Publish Story'}</span>
            </button>
          </div>
        </header>

        <div className={styles.editorContainer}>
          <div className={styles.editorMainScroll}>
            <main className={styles.editorMain}>
              {error && <div className={styles.errorBanner}><Ico.AlertCircle /> {error}</div>}
              {success && <div className={styles.successBanner}><Ico.CheckCircle /> {success}</div>}
              
              {isPreview ? (
                <article className={`${styles.premiumPreview} premium-article`}>
                  {form.cover_image && <img src={form.cover_image} alt="Cover" width="100%" />}
                  <h1>{form.title}</h1>
                  <p className="lead">{form.excerpt}</p>
                  <div className="content" dangerouslySetInnerHTML={{ __html: form.content }} />
                </article>
              ) : (
                <RichTextEditor
                  value={form.content}
                  onChange={html => setForm(prev => ({ ...prev, content: html }))}
                  placeholder="Tell your story..."
                />
              )}
            </main>
          </div>

          <aside className={styles.editorSidebar}>
            <div className={styles.sidebarSection}>
              <span className={styles.sidebarLabel}>Featured Image</span>
              <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
                {form.cover_image ? (
                  <>
                    <img src={form.cover_image} alt="Preview" className={styles.uploadPreview} />
                    <div className={styles.uploadOverlay}><Ico.Camera /> Update Image</div>
                  </>
                ) : (
                  <div className={styles.uploadPlaceholder}>
                    <div className={styles.uploadIcon}><Ico.Image /></div>
                    <strong>Add Cover Image</strong>
                    <span>Recommended: 1600x900px</span>
                  </div>
                )}
                <input type="file" ref={fileInputRef} hidden onChange={handleImageUpload} accept="image/*" />
              </div>
            </div>

            <div className={styles.sidebarSection}>
              <span className={styles.sidebarLabel}>
                URL Slug 
                <button 
                  className={styles.iconButton} 
                  style={{ width: 24, height: 24, border: 'none' }}
                  onClick={() => setAutoSlug(!autoSlug)}
                  title={autoSlug ? "Disable manual override" : "Enable auto-sync"}
                >
                  {autoSlug ? <Ico.Zap size={12} /> : <Ico.Edit3 size={12} />}
                </button>
              </span>
              <input 
                className={styles.sidebarInput}
                value={form.slug}
                onChange={e => { setForm(prev => ({ ...prev, slug: e.target.value })); setAutoSlug(false); }}
                placeholder="url-friendly-slug"
              />
            </div>

            <div className={styles.sidebarSection}>
              <span className={styles.sidebarLabel}>Excerpt (SEO)</span>
              <textarea 
                className={`${styles.sidebarInput} styles.sidebarTextarea`}
                value={form.excerpt}
                onChange={e => setForm(prev => ({ ...prev, excerpt: e.target.value }))}
                placeholder="A brief summary for search results..."
                rows={4}
              />
            </div>

            <div className={styles.sidebarSection}>
              <span className={styles.sidebarLabel}>Category</span>
              <select
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                className={styles.filterSelect}
              >
                {categoryOptions.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.sidebarSection}>
              <span className={styles.sidebarLabel}>Post Status</span>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                className={styles.filterSelect}
              >
                <option value="draft">Draft - Private</option>
                <option value="published">Published - Live</option>
              </select>
            </div>
          </aside>
        </div>

        {/* Mobile Persistent Bar */}
        <div className={styles.mobilePublishBar}>
           <button className={styles.secondaryButton} style={{ flex: 1 }} onClick={() => setIsPreview(!isPreview)}>
              {isPreview ? 'Editor' : 'Preview'}
            </button>
            <button className={styles.primaryButton} style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
              {saving ? <Ico.Loader2 className="animate-spin" /> : <Ico.Send />}
              {selectedPost ? 'Update' : 'Publish Now'}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInfo}>
          <span className={styles.eyebrow}>Editorial CMS</span>
          <h1 className={styles.title}>Blog Management</h1>
          <p className={styles.subtitle}>Create, manage and optimize your platform's content strategy.</p>
        </div>
        <button className={styles.primaryButton} onClick={handleCreate}>
          <Ico.PenTool size={20} /> Write Article
        </button>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Posts</span>
          <strong className={styles.statValue}>{posts.length}</strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Avg. Read Time</span>
          <strong className={styles.statValue}>{avgReadTime > 0 ? `${avgReadTime} min` : '—'}</strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Live Articles</span>
          <strong className={styles.statValue}>{posts.filter(p => p.status === 'published').length}</strong>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchInputWrapper}>
          <Ico.Search className={styles.searchIcon} size={18} />
          <input 
            className={styles.searchInput}
            placeholder="Search by title or category..."
            value={search}
            onChange={e => { setSearch(e.target.value); fetchPosts(e.target.value, status); }}
          />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); fetchPosts(search, e.target.value); }}
          className={styles.filterSelect}
        >
          {statusOptions.map(s => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {(authLoading || loading) ? (
        <div className="flex justify-center items-center py-20">
          <Ico.Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className={styles.postGrid}>
          {posts.map(post => (
            <div key={post.id} className={styles.postCard}>
              <div className={styles.postImageWrapper}>
                {post.cover_image ? (
                  <img src={post.cover_image} alt={post.title} className={styles.postThumb} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100"><Ico.Image size={40} className="text-gray-300" /></div>
                )}
                <div className={styles.postBadge}>
                  <span className={`${styles.statusBadge} ${styles[`status_${post.status}`]}`}>
                    {post.status}
                  </span>
                </div>
              </div>
              <div className={styles.postContent}>
                <span className={styles.postCategory}>{post.category || 'General'}</span>
                <h3 className={styles.postTitle}>{post.title}</h3>
                <p className={styles.postExcerpt}>{post.excerpt || 'No summary available...'}</p>
                <div className={styles.postMeta}>
                  <Ico.Calendar size={14} />
                  {new Date(post.created_at).toLocaleDateString()}
                  <span className={styles.metaDot}></span>
                  <Ico.Clock size={14} />
                  5 min read
                </div>
              </div>
              <div className={styles.postActions}>
                <button className={styles.iconButton} onClick={() => handleEdit(post)} title="Edit"><Ico.Edit3 size={16} /></button>
                <button className={`${styles.iconButton} ${styles.dangerButton}`} onClick={() => handleDelete(post.id)} title="Delete"><Ico.Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
