const CT_TIMEZONE = 'America/Chicago';

function formatDateTimeCT(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const fmt = new Intl.DateTimeFormat(undefined, {
      timeZone: CT_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${fmt.format(d)} CT`;
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

function isVideo(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('/video/upload/')) return true;
  return u.endsWith('.mp4') || u.endsWith('.mov') || u.endsWith('.webm');
}

function cloudinaryTransform(url, transforms) {
  const u = String(url || '');
  if (!u.includes('res.cloudinary.com') || !u.includes('/upload/')) return u;
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

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function postId(post) {
  const explicit = String(post?.id || '').trim();
  if (explicit) return explicit;
  const basis = [post?.media_url || '', post?.date || '', post?.title || ''].join('|');
  return `p_${fnv1a(basis)}`;
}

function normalizeGallery(post) {
  const g = post?.gallery;
  if (!Array.isArray(g)) return [];
  const out = [];
  for (const item of g) {
    if (!item) continue;
    if (typeof item === 'string') out.push(item);
    else if (typeof item === 'object') {
      if (typeof item.image === 'string') out.push(item.image);
    }
  }
  return out;
}

function getDeviceId() {
  const key = 'rx_device_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const id = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `anon_${Math.random().toString(16).slice(2)}`;
  }
}

const deviceId = getDeviceId();

function getLikeKey(pid) {
  return `rx_like_${pid}`;
}

function isLikedLocal(pid) {
  try {
    return localStorage.getItem(getLikeKey(pid)) === '1';
  } catch {
    return false;
  }
}

function setLikedLocal(pid, liked) {
  try {
    localStorage.setItem(getLikeKey(pid), liked ? '1' : '0');
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

async function fetchLikesState(postIds) {
  if (!postIds.length) return {};
  const url = new URL('/.netlify/functions/likes', window.location.origin);
  url.searchParams.set('ids', postIds.map(encodeURIComponent).join(','));
  url.searchParams.set('deviceId', deviceId);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return {};
    const data = await res.json();
    return data?.items && typeof data.items === 'object' ? data.items : {};
  } catch {
    return {};
  }
}

async function setLike(postIdValue, liked) {
  try {
    const res = await fetch('/.netlify/functions/likes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postId: postIdValue, deviceId, liked }),
    });
    if (!res.ok) throw new Error('Like failed');
    return await res.json();
  } catch {
    return null;
  }
}

function buildMedia(url, { mode }) {
  const u0 = String(url || '');
  const u = cloudinaryTransform(u0, mode === 'modal' ? 'f_auto,q_auto,w_1800' : 'f_auto,q_auto,w_900');
  if (!u) {
    return `<div style="padding: 18px; color: rgba(11,45,77,0.55); font-weight: 900;">Add media in Admin</div>`;
  }

  if (isVideo(u)) {
    if (mode === 'modal') {
      return `<video src="${escapeHtml(u)}" controls playsinline preload="metadata"></video>`;
    }
    return `<video src="${escapeHtml(u)}" muted playsinline loop preload="metadata"></video>`;
  }

  return `<img src="${escapeHtml(u)}" alt="" loading="lazy" />`;
}

function likeButtonHtml(pid, state) {
  const info = state.likes[pid];
  const count = Number(info?.count || 0);
  const liked = Boolean(info?.liked ?? isLikedLocal(pid));
  return `
    <button class="icon-btn counted ${liked ? 'liked' : ''}" type="button" data-like="${escapeHtml(pid)}" aria-label="Heart">
      ${heartSvg()}
      <span class="count" data-like-count="${escapeHtml(pid)}">${escapeHtml(count)}</span>
    </button>
  `;
}

function makeCard(post, state, { large = false } = {}) {
  const pid = postId(post);
  const gallery = normalizeGallery(post);
  const stacked = gallery.length > 0 && !isVideo(post.media_url);
  const desc = String(post.description || '').replace(/\s+/g, ' ').trim();
  const date = formatDateTimeCT(post.date);

  return `
    <article class="post-card" data-open="${escapeHtml(pid)}" aria-label="Open post">
      <div class="post-media ${stacked ? 'stacked' : ''}" style="aspect-ratio:${large ? '16 / 10' : '4 / 5'};">
        ${buildMedia(post.media_url, { mode: 'card' })}
      </div>
      <div class="post-actions">
        ${likeButtonHtml(pid, state)}
        <button class="icon-btn" type="button" data-share="${escapeHtml(pid)}" aria-label="Share">
          ${shareSvg()}
        </button>
      </div>
      <div class="post-body">
        <div class="post-meta">${escapeHtml(date)}</div>
        <div class="post-desc">${escapeHtml(desc).slice(0, 160)}${desc.length > 160 ? '…' : ''}</div>
      </div>
    </article>
  `;
}

function getAllTags(posts) {
  const set = new Set();
  for (const p of posts) {
    const tags = p?.tags;
    if (Array.isArray(tags)) {
      for (const t of tags) {
        const v = String(t || '').trim();
        if (v) set.add(v);
      }
    }
  }
  const preferred = ['Dog', 'Cat'];
  const out = [];
  for (const t of preferred) if (set.has(t)) out.push(t);
  for (const t of Array.from(set).sort()) if (!preferred.includes(t)) out.push(t);
  return out;
}

function renderFilters(state) {
  const el = document.getElementById('tagFilters');
  if (!el) return;

  const tags = getAllTags(state.posts);
  const chips = ['All', ...tags];

  el.innerHTML = chips
    .map((t) => {
      const active = state.filterTag === t;
      return `<a class="filter-chip ${active ? 'active' : ''}" href="#updates" data-filter="${escapeHtml(t)}">${escapeHtml(t)}</a>`;
    })
    .join('');

  el.onclick = (e) => {
    const a = e.target.closest?.('[data-filter]');
    if (!a) return;
    e.preventDefault();
    state.filterTag = a.getAttribute('data-filter') || 'All';
    renderFilters(state);
    renderCarousel(state);
  };
}

function getFilteredPosts(state) {
  if (!state.filterTag || state.filterTag === 'All') return state.posts;
  const wanted = String(state.filterTag);
  return state.posts.filter((p) => Array.isArray(p.tags) && p.tags.map(String).includes(wanted));
}

function renderCarousel(state) {
  const wrap = document.getElementById('postsCarousel');
  if (!wrap) return;

  const posts = getFilteredPosts(state);
  const highlighted = posts.find((p) => p && p.highlighted === true) || posts[0];
  const rest = posts.filter((p) => p !== highlighted).slice(0, 4);

  if (!highlighted) {
    wrap.innerHTML = `<div class="card"><h3>No posts yet</h3><p>Add posts in Admin and they’ll show up here.</p></div>`;
    return;
  }

  wrap.innerHTML = [
    `<div style="grid-column: span 2; min-width: min(720px, 92vw);">${makeCard(highlighted, state, { large: true })}</div>`,
    ...rest.map((p) => makeCard(p, state)),
  ].join('');
}

function updateLikeUI(pid, state) {
  const info = state.likes[pid];
  const count = Number(info?.count || 0);
  const liked = Boolean(info?.liked);

  document.querySelectorAll(`[data-like="${CSS.escape(pid)}"]`).forEach((b) => b.classList.toggle('liked', liked));
  document.querySelectorAll(`[data-like-count="${CSS.escape(pid)}"]`).forEach((c) => (c.textContent = String(count)));

  const modalLike = document.getElementById('modalLike');
  if (modalLike && modalLike.getAttribute('data-like') === pid) {
    modalLike.classList.toggle('liked', liked);
  }
  const modalLikeCount = document.getElementById('modalLikeCount');
  if (modalLikeCount && modalLike && modalLike.getAttribute('data-like') === pid) {
    modalLikeCount.textContent = String(count);
  }
}

function wireInteractions(state) {
  const modal = document.getElementById('postModal');
  const backdrop = document.getElementById('modalBackdrop');
  const mediaEl = document.getElementById('modalMedia');
  const metaEl = document.getElementById('modalMeta');
  const descEl = document.getElementById('modalDesc');
  const likeBtn = document.getElementById('modalLike');
  const shareBtn = document.getElementById('modalShare');
  const closeBtn = document.getElementById('modalClose');
  const navWrap = document.getElementById('modalNav');
  const prevBtn = document.getElementById('modalPrev');
  const nextBtn = document.getElementById('modalNext');

  const modalState = { pid: null, items: [], idx: 0 };

  function setNavVisible(visible) {
    if (!navWrap) return;
    navWrap.style.display = visible ? 'block' : 'none';
    navWrap.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  function renderModalMedia() {
    if (!mediaEl) return;
    const url = modalState.items[modalState.idx] || '';
    mediaEl.innerHTML = buildMedia(url, { mode: 'modal' });
  }

  function setIndex(next) {
    if (modalState.items.length <= 1) return;
    const n = modalState.items.length;
    modalState.idx = (next + n) % n;
    renderModalMedia();
  }

  function close() {
    if (!modal) return;
    modal.classList.remove('open');
    modalState.pid = null;
    modalState.items = [];
    modalState.idx = 0;
    if (mediaEl) mediaEl.innerHTML = '';
    setNavVisible(false);
  }

  function open(pid) {
    const post = state.posts.find((p) => postId(p) === pid);
    if (!post || !modal) return;

    modalState.pid = pid;
    modalState.idx = 0;

    const gallery = normalizeGallery(post);
    const main = String(post.media_url || '');

    if (isVideo(main)) {
      modalState.items = [main];
    } else {
      modalState.items = [main, ...gallery].filter(Boolean);
    }

    renderModalMedia();

    if (metaEl) metaEl.textContent = formatDateTimeCT(post.date);
    if (descEl) descEl.innerHTML = markdownToHtml(post.description);

    if (likeBtn) {
      likeBtn.setAttribute('data-like', pid);
      const liked = Boolean(state.likes[pid]?.liked ?? isLikedLocal(pid));
      likeBtn.classList.toggle('liked', liked);
    }
    const modalLikeCount = document.getElementById('modalLikeCount');
    if (modalLikeCount) {
      modalLikeCount.textContent = String(Number(state.likes[pid]?.count || 0));
    }

    if (shareBtn) shareBtn.setAttribute('data-share', pid);

    setNavVisible(modalState.items.length > 1);
    modal.classList.add('open');
  }

  async function sharePost(pid) {
    const post = state.posts.find((p) => postId(p) === pid);
    const url = new URL(window.location.href);
    url.hash = `post=${encodeURIComponent(pid)}`;

    const title = 'RedXolo Pet Transport';
    const text = String(post?.description || '').replace(/\s+/g, ' ').trim().slice(0, 160);

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
      showToast("Couldn't copy link");
    }
  }

  async function toggleLike(pid) {
    const current = Boolean(state.likes[pid]?.liked ?? isLikedLocal(pid));
    const next = !current;

    const prevCount = Number(state.likes[pid]?.count || 0);
    const optimisticCount = Math.max(0, prevCount + (next ? 1 : -1));
    state.likes[pid] = { count: optimisticCount, liked: next };
    setLikedLocal(pid, next);
    updateLikeUI(pid, state);

    const result = await setLike(pid, next);
    if (!result || typeof result.count !== 'number') return;

    state.likes[pid] = { count: result.count, liked: Boolean(result.liked) };
    setLikedLocal(pid, Boolean(result.liked));
    updateLikeUI(pid, state);
  }

  document.addEventListener('click', (e) => {
    const like = e.target.closest?.('[data-like]');
    if (like) {
      e.preventDefault();
      e.stopPropagation();
      const pid = like.getAttribute('data-like');
      if (pid) toggleLike(pid);
      return;
    }

    const share = e.target.closest?.('[data-share]');
    if (share) {
      e.preventDefault();
      e.stopPropagation();
      const pid = share.getAttribute('data-share');
      if (pid) sharePost(pid);
      return;
    }

    const openBtn = e.target.closest?.('[data-open]');
    if (openBtn) {
      e.preventDefault();
      const pid = openBtn.getAttribute('data-open');
      if (pid) open(pid);
    }
  });

  if (backdrop) backdrop.addEventListener('click', close);
  if (closeBtn) closeBtn.addEventListener('click', close);

  if (prevBtn) prevBtn.addEventListener('click', () => setIndex(modalState.idx - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => setIndex(modalState.idx + 1));

  if (mediaEl) {
    let startX = null;
    mediaEl.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
    });
    mediaEl.addEventListener('pointerup', (e) => {
      if (startX == null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) < 60) return;
      setIndex(modalState.idx + (dx < 0 ? 1 : -1));
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') setIndex(modalState.idx - 1);
    if (e.key === 'ArrowRight') setIndex(modalState.idx + 1);
  });

  try {
    const h = window.location.hash || '';
    const m = h.match(/post=([^&]+)/);
    if (m) open(decodeURIComponent(m[1]));
    window.addEventListener('hashchange', () => {
      const hh = window.location.hash || '';
      const mm = hh.match(/post=([^&]+)/);
      if (mm) open(decodeURIComponent(mm[1]));
    });
  } catch {
    // ignore
  }
}

async function loadPosts() {
  const state = { posts: [], likes: {}, filterTag: 'All' };

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

  state.posts = posts;

  const ids = posts.map(postId);
  for (const pid of ids) {
    state.likes[pid] = { count: 0, liked: isLikedLocal(pid) };
  }

  renderFilters(state);
  renderCarousel(state);
  wireInteractions(state);

  const displayIds = ids.slice(0, 12);
  const items = await fetchLikesState(displayIds);
  for (const pid of displayIds) {
    const it = items?.[pid];
    if (it && typeof it.count === 'number') {
      state.likes[pid] = { count: it.count, liked: Boolean(it.liked) };
      setLikedLocal(pid, Boolean(it.liked));
      updateLikeUI(pid, state);
    }
  }
}

loadPosts();
