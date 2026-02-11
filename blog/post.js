function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSlug() {
  const url = new URL(window.location.href);
  return url.searchParams.get('slug') || '';
}

async function loadPost() {
  const slug = getSlug();
  const titleEl = document.getElementById('postTitle');
  const metaEl = document.getElementById('postMeta');
  const bodyEl = document.getElementById('postBody');
  const coverEl = document.getElementById('postCover');

  if (!slug) {
    if (metaEl) metaEl.textContent = 'Missing post slug.';
    if (titleEl) titleEl.textContent = 'Post not found';
    if (bodyEl) bodyEl.innerHTML = '<p>Go back to the blog and pick a post.</p>';
    return;
  }

  let data;
  try {
    const res = await fetch(new URL('content/posts.json', document.baseURI), { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load posts');
    data = await res.json();
  } catch (err) {
    if (metaEl) metaEl.textContent = 'Couldn’t load post.';
    if (titleEl) titleEl.textContent = 'Try again later';
    if (bodyEl) bodyEl.innerHTML = `<p>${escapeHtml(err?.message || 'Unknown error')}</p>`;
    return;
  }

  const posts = Array.isArray(data?.posts) ? data.posts : [];
  const post = posts.find((p) => String(p.slug || '') === String(slug));

  if (!post) {
    if (metaEl) metaEl.textContent = 'Post not found.';
    if (titleEl) titleEl.textContent = 'Post not found';
    if (bodyEl) bodyEl.innerHTML = '<p>Go back to the blog and pick a post.</p>';
    return;
  }

  const title = String(post.title || 'Untitled');
  document.title = `${title} • RedXolo`;

  if (titleEl) titleEl.textContent = title;
  if (metaEl) metaEl.textContent = formatDate(post.date);

  if (coverEl) {
    coverEl.innerHTML = post.cover
      ? `<img class="post-cover" src="${escapeHtml(post.cover)}" alt="" loading="lazy" style="margin-top: 12px;" />`
      : '';
  }

  const markdown = String(post.body || '');
  const html = (window.marked ? window.marked.parse(markdown) : `<pre>${escapeHtml(markdown)}</pre>`);
  if (bodyEl) bodyEl.innerHTML = html;
}

loadPost();
