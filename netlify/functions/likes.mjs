import { getStore } from '@netlify/blobs';

const json = (status, data) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

export default async function handler(request) {
  const url = new URL(request.url);

  const counts = getStore('rx_likes_counts');
  const devices = getStore('rx_likes_devices');

  if (request.method === 'GET') {
    const idsRaw = url.searchParams.get('ids') || '';
    const deviceId = url.searchParams.get('deviceId') || '';
    const ids = idsRaw
      .split(',')
      .map((s) => decodeURIComponent(s))
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);

    const items = {};

    await Promise.all(
      ids.map(async (id) => {
        const countVal = await counts.get(id, { type: 'json' });
        const count = typeof countVal === 'number' ? countVal : Number(countVal?.count || 0);

        let liked = false;
        if (deviceId) {
          const existing = await devices.get(`${id}:${deviceId}`);
          liked = existing != null;
        }

        items[id] = { count: Number.isFinite(count) ? count : 0, liked };
      }),
    );

    return json(200, { items });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: 'Invalid JSON' });
    }

    const postId = String(body?.postId || '').trim();
    const deviceId = String(body?.deviceId || '').trim();
    const desired = Boolean(body?.liked);

    if (!postId || !deviceId) {
      return json(400, { error: 'Missing postId or deviceId' });
    }

    const key = `${postId}:${deviceId}`;
    const existing = await devices.get(key);
    const alreadyLiked = existing != null;

    const countVal = await counts.get(postId, { type: 'json' });
    let count = typeof countVal === 'number' ? countVal : Number(countVal?.count || 0);
    if (!Number.isFinite(count)) count = 0;

    let liked = alreadyLiked;

    if (desired && !alreadyLiked) {
      await devices.set(key, '1');
      count += 1;
      liked = true;
    }

    if (!desired && alreadyLiked) {
      await devices.delete(key);
      count = Math.max(0, count - 1);
      liked = false;
    }

    await counts.set(postId, count);

    return json(200, { postId, count, liked });
  }

  return json(405, { error: 'Method not allowed' });
}
