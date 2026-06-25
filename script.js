/* ========== script.js (JSON 로더 + 필터 + 오버레이 내비게이션) ========== */

/* — DOM 캐시 — */
const GALLERY    = document.getElementById('gallery');
const YEAR_LIST  = document.getElementById('year-list');
const GENRE_LIST = document.getElementById('genre-list');
const SEARCH     = document.getElementById('search-input');
const EMPTY_MSG  = document.getElementById('empty-msg');
const OVERLAY    = document.getElementById('overlay');
const O_IMG      = document.getElementById('overlay-img');
const O_META     = document.getElementById('overlay-meta');
const CLOSE_BTN  = document.getElementById('close-btn');
const PREV_BTN   = document.getElementById('prev-btn');
const NEXT_BTN   = document.getElementById('next-btn');
const MENU_BTN   = document.getElementById('menu-btn');
const SIDEBAR    = document.getElementById('sidebar');

/* 브라우저 WebP 지원 여부 */
const SUPPORTS_WEBP = (() => {
  const c = document.createElement('canvas');
  return !!(c.getContext && c.toDataURL('image/webp').indexOf('data:image/webp') === 0);
})();

/* 같은 의미의 장르 표기를 하나로 통일 */
const GENRE_ALIAS = { '수채화': '수채', '전시 작품': '전시작품' };
const normGenre = g => GENRE_ALIAS[g] || g;

let META_LIST = [];                       // 전체 (최신→과거)
let CURRENT   = [];                        // 현재 화면에 렌더된 목록 (오버레이 내비용)
let OVERLAY_I = -1;                        // 오버레이에서 보고 있는 인덱스

/* 필터 상태 */
const filter = { year: 'all', genre: 'all', query: '' };

/* 1) 이미지 목록 로드 (캐시 무력화 — 새 작품/분류 변경이 바로 반영되도록) */
async function fetchImageList() {
  const res = await fetch(`images/images.json?v=${Date.now()}`, { cache: 'no-cache' });
  if (!res.ok) {
    console.error('❌ images.json 로드 실패:', res.status);
    return [];
  }
  const files = await res.json();
  return files.map(name => {
    const base = name.replace(/\.(png|jpe?g)$/i, '');
    return {
      filename: name,
      src:  `images/${name}`,
      webp: `images/webp/${base}.webp`
    };
  });
}

/* 2) 파일명 → 메타데이터 (제목_장르_날짜) */
function parseMeta({ filename, src, webp }) {
  /* macOS 파일명은 NFD(분해형)일 수 있어 NFC로 통일 */
  const [base] = filename.normalize('NFC').split(/\.(?=[^.]+$)/);
  const parts  = base.split('_');
  let [title = '', genre = '', date = ''] = parts;
  if (parts.length === 2) [title, date] = parts;
  return {
    title: title.replace(/-/g, ' ').trim() || 'Untitled',
    genre: normGenre(genre.trim()),
    date,
    year: date.slice(0, 4),
    src,
    webp,
    thumb: SUPPORTS_WEBP ? webp : src
  };
}

/* 3) 카드 생성 (Lazy-Load) */
function makePlaceholder(w = 3, h = 4) {
  return `data:image/svg+xml;charset=utf-8,` +
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'/>`;
}

function createCard(meta, index) {
  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.year = meta.year;

  const img = document.createElement('img');
  img.alt = meta.title;
  img.decoding = 'async';
  img.onerror = function () {
    if (this.src !== meta.src) this.src = meta.src;   // WebP 실패 시 원본
  };
  /* 상단(첫 화면) 카드는 즉시 로드, 나머지는 lazy */
  if (index < 8) {
    img.src = meta.thumb;
  } else {
    img.src = makePlaceholder(3, 4);
    img.dataset.src = meta.thumb;
    img.loading = 'lazy';
  }

  div.appendChild(img);
  div.tabIndex = 0;
  div.setAttribute('role', 'button');
  div.setAttribute('aria-label', `${meta.title} 확대 보기`);
  div.onclick = () => openOverlay(index);
  div.onkeydown = e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openOverlay(index); }
  };
  return div;
}

