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

function isVideo(url, explicitType) {
  if (explicitType) return String(explicitType).toLowerCase() === 'video';
  const u = String(url || '').toLowerCase();
  if (u.includes('/video/upload/')) return true;
  return u.endsWith('.mp4') || u.endsWith('.mov') || u.endsWith('.webm') || u.includes('resource_type=video');
}

function cloudinaryTransform(url, transforms) {
  const u = String(url || '');
  if (!u.includes('res.cloudinary.com') || !u.includes('/upload/')) return u;
  // Avoid double-inserting if a transformation already exists right after /upload/
  // (e.g. /upload/f_auto,q_auto,w_800/...)
  const parts = u.split('/upload/');
  if (parts.length < 2) return u;
  const after = parts[1];
  const firstSegment = after.split('/')[0] || '';
  const alreadyHasTransform = /(^|,)(f_|q_|w_|h_|c_|g_|ar_|dpr_)/.test(firstSegment);
  if (alreadyHasTransform) return u;
  return parts[0] + '/upload/' + transforms + '/' + after;
}

function heartSvg() {
  return `
    <svg class="icon heart" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s-7.1-4.4-9.4-8.7C.7 8.9 2.2 5.8 5.4 4.9c1.9-.6 4 .1 5.3 1.6 1.3-1.5 3.4-2.2 5.3-1.6 3.2.9 4.7 4 2.8 7.4C19.1 16.6 12 21 12 21z"/>
    </svg>
  `;
}

function shareSvg() {
  return `
    <svg class="icon share" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 16.1c-.8 0-1.6.3-2.2.8L8.9 13c.1-.3.1-.6.1-1s0-.7-.1-1l6.8-3.9c.6.6 1.4.9 2.3.9 1.9 0 3.5-1.6 3.5-3.5S19.9 1 18 1s-3.5 1.6-3.5 3.5c0 .3 0 .7.1 1L7.8 9.4C7.2 8.9 6.4 8.6 5.6 8.6c-1.9 0-3.5 1.6-3.5 3.5s1.6 3.5 3.5 3.5c.8 0 1.6-.3 2.2-.8l6.9 3.9c-.1.3-.1.6-.1.9 0 1.9 1.6 3.5 3.5 3.5s3.5-1.6 3.5-3.5-1.6-3.5-3.5-3.5z"/>
    </svg>
  `;
}

function xSvg() {
  return `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" style="fill: rgba(255,255,255,0.95); width: 18px; height: 18px;">
      <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"/>
    </svg>
  `;
}

function slugFromPost(p) {
  return String(p.slug || p.id || p.title || '').trim() || String(p.date || '').slice(0, 10);
}

function getLikeKey(slug) {
  return `rx_like_${slug}`;
}

function isLiked(slug) {
  try {
    return localStorage.getItem(getLikeKey(slug)) === '1';
  } catch {
    return false;
  }
}

function setLiked(slug, liked) {
  try {
    localStorage.setItem(getLikeKey(slug), liked ? '1' : '0');
  } catch {
    // ignore
  }
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => el.classList.remove('show'), 1600);
}

function markdownToHtml(md) {
  const s = String(md || '');
  if (window.marked && typeof window.marked.parse === 'function') {
    return window.marked.parse(s);
  }
  return `<p>${escapeHtml(s)}</p>`;
}

function buildMedia(url, type, { mode }) {
  const u0 = String(url || '');
  const u = cloudinaryTransform(u0, mode === 'modal' ? 'f_auto,q_auto,w_1600' : 'f_auto,q_auto,w_900');
  if (!u) {
    return `<div style="padding: 18px; color: rgba(11,45,77,0.55); font-weight: 800;">No media yet</div>`;
  }

  if (isVideo(u, type)) {
    if (mode === 'modal') {
      return `<video src="${escapeHtml(u)}" controls playsinline preload="metadata"></video>`;
    }
    return `<video src="${escapeHtml(u)}" muted playsinline loop preload="metadata"></video>`;
  }

  return `<img src="${escapeHtml(u)}" alt="" loading="lazy" />`;
}

function makeCard(post, { large = false } = {}) {
  const slug = slugFromPost(post);
  const liked = isLiked(slug);
  const date = formatDate(post.date);
  const desc = String(post.description || post.body || post.summary || '');

  return `
    <article class="post-card" data-open="${escapeHtml(slug)}" aria-label="Open post">
      <div class="post-media" style="aspect-ratio:${large ? '16 / 10' : '4 / 5'};">
        ${buildMedia(post.media_url || post.media || post.cover, post.media_type, { mode: 'card' })}
      </div>
      <div class="post-actions">
        <button class="icon-btn ${liked ? 'liked' : ''}" type="button" data-like="${escapeHtml(slug)}" aria-label="Heart">
          ${heartSvg()}
        </button>
        <button class="icon-btn" type="button" data-share="${escapeHtml(slug)}" aria-label="Share">
          ${shareSvg()}
        </button>
      </div>
      <div class="post-body">
        <div class="post-meta">${escapeHtml(date)}</div>
        <div class="post-desc">${escapeHtml(desc.replace(/\s+/g, ' ').trim()).slice(0, 140)}${desc.length > 140 ? '…' : ''}</div>
      </div>
    </article>
  `;
}

