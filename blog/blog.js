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

async function loadPosts() {
  const listEl = document.getElementById('blogList');
  if (!listEl) return;

  let data;
  try {
    const res = await fetch(new URL('content/posts.json', document.baseURI), { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load posts');
    data = await res.json();
  } catch (err) {
    listEl.innerHTML = `
      <div class="card post-card">
        <div class="meta">Couldn’t load posts</div>
        <div class="title">Try again later</div>
        <div class="summary">${escapeHtml(err?.message || 'Unknown error')}</div>
      </div>
    `;
    return;
  }

  const posts = Array.isArray(data?.posts) ? data.posts : [];
  posts.sort((a, b) => (String(b.date || '')).localeCompare(String(a.date || '')));

  if (posts.length === 0) {
    listEl.innerHTML = `
      <div class="card post-card">
        <div class="meta">No posts yet</div>
        <div class="title">Coming soon</div>
        <div class="summary">Check back for updates.</div>
      </div>
    `;
    return;
  }

  listEl.innerHTML = posts.map((p) => {
    const title = escapeHtml(p.title || 'Untitled');
    const summary = escapeHtml(p.summary || '');
    const slug = encodeURIComponent(p.slug || '');
    const date = formatDate(p.date);
    const cover = p.cover ? `<img class="post-cover" src="${escapeHtml(p.cover)}" alt="" loading="lazy" />` : '';

    return `
      <a class="card post-card" href="blog/post.html?slug=${slug}">
        ${cover}
        <div class="meta">${escapeHtml(date)}</div>
        <div class="title">${title}</div>
        <div class="summary">${summary}</div>
      </a>
    `;
  }).join('');
}

loadPosts();