/* — 화면에 들어오는 순간 로드 — */
function lazyLoadImages() {
  const imgs = GALLERY.querySelectorAll('img[data-src]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          obs.unobserve(img);
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    imgs.forEach(img => io.observe(img));
  } else {
    imgs.forEach(img => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
  }
}

/* 4) 오버레이 */
function showOverlay(i) {
  const meta = CURRENT[i];
  if (!meta) return;
  OVERLAY_I = i;
  O_IMG.src = meta.thumb;
  O_IMG.alt = meta.title;
  O_IMG.onerror = function () { if (this.src !== meta.src) this.src = meta.src; };
  O_META.querySelector('h3').textContent   = meta.title;
  O_META.querySelector('p').textContent    = meta.genre;
  O_META.querySelector('time').textContent = meta.date;
  PREV_BTN.style.visibility = i > 0 ? 'visible' : 'hidden';
  NEXT_BTN.style.visibility = i < CURRENT.length - 1 ? 'visible' : 'hidden';
}

function openOverlay(i) {
  showOverlay(i);
  OVERLAY.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  CLOSE_BTN.focus();
}
function closeOverlay() {
  OVERLAY.classList.add('hidden');
  document.body.style.overflow = '';
  OVERLAY_I = -1;
}
function step(delta) {
  const next = OVERLAY_I + delta;
  if (next >= 0 && next < CURRENT.length) showOverlay(next);
}

CLOSE_BTN.onclick = closeOverlay;
PREV_BTN.onclick  = e => { e.stopPropagation(); step(-1); };
NEXT_BTN.onclick  = e => { e.stopPropagation(); step(1); };
OVERLAY.onclick   = e => { if (e.target === OVERLAY) closeOverlay(); };

document.addEventListener('keydown', e => {
  if (OVERLAY.classList.contains('hidden')) return;
  if (e.key === 'Escape')     closeOverlay();
  else if (e.key === 'ArrowLeft')  step(-1);
  else if (e.key === 'ArrowRight') step(1);
});

/* 5) 렌더링 */
function renderCards(arr) {
  CURRENT = arr;
  GALLERY.innerHTML = '';
  arr.forEach((m, i) => GALLERY.appendChild(createCard(m, i)));
  EMPTY_MSG.classList.toggle('hidden', arr.length > 0);
  lazyLoadImages();
}

/* 6) 필터 적용 */
function applyFilters() {
  const q = filter.query.normalize('NFC').trim().toLowerCase();
  let list = META_LIST.filter(m =>
    (filter.year  === 'all' || m.year  === filter.year) &&
    (filter.genre === 'all' || m.genre === filter.genre) &&
    (!q || m.title.toLowerCase().includes(q))
  );
  /* 연도를 고르면 과거→최신, 그 외엔 최신→과거 */
  if (filter.year !== 'all') {
    list = list.slice().sort((a, b) => a.date.localeCompare(b.date));
  }
  renderCards(list);
  syncActiveLinks();
}

function syncActiveLinks() {
  YEAR_LIST.querySelectorAll('a').forEach(a =>
    a.classList.toggle('active', a.dataset.year === filter.year));
  GENRE_LIST.querySelectorAll('a').forEach(a =>
    a.classList.toggle('active', a.dataset.genre === filter.genre));
}

/* 7) 사이드바 빌드 */
function buildYearList(years) {
  YEAR_LIST.innerHTML = '';
  const ul = document.createElement('ul');
  const mk = (label, year) => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.textContent = label;
    a.href = '#';
    a.dataset.year = year;
    a.onclick = e => {
      e.preventDefault();
      filter.year = year;
      applyFilters();
      SIDEBAR.classList.remove('open');
    };
    li.appendChild(a);
    ul.appendChild(li);
  };
  mk('전체', 'all');
  years.forEach(y => mk(y, y));
  YEAR_LIST.appendChild(ul);
}

function buildGenreList(genres) {
  GENRE_LIST.innerHTML = '';
  const ul = document.createElement('ul');
  const mk = (label, genre) => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.textContent = label;
    a.href = '#';
    a.dataset.genre = genre;
    a.onclick = e => {
      e.preventDefault();
      filter.genre = genre;
      applyFilters();
      SIDEBAR.classList.remove('open');
    };
    li.appendChild(a);
    ul.appendChild(li);
  };
  mk('모든 장르', 'all');
  genres.forEach(g => mk(g, g));
  GENRE_LIST.appendChild(ul);
}

/* 검색 (디바운스) */
let searchTimer;
SEARCH.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    filter.query = SEARCH.value;
    applyFilters();
  }, 150);
});

/* 햄버거 토글 */
MENU_BTN.onclick = () => {
  const open = SIDEBAR.classList.toggle('open');
  MENU_BTN.setAttribute('aria-expanded', String(open));
};

/* 8) 초기화 */
(async function init() {
  const items = await fetchImageList();
  META_LIST = items
    .map(parseMeta)
    .sort((a, b) => b.date.localeCompare(a.date));   // 최신→과거

  const years = [...new Set(META_LIST.map(m => m.year).filter(Boolean))]
    .sort((a, b) => b - a);

  /* 장르: 작품 수 많은 순 */
  const counts = {};
  META_LIST.forEach(m => { if (m.genre) counts[m.genre] = (counts[m.genre] || 0) + 1; });
  const genres = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  buildYearList(years);
  buildGenreList(genres);
  applyFilters();
})();