async function loadPosts() {
  const wrap = document.getElementById('postsCarousel');
  if (!wrap) return;

  let data;
  try {
    const res = await fetch('/content/posts.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load posts');
    data = await res.json();
  } catch (err) {
    wrap.innerHTML = `<div class="card"><h3>Couldn’t load posts</h3><p>${escapeHtml(err?.message || 'Unknown error')}</p></div>`;
    return;
  }

  const posts = Array.isArray(data?.posts) ? data.posts : [];
  posts.sort((a, b) => (String(b.date || '')).localeCompare(String(a.date || '')));

  const highlighted = posts.find((p) => p && p.highlighted === true) || posts[0];
  const rest = posts.filter((p) => p !== highlighted).slice(0, 4);

  if (!highlighted) {
    wrap.innerHTML = `<div class="card"><h3>No posts yet</h3><p>Once you add posts in the admin, they’ll show up here.</p></div>`;
    return;
  }

  wrap.innerHTML = [
    `<div style="grid-column: span 2; min-width: min(720px, 92vw);">${makeCard(highlighted, { large: true })}</div>`,
    ...rest.map((p) => makeCard(p)),
  ].join('');

  wireInteractions(posts);
}

function wireInteractions(posts) {
  const modal = document.getElementById('postModal');
  const backdrop = document.getElementById('modalBackdrop');
  const mediaEl = document.getElementById('modalMedia');
  const metaEl = document.getElementById('modalMeta');
  const descEl = document.getElementById('modalDesc');
  const likeBtn = document.getElementById('modalLike');
  const shareBtn = document.getElementById('modalShare');
  const closeBtn = document.getElementById('modalClose');

  function close() {
    if (!modal) return;
    modal.classList.remove('open');
    if (mediaEl) mediaEl.innerHTML = '';
  }

  function open(slug) {
    const post = posts.find((p) => slugFromPost(p) === slug);
    if (!post || !modal) return;

    const date = formatDate(post.date);
    const desc = String(post.description || post.body || post.summary || '');
    const url = post.media_url || post.media || post.cover || '';

    if (mediaEl) mediaEl.innerHTML = buildMedia(url, post.media_type, { mode: 'modal' });
    if (metaEl) metaEl.textContent = date;
    if (descEl) descEl.innerHTML = markdownToHtml(desc);

    const liked = isLiked(slug);
    if (likeBtn) likeBtn.classList.toggle('liked', liked);

    if (likeBtn) {
      likeBtn.onclick = () => {
        const now = !isLiked(slug);
        setLiked(slug, now);
        likeBtn.classList.toggle('liked', now);
        // sync any matching card button
        document.querySelectorAll(`[data-like="${CSS.escape(slug)}"]`).forEach((b) => b.classList.toggle('liked', now));
      };
    }

    if (shareBtn) {
      shareBtn.onclick = () => sharePost(post);
    }

    modal.classList.add('open');
  }

  async function sharePost(post) {
    const slug = slugFromPost(post);
    const url = new URL(window.location.href);
    url.hash = `post=${encodeURIComponent(slug)}`;

    const title = 'RedXolo Pet Transport';
    const text = String(post.description || post.summary || '').slice(0, 140);

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: url.toString() });
        return;
      } catch {
        // ignore
      }
    }

    try {
      await navigator.clipboard.writeText(url.toString());
      showToast('Link copied');
    } catch {
      showToast('Couldn't copy link');
    }
  }

  document.addEventListener('click', (e) => {
    const like = e.target.closest?.('[data-like]');
    if (like) {
      e.preventDefault();
      const slug = like.getAttribute('data-like');
      const now = !isLiked(slug);
      setLiked(slug, now);
      like.classList.toggle('liked', now);
      return;
    }

    const share = e.target.closest?.('[data-share]');
    if (share) {
      e.preventDefault();
      const slug = share.getAttribute('data-share');
      const post = posts.find((p) => slugFromPost(p) === slug);
      if (post) sharePost(post);
      return;
    }

    const openBtn = e.target.closest?.('[data-open]');
    if (openBtn) {
      e.preventDefault();
      open(openBtn.getAttribute('data-open'));
    }
  });

  if (backdrop) backdrop.addEventListener('click', close);
  if (closeBtn) closeBtn.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // Open from URL hash (share links)
  try {
    const h = window.location.hash || '';
    const m = h.match(/post=([^&]+)/);
    if (m) {
      const slug = decodeURIComponent(m[1]);
      open(slug);
    }

    window.addEventListener('hashchange', () => {
      const hh = window.location.hash || '';
      const mm = hh.match(/post=([^&]+)/);
      if (mm) open(decodeURIComponent(mm[1]));
    });
  } catch {
    // ignore
  }
}

loadPosts();
