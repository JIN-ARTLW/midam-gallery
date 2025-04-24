/* ========== script.js ========== */

/* — 0) DOM 캐시 — */
const GALLERY   = document.getElementById('gallery');
const YEAR_LIST = document.getElementById('year-list');
const OVERLAY   = document.getElementById('overlay');
const O_IMG     = document.getElementById('overlay-img');
const O_META    = document.getElementById('overlay-meta');
const CLOSE_BTN = document.getElementById('close-btn');
const MENU_BTN  = document.getElementById('menu-btn');
const SIDEBAR   = document.getElementById('sidebar');

let META_LIST = [];

/** 1) images.json 불러오기 */
async function fetchImageList() {
  const res = await fetch('images/images.json');
  if (!res.ok) return [];
  return (await res.json()).map(name => ({
    filename: name,
    src:      `images/${name}`
  }));
}

/** 2) 메타 파싱 */
function parseMeta({ filename, src }) {
  const [base] = filename.split(/\.(?=[^.]+$)/);
  const parts  = base.split('_');
  let [title='', desc='', date=''] = parts;
  if (parts.length===2) [title, date] = parts;
  return {
    title: title.replace(/-/g,' ').trim() || 'Untitled',
    desc,
    date,
    year: date.slice(0,4),
    filename,
    src
  };
}

/** 3) 카드 마크업 생성 */
function createCard(meta) {
  const div = document.createElement('div');
  div.className    = 'card';
  div.dataset.year = meta.year;

  const img = document.createElement('img');
  img.src     = `images/thumbs/${meta.filename}`;
  img.alt     = meta.title;
  img.loading = 'lazy';
  div.appendChild(img);

  div.addEventListener('click', () => openOverlay(meta));
  return div;
}

/** 4) 오버레이 열기 */
function openOverlay(meta) {
  O_IMG.src = meta.src;
  O_META.querySelector('h3').textContent   = meta.title;
  O_META.querySelector('p').textContent    = meta.desc;
  O_META.querySelector('time').textContent = meta.date;
  OVERLAY.classList.remove('hidden');
}
CLOSE_BTN.addEventListener('click', () => OVERLAY.classList.add('hidden'));
OVERLAY.addEventListener('click', e => {
  if (e.target === OVERLAY) OVERLAY.classList.add('hidden');
});

// 5) 갤러리 렌더 + Masonry 초기화
function renderCards(arr) {
  GALLERY.innerHTML = '';
  arr.forEach(m => GALLERY.appendChild(createCard(m)));

  // ★ 이미지가 모두 로드된 뒤에 Masonry 실행 ★
  imagesLoaded(GALLERY, function() {
    new Masonry(GALLERY, {
      itemSelector: '.card',
      columnWidth:  600,
      gutter:       16,
      fitWidth:     false
    });
  });
}

/** 6) 사이드바 연도별 필터링 */
function buildYearList(years) {
  YEAR_LIST.innerHTML = '';
  const ul = document.createElement('ul');

  // 전체
  const liAll = document.createElement('li');
  const aAll  = document.createElement('a');
  aAll.href = '#'; aAll.textContent = '전체';
  aAll.addEventListener('click', e => {
    e.preventDefault();
    renderCards(META_LIST);
    SIDEBAR.classList.remove('open');
  });
  liAll.appendChild(aAll);
  ul.appendChild(liAll);

  // 연도별
  years.forEach(y => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href = '#'; a.textContent = y;
    a.addEventListener('click', e => {
      e.preventDefault();
      renderCards(META_LIST.filter(m=>m.year===y));
      SIDEBAR.classList.remove('open');
    });
    li.appendChild(a);
    ul.appendChild(li);
  });

  YEAR_LIST.appendChild(ul);
}

/** 햄버거 메뉴 토글 */
MENU_BTN.addEventListener('click', () => SIDEBAR.classList.toggle('open'));

/** 7) 초기화 */
(async function init(){
  const items = await fetchImageList();
  META_LIST = items
    .map(parseMeta)
    .sort((a,b) => b.date.localeCompare(a.date));

  const years = [...new Set(META_LIST.map(m=>m.year))].filter(Boolean).sort((a,b)=>b-a);
  buildYearList(years);
  renderCards(META_LIST);
})();
