import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
  import { join } from 'node:path';

  const ROOT = new URL('..', import.meta.url).pathname;
  const POSTS_DIR = join(ROOT, 'content', 'posts');
  const OUT_FILE = join(ROOT, 'content', 'posts.json');

  function toIsoString(v) {
    const s = String(v || '').trim();
    if (!s) return '';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString();
  }

  function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    return tags
      .map((t) => String(t || '').trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  function normalizeGallery(gallery) {
    if (!Array.isArray(gallery)) return [];
    return gallery
      .map((u) => String(u || '').trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  function ensureId(post) {
    const v = String(post.id || '').trim();
    if (v) return v;
    const basis = [post.date || '', post.title || '', post.media_url || ''].join('|');
    return `p_${Buffer.from(basis).toString('base64url').slice(0, 16)}`;
  }

  async function main() {
    await mkdir(POSTS_DIR, { recursive: true });
    const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith('.json'));

    const posts = [];
    for (const f of files) {
      const raw = await readFile(join(POSTS_DIR, f), 'utf8');
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        continue;
      }

      const post = {
        id: ensureId(data),
        title: String(data.title || '').trim(),
        date: toIsoString(data.date) || new Date().toISOString(),
        highlighted: Boolean(data.highlighted),
        tags: normalizeTags(data.tags),
        media_url: String(data.media_url || '').trim(),
        gallery: normalizeGallery(data.gallery),
        description: String(data.description || ''),
      };

      if (!post.media_url) continue;
      posts.push(post);
    }

    posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const highlightedIdx = posts.findIndex((p) => p.highlighted);
    if (highlightedIdx != -1) {
      posts.forEach((p, i) => {
        if (i !== highlightedIdx) p.highlighted = false;
      });
    }

    await writeFile(OUT_FILE, JSON.stringify({ posts }, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${posts.length} posts to content/posts.json`);
  }

  await main();
