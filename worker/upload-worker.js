/* ============================================================
 *  미담 갤러리 업로드 Worker (Cloudflare Workers)
 *
 *  업로드 폼(upload.html)에서 보낸 그림을 GitHub 저장소의
 *  images/ 폴더에 커밋합니다. 커밋되면 기존 GitHub Actions가
 *  자동으로 WebP 썸네일과 images.json 매니페스트를 만들어
 *  갤러리에 반영합니다.
 *
 *  필요한 Secret (wrangler secret put 또는 대시보드에서 설정):
 *    GITHUB_TOKEN     : 저장소 contents 읽기/쓰기 권한 PAT
 *    UPLOAD_PASSWORD  : 업로드하는 분에게 알려줄 비밀번호
 *
 *  필요한 Var (wrangler.toml):
 *    REPO             : "JIN-ARTLW/midam-gallery"
 *    BRANCH           : "main"
 *    ALLOW_ORIGIN     : "https://jin-artlw.github.io"
 * ============================================================ */

const MAX_BYTES = 20 * 1024 * 1024;        // 20MB 제한
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST')
      return json({ error: 'POST만 허용됩니다' }, 405, cors);

    let form;
    try {
      form = await request.formData();
    } catch {
      return json({ error: '폼 데이터를 읽을 수 없습니다' }, 400, cors);
    }

    const password = form.get('password');
    if (password !== env.UPLOAD_PASSWORD)
      return json({ error: '비밀번호가 맞지 않습니다' }, 401, cors);

    const repo   = env.REPO;
    const branch = env.BRANCH || 'main';
    const ghHeaders = {
      'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'midam-upload-worker',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const contentUrl = p =>
      `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(p).replace(/%2F/g, '/')}`;

    const action = (form.get('action') || 'upload').toString();

    /* ───── 삭제 ───── */
    if (action === 'delete') {
      const filename = (form.get('filename') || '').toString();
      if (!filename || filename.includes('/') || filename.includes('..'))
        return json({ error: '잘못된 파일명입니다' }, 400, cors);

      const base = filename.replace(/\.[^.]+$/, '');
      const targets = [`images/${filename}`, `images/webp/${base}.webp`];
      const deleted = [];

      for (const path of targets) {
        const url = contentUrl(path);
        const head = await fetch(`${url}?ref=${branch}`, { headers: ghHeaders });
        if (!head.ok) continue;                       // 없으면(webp 미생성 등) 건너뜀
        const sha = (await head.json()).sha;
        const del = await fetch(url, {
          method: 'DELETE',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `chore(images): delete ${filename} via manage page`,
            sha, branch,
          }),
        });
        if (del.ok) deleted.push(path);
        else if (path === targets[0]) {
          const detail = await del.text();
          return json({ error: `삭제 실패 (${del.status})`, detail }, 502, cors);
        }
      }
      if (!deleted.length)
        return json({ error: '해당 파일을 찾지 못했습니다' }, 404, cors);
      return json({ ok: true, deleted }, 200, cors);
    }

    /* ───── 업로드 ───── */
    const file  = form.get('image');
    const title = (form.get('title')  || '').toString().trim();
    const genre = (form.get('genre')  || '').toString().trim();
    const date  = (form.get('date')   || '').toString().trim();

    if (!file || typeof file === 'string')
      return json({ error: '이미지가 없습니다' }, 400, cors);
    if (file.size > MAX_BYTES)
      return json({ error: '파일이 너무 큽니다 (최대 20MB)' }, 400, cors);

    const ext = EXT[file.type];
    if (!ext)
      return json({ error: '지원하지 않는 형식입니다 (jpg/png/webp만)' }, 400, cors);

    if (!title || !date)
      return json({ error: '제목과 날짜가 필요합니다' }, 400, cors);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return json({ error: '날짜 형식이 올바르지 않습니다' }, 400, cors);

    /* 파일명: 제목_장르_날짜.확장자  (제목/장르의 _ 는 - 로 치환) */
    const safe = s => s.replace(/[_/\\]/g, '-').replace(/\s+/g, ' ').trim();
    const filename = `${safe(title)}_${safe(genre) || '기타'}_${date}.${ext}`;
    const apiUrl = contentUrl(`images/${filename}`);

    /* 이미지 → base64 */
    const buf = await file.arrayBuffer();
    const content = base64(new Uint8Array(buf));

    /* 같은 이름이 이미 있으면 sha 가져와 덮어쓰기 */
    let sha;
    const head = await fetch(`${apiUrl}?ref=${branch}`, { headers: ghHeaders });
    if (head.ok) sha = (await head.json()).sha;

    const put = await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `feat(images): add ${filename} via upload form`,
        content,
        branch,
        ...(sha ? { sha } : {}),
      }),
    });

    if (!put.ok) {
      const detail = await put.text();
      return json({ error: `GitHub 업로드 실패 (${put.status})`, detail }, 502, cors);
    }

    return json({ ok: true, filename }, 200, cors);
  },
};

/* ── 유틸 ── */
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function base64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
