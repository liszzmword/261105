const { randomUUID } = require('node:crypto');
const config = require('../supabase-config.js');

const headers = token => ({
  apikey: config.anonKey,
  authorization: `Bearer ${token}`
});

async function supabaseRequest(path, token, options = {}) {
  return fetch(`${config.url}${path}`, {
    ...options,
    headers: { ...headers(token), ...options.headers }
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: '이미지 생성 설정이 아직 완료되지 않았어요.' });

  const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) return res.status(401).json({ error: '로그인 후 이용해 주세요.' });
  const theme = typeof req.body?.theme === 'string' ? req.body.theme.trim() : '';
  if (theme.length < 3 || theme.length > 120) return res.status(400).json({ error: '이미지 설명을 3~120자로 입력해 주세요.' });

  try {
    const auth = await supabaseRequest('/auth/v1/user', token);
    if (!auth.ok) return res.status(401).json({ error: '로그인이 만료됐어요. 다시 로그인해 주세요.' });
    const user = await auth.json();
    if (!/^[0-9a-f-]{36}$/i.test(user.id || '')) return res.status(401).json({ error: '계정을 확인할 수 없어요.' });

    const claim = await supabaseRequest('/rest/v1/rpc/claim_avatar_generation', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    if (!claim.ok) return res.status(503).json({ error: '프로필 이미지 설정을 확인해 주세요. schema.sql을 다시 실행해야 할 수 있어요.' });
    if (await claim.json() !== true) return res.status(429).json({ error: '이미지는 24시간마다 최대 3개까지 만들 수 있어요.' });

    const generated = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-image-2',
        prompt: `Create a polished, friendly, square profile avatar for a Tetris game. Subject: ${theme}. Center the subject with generous margins for a circular crop. Use a clean modern illustration style, vivid colors, soft lighting, and a simple background. No text, no logos, no letters, no watermark.`,
        size: '1024x1024',
        quality: 'low',
        output_format: 'webp',
        output_compression: 75,
        n: 1
      })
    });
    if (!generated.ok) {
      const failure = await generated.json().catch(() => ({}));
      console.error('OpenAI image generation failed:', generated.status, failure.error?.code || failure.error?.type || 'unknown');
      return res.status(502).json({ error: '이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.' });
    }
    const result = await generated.json();
    const base64 = result.data?.[0]?.b64_json;
    if (!base64) return res.status(502).json({ error: '생성된 이미지가 비어 있어요.' });
    const image = Buffer.from(base64, 'base64');
    if (image.length > 5 * 1024 * 1024 || image.length < 100 || image.toString('hex', 0, 4) !== '52494646' || image.toString('ascii', 8, 12) !== 'WEBP') {
      return res.status(502).json({ error: '이미지 형식을 확인하지 못했어요.' });
    }

    const path = `${user.id}/${randomUUID()}.webp`;
    const upload = await supabaseRequest(`/storage/v1/object/avatars/${path}`, token, {
      method: 'POST', headers: { 'Content-Type': 'image/webp' }, body: image
    });
    if (!upload.ok) return res.status(502).json({ error: '이미지 저장에 실패했어요. Storage 설정을 확인해 주세요.' });

    const oldProfile = await supabaseRequest(`/rest/v1/profiles?id=eq.${user.id}&select=avatar_path`, token);
    const oldPath = oldProfile.ok ? (await oldProfile.json())[0]?.avatar_path : null;
    const save = await supabaseRequest(`/rest/v1/profiles?id=eq.${user.id}`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ avatar_path: path })
    });
    const saved = save.ok ? await save.json() : [];
    if (!saved.length) {
      await supabaseRequest(`/storage/v1/object/avatars/${path}`, token, { method: 'DELETE' });
      return res.status(502).json({ error: '프로필 저장에 실패했어요. schema.sql을 다시 실행해 주세요.' });
    }
    if (oldPath && oldPath !== path && oldPath.startsWith(`${user.id}/`)) {
      await supabaseRequest(`/storage/v1/object/avatars/${oldPath}`, token, { method: 'DELETE' }).catch(() => {});
    }
    return res.status(200).json({ avatarPath: path });
  } catch (error) {
    console.error('Avatar generation failed:', error);
    return res.status(500).json({ error: '이미지를 만들지 못했어요. 잠시 후 다시 시도해 주세요.' });
  }
};
