/* ========== script.js (썸네일 뷰 + JSON 기반 로더) ========== */

/* — DOM 요소 — */
const GALLERY   = document.getElementById('gallery');
const YEAR_LIST = document.getElementById('year-list');
const OVERLAY   = document.getElementById('overlay');
const O_IMG     = document.getElementById('overlay-img');
const O_META    = document.getElementById('overlay-meta');
const CLOSE_BTN = document.getElementById('close-btn');
const MENU_BTN  = document.getElementById('menu-btn');
const SIDEBAR   = document.getElementById('sidebar');

let META_LIST = [];

/** 1) images/images.json → [{filename, src}] */
async function fetchImageList() {
  const res = await fetch('images/images.json');
  if (!res.ok) return [];
  const files = await res.json();
  return files.map(name => ({
    filename: name,
    src:      `images/${name}`      // 원본 오버레이용
  }));
}

/** 2) 메타 파싱 → {title, desc, date, year, filename, src} */
function parseMeta({ filename, src }) {
  const [base] = filename.split(/\.(?=[^.]+$)/);
  const parts  = base.split('_');
  let [title='', desc='', date=''] = parts;
  if (parts.length === 2) [title, date] = parts;
  return {
    title: title.replace(/-/g,' ').trim() || 'Untitled',
    desc,
    date,
    year: date.slice(0,4),
    filename,
    src
  };
}

/** 3) 카드 뷰: thumbs 폴더의 썸네일만 로드 */
function createCard(meta) {
  const div = document.createElement('div');
  div.className    = 'card';
  div.dataset.year = meta.year;

  const img = document.createElement('img');
  img.src     = `images/thumbs/${meta.filename}`; // ★ 썸네일 경로
  img.alt     = meta.title;
  img.loading = 'lazy';                          // ★ 네이티브 Lazy-load

  div.appendChild(img);
  div.onclick = () => openOverlay(meta);
  return div;
}

/** 4) 오버레이: 클릭 시 원본 이미지를 로드 */
function openOverlay(meta) {
  O_IMG.src = meta.src;  // 원본
  O_META.querySelector('h3').textContent   = meta.title;
  O_META.querySelector('p').textContent    = meta.desc;
  O_META.querySelector('time').textContent = meta.date;
  OVERLAY.classList.remove('hidden');
}
CLOSE_BTN.onclick = () => OVERLAY.classList.add('hidden');
OVERLAY.onclick   = e => { if (e.target===OVERLAY) OVERLAY.classList.add('hidden'); };


// 5) 갤러리 렌더링
function renderCards(arr) {
  GALLERY.innerHTML = '';
  arr.forEach(m => GALLERY.appendChild(createCard(m)));

  // ★ Masonry 초기화 / 재배치 ★
  // images/thumbs 폴더에서 600px짜리 썸네일을 불러오도록 width:600으로 설정했다면,
  // columnWidth: 600, gutter:16 정도가 무난합니다.
  new Masonry(GALLERY, {
    itemSelector: '.card',
    columnWidth: 600,
    gutter: 16,
    fitWidth: false      // 컨테이너 폭에 맞춰 자동으로 칸수를 늘립니다
  });
}

/** 6) 사이드바 빌드 */
function buildYearList(years) {
  YEAR_LIST.innerHTML = '';
  const ul = document.createElement('ul');

  // 전체
  const liAll = document.createElement('li');
  const aAll  = document.createElement('a');
  aAll.textContent = '전체'; aAll.href = '#';
  aAll.onclick = e => { e.preventDefault(); renderCards(META_LIST); SIDEBAR.classList.remove('open'); };
  liAll.appendChild(aAll);
  ul.appendChild(liAll);

  // 년도별
  years.forEach(y => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.textContent = y; a.href = '#';
    a.onclick = e => { e.preventDefault(); renderCards(META_LIST.filter(m=>m.year===y)); SIDEBAR.classList.remove('open'); };
    li.appendChild(a);
    ul.appendChild(li);
  });

  YEAR_LIST.appendChild(ul);
}

/** 햄버거 */
MENU_BTN.onclick = () => SIDEBAR.classList.toggle('open');

/** 7) 초기화 */
;(async function init(){
  const items = await fetchImageList();
  META_LIST = items.map(parseMeta)
                   .sort((a,b)=>b.date.localeCompare(a.date));   // 최신→과거

  const years = [...new Set(META_LIST.map(m=>m.year))].filter(Boolean)
                   .sort((a,b)=>b-a);

  buildYearList(years);
  renderCards(META_LIST);
})();
