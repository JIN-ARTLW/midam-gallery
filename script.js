/* ========== script.js (JSON 기반 로더 + 커스텀 Lazy-Load) ========== */

/* — DOM 요소 캐시 — */
const GALLERY   = document.getElementById('gallery');
const YEAR_LIST = document.getElementById('year-list');
const OVERLAY   = document.getElementById('overlay');
const O_IMG     = document.getElementById('overlay-img');
const O_META    = document.getElementById('overlay-meta');
const CLOSE_BTN = document.getElementById('close-btn');
const MENU_BTN  = document.getElementById('menu-btn');
const SIDEBAR   = document.getElementById('sidebar');

/* 브라우저 WebP 지원 여부 탐지 (전역 상수) */
const SUPPORTS_WEBP = (() => {
  const c = document.createElement('canvas');
  return !!(c.getContext && c.toDataURL('image/webp').indexOf('data:image/webp') === 0);
})();

let META_LIST = [];

/* 1) images/images.json 을 불러옵니다. */
// webP added
async function fetchImageList() {
  const res = await fetch('images/images.json');
  if (!res.ok) {
    console.error('❌ images.json 로드 실패:', res.status);
    return [];
  }
  const files = await res.json();
  return files.map(name => {
    const base = name.replace(/\.(png|jpe?g)$/i, '');
    return {
      filename: name,
      src:      `images/${name}`,           // 원본 (fallback)
      webp:     `images/webp/${base}.webp`  // WebP (옵션)
    };
  });
}

/* 2) 파일명 → 메타데이터 */
//webp added
function parseMeta({ filename, src, webp }) {
  const [base] = filename.split(/\.(?=[^.]+$)/);
  const parts  = base.split('_');
  let [title='', desc='', date=''] = parts;
  if (parts.length === 2) [title, date] = parts;
  return {
    title: title.replace(/-/g, ' ').trim() || 'Untitled',
    desc,
    date,
    year: date.slice(0,4),
    src,      // 원본
    webp      // WebP
  };
}

/* 3) 카드 생성 (커스텀 Lazy-Load 적용) */
// webp added
function createCard(meta) {
  const div = document.createElement('div');
  div.className    = 'card';
  div.dataset.year = meta.year;

  const img = document.createElement('img');
  /* placeholder */
  img.src         = 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>';
  img.dataset.src = SUPPORTS_WEBP ? meta.webp : meta.src;   // WebP 우선
  img.alt         = meta.title;

  div.appendChild(img);
  div.onclick = () => openOverlay(meta);
  return div;
}


/* — 화면에 보이는 순간 이미지를 로드해 주는 함수 — */
function lazyLoadImages() {
  const imgs = document.querySelectorAll('img[data-src]');

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
    }, { rootMargin: '200px 0px' });

    imgs.forEach(img => io.observe(img));
  } else {
    // 폴백: 스크롤마다 체크
    const onScroll = () => {
      imgs.forEach(img => {
        if (img.dataset.src &&
            img.getBoundingClientRect().top < window.innerHeight + 200) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
      });
      if ([...imgs].every(i => !i.dataset.src)) {
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
  }
}

/* 4) 오버레이 열기/닫기 */
// webp added 
function openOverlay(meta) {
  O_IMG.src = SUPPORTS_WEBP ? meta.webp : meta.src;
  O_META.querySelector('h3').textContent   = meta.title;
  O_META.querySelector('p').textContent    = meta.desc;
  O_META.querySelector('time').textContent = meta.date;
  OVERLAY.classList.remove('hidden');
}


CLOSE_BTN.onclick = () => OVERLAY.classList.add('hidden');
OVERLAY.onclick   = e => { if (e.target === OVERLAY) OVERLAY.classList.add('hidden'); };

/* 5) 카드 렌더링 */
function renderCards(arr) {
  GALLERY.innerHTML = '';
  arr.forEach(m => GALLERY.appendChild(createCard(m)));
  // 렌더 후 lazy-load 관찰 시작
  lazyLoadImages();
}

/* 6) 사이드바(전체/연도) 링크 생성 */
function buildYearList(years) {
  YEAR_LIST.innerHTML = '';
  const ul = document.createElement('ul');

  // 전체 보기
  const liAll = document.createElement('li');
  const aAll  = document.createElement('a');
  aAll.textContent = '전체';
  aAll.href = '#';
  aAll.onclick = e => {
    e.preventDefault();
    renderCards(META_LIST);
    SIDEBAR.classList.remove('open');
  };
  liAll.appendChild(aAll);
  ul.appendChild(liAll);

  // 연도별 보기
  years.forEach(y => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.textContent = y;
    a.href = '#';
    a.onclick = e => {
      e.preventDefault();
      /* 연도별 = 과거→최신 정렬 */
      const list = META_LIST
      .filter(m => m.year === y)
      .slice()                           // 원본 보존
      .sort((a, b) => a.date.localeCompare(b.date));
      renderCards(list);
      SIDEBAR.classList.remove('open');
    };
    li.appendChild(a);
    ul.appendChild(li);
  });

  YEAR_LIST.appendChild(ul);
}

/* 햄버거 메뉴 토글 */
MENU_BTN.onclick = () => SIDEBAR.classList.toggle('open');

/* 7) 초기화 */
(async function init(){
  const items = await fetchImageList();
  META_LIST = items
    .map(parseMeta)
    .sort((a,b) => b.date.localeCompare(a.date));  // 최신→과거

  const years = [...new Set(META_LIST.map(m => m.year).filter(Boolean))]
    .sort((a,b) => b - a);

  buildYearList(years);
  renderCards(META_LIST);
})();
