// Slap-Comp Studio · render endpoint (Netlify Function)
// Keeps the fal.ai key on the server. The page never sees it.
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   FAL_KEY    required  your fal.ai API key
//   DEMO_CODE  optional  if set, visitors must enter this code to render
//                        (put it on your resume / in applications)

const MODELS = {
  'nano-banana-2': {
    id: 'fal-ai/nano-banana-2/edit',
    input: (image, prompt) => ({ prompt, image_urls: [image], num_images: 1, output_format: 'png', resolution: '1K' })
  },
  'nano-banana-pro': {
    id: 'fal-ai/nano-banana-pro/edit',
    input: (image, prompt) => ({ prompt, image_urls: [image], num_images: 1, output_format: 'png' })
  },
  'flux-kontext': {
    id: 'fal-ai/flux-pro/kontext',
    input: (image, prompt) => ({ prompt, image_url: image, num_images: 1, output_format: 'png' })
  }
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const isQueueUrl = u => typeof u === 'string' && u.startsWith('https://queue.fal.run/');

export default async (req) => {
  const key = process.env.FAL_KEY;
  if (!key) return json({ error: 'not_configured', message: 'The render server has no FAL_KEY set.' }, 500);
  const auth = { Authorization: 'Key ' + key };

  // Start a render
  if (req.method === 'POST') {
    let b;
    try { b = await req.json(); } catch { return json({ error: 'bad_request' }, 400); }

    const code = process.env.DEMO_CODE;
    if (code && (b.code || '').trim() !== code) return json({ error: 'code', message: 'Enter the demo code.' }, 401);

    const m = MODELS[b.model] || MODELS['nano-banana-2'];
    if (typeof b.image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(b.image) || b.image.length > 4_500_000)
      return json({ error: 'bad_image', message: 'The comp image was missing or too large.' }, 400);
    const prompt = String(b.prompt || '').slice(0, 1500) || 'Refine this composite into a photorealistic product photograph. Keep every product exactly as shown.';

    const r = await fetch('https://queue.fal.run/' + m.id, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify(m.input(b.image, prompt))
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !isQueueUrl(d.status_url)) return json({ error: 'model_error', message: d.detail?.[0]?.msg || d.detail || 'The model service refused the request.' }, 502);
    return json({ status_url: d.status_url, response_url: d.response_url });
  }

  // Check on a render
  if (req.method === 'GET') {
    const u = new URL(req.url);
    const s = u.searchParams.get('s'), rs = u.searchParams.get('r');
    if (!isQueueUrl(s) || !isQueueUrl(rs)) return json({ error: 'bad_request' }, 400);
    const st = await fetch(s, { headers: auth });
    const sd = await st.json().catch(() => ({}));
    if (sd.status !== 'COMPLETED') return json({ status: sd.status || 'IN_QUEUE', queue_position: sd.queue_position });
    const out = await fetch(rs, { headers: auth });
    const od = await out.json().catch(() => ({}));
    if (!out.ok) return json({ error: 'model_error', message: od.detail?.[0]?.msg || 'The model returned an error.' }, 502);
    return json({ status: 'COMPLETED', image: od.images?.[0]?.url || null, description: od.description || '' });
  }

  return json({ error: 'method_not_allowed' }, 405);
};

export const config = { path: '/api/refine' };
