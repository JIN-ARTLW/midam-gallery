/* ========== script.js ========== */

/* — DOM 캐시 — */
const GALLERY   = document.getElementById('gallery');
const YEAR_LIST = document.getElementById('year-list');
const SIDEBAR   = document.getElementById('sidebar');
const MENU_BTN  = document.getElementById('menu-btn');
const OVERLAY   = document.getElementById('overlay');
const O_IMG     = document.getElementById('overlay-img');
const O_META    = document.getElementById('overlay-meta');
const CLOSE_BTN = document.getElementById('close-btn');

let META_LIST = [];

/** 1) images/images.json 불러오기 */
async function fetchImageList() {
  const res = await fetch('images/images.json');
  if (!res.ok) {
    console.error('images.json 로드 실패:', res.status);
    return [];
  }
  const files = await res.json(); // ["title_desc_2024-06-10.png", ...]
  return files.map(name => ({ filename: name, src: `images/${name}` }));
}

/** 2) 파일명 → 메타데이터 */
function parseMeta({ filename, src }) {
  const [base] = filename.split(/\.(?=[^.]+$)/);
  const parts  = base.split('_');
  let [title='', desc='', date=''] = parts;
  if (parts.length === 2) [title, date] = parts;
  return {
    title: title.replace(/-/g, ' ').trim() || 'Untitled',
    desc,
    date,
    year: date.slice(0,4),
    filename,
    src
  };
}

/** 3) 카드 생성 */
function createCard(meta) {
  const div = document.createElement('div');
  div.className    = 'card';
  div.dataset.year = meta.year;

  const img = document.createElement('img');
  img.src     = `images/thumbs/${meta.filename}`; // 썸네일 경로
  img.alt     = meta.title;
  img.loading = 'lazy';
  div.appendChild(img);

  div.addEventListener('click', () => openOverlay(meta));
  return div;
}

/** 4) 오버레이 열기/닫기 */
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

/** 5) 갤러리 렌더 + 필터 */
function renderCards(list) {
  GALLERY.innerHTML = '';
  list.forEach(m => GALLERY.appendChild(createCard(m)));
}

/** 6) 연도별 사이드바 빌드 */
function buildYearList(years) {
  YEAR_LIST.innerHTML = '';
  const ul = document.createElement('ul');

  // 전체
  let li = document.createElement('li');
  let a  = document.createElement('a');
  a.href = '#'; a.textContent = '전체';
  a.onclick = e => {
    e.preventDefault();
    renderCards(META_LIST);
    if (window.innerWidth <= 700) SIDEBAR.classList.add('closed');
  };
  li.appendChild(a);
  ul.appendChild(li);

  // 연도별
  years.forEach(y => {
    li = document.createElement('li');
    a  = document.createElement('a');
    a.href = '#'; a.textContent = y;
    a.onclick = e => {
      e.preventDefault();
      renderCards(META_LIST.filter(m => m.year === y));
      if (window.innerWidth <= 700) SIDEBAR.classList.add('closed');
    };
    li.appendChild(a);
    ul.appendChild(li);
  });

  YEAR_LIST.appendChild(ul);
}

/** 햄버거 메뉴 토글 */
MENU_BTN.addEventListener('click', () => {
  SIDEBAR.classList.toggle('closed');
});

/** 7) 초기화 */
(async function init() {
  const files = await fetchImageList();
  META_LIST = files.map(parseMeta)
                   .sort((a,b) => b.date.localeCompare(a.date));

  const years = [...new Set(META_LIST.map(m => m.year))]
                  .filter(Boolean)
                  .sort((a,b) => b - a);

  buildYearList(years);
  renderCards(META_LIST);
})();
