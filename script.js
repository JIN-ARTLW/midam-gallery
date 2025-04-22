/* ========== script.js (디버깅용) ========== */

/* DOM 요소 캐시 */
const GALLERY   = document.getElementById('gallery');
const YEAR_LIST = document.getElementById('year-list');
const OVERLAY   = document.getElementById('overlay');
const O_IMG     = document.getElementById('overlay-img');
const O_META    = document.getElementById('overlay-meta');
const CLOSE_BTN = document.getElementById('close-btn');
const MENU_BTN  = document.getElementById('menu-btn');
const SIDEBAR   = document.getElementById('sidebar');

let META_LIST = [];

/**
 * 1) images/images.json 을 불러와 파일 목록을 가져옵니다.
 *    실패 시 상태 코드와 에러를 콘솔에 출력합니다.
 */
async function fetchImageList() {
  console.log('▶️ fetchImageList: 시작');
  let files = [];
  try {
    const res = await fetch('images/images.json');
    console.log('fetch images.json status:', res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    files = await res.json();
    console.log('parsed JSON:', files);
  } catch (err) {
    console.error('❌ fetchImageList 에러:', err);
    return [];
  }
  return files.map(name => ({ filename: name, src: 'images/' + name }));
}

/**
 * 2) 파일명 → 메타데이터
 */
function parseMeta({ filename, src }) {
  const [base] = filename.split(/\.(?=[^.]+$)/);
  const parts  = base.split('_');
  let [title = '', desc = '', date = ''] = parts;
  if (parts.length === 2) [title, date] = parts;
  return {
    title: title.replace(/-/g,' ').trim() || 'Untitled',
    desc,
    date,
    year: date.slice(0,4),
    src
  };
}

/**
 * 3) 카드 생성
 */
function createCard(meta) {
  const div = document.createElement('div');
  div.className    = 'card';
  div.dataset.year = meta.year;
  const img = document.createElement('img');
  img.src = meta.src;
  img.alt = meta.title;
  div.appendChild(img);
  div.onclick = () => openOverlay(meta);
  return div;
}

/**
 * 4) 오버레이
 */
function openOverlay(meta) {
  O_IMG.src = meta.src;
  O_META.querySelector('h3').textContent   = meta.title;
  O_META.querySelector('p').textContent    = meta.desc;
  O_META.querySelector('time').textContent = meta.date;
  OVERLAY.classList.remove('hidden');
}
CLOSE_BTN.onclick = () => OVERLAY.classList.add('hidden');
OVERLAY.onclick   = e => { if (e.target === OVERLAY) OVERLAY.classList.add('hidden'); };

/**
 * 5) 렌더
 */
function renderCards(arr) {
  console.log('▶️ renderCards: count=', arr.length);
  GALLERY.innerHTML = '';
  arr.forEach(m => GALLERY.appendChild(createCard(m)));
}

/**
 * 6) 사이드바 링크
 */
function buildYearList(years) {
  console.log('▶️ buildYearList:', years);
  YEAR_LIST.innerHTML = '';
  const ul = document.createElement('ul');

  // 전체
  const liAll = document.createElement('li');
  const aAll  = document.createElement('a');
  aAll.textContent = '전체'; aAll.href = '#';
  aAll.onclick = e => {
    e.preventDefault();
    renderCards(META_LIST);
    SIDEBAR.classList.remove('open');
  };
  liAll.appendChild(aAll);
  ul.appendChild(liAll);

  // 연도별
  years.forEach(y => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.textContent = y; a.href = '#';
    a.onclick = e => {
      e.preventDefault();
      renderCards(META_LIST.filter(m=>m.year === y));
      SIDEBAR.classList.remove('open');
    };
    li.appendChild(a);
    ul.appendChild(li);
  });

  YEAR_LIST.appendChild(ul);
}

/* 햄버거 토글 */
MENU_BTN.onclick = () => SIDEBAR.classList.toggle('open');

/**
 * 7) 초기화
 */
(async function init(){
  console.log('▶️ init 시작');
  const items = await fetchImageList();
  META_LIST = items
    .map(parseMeta)
    .sort((a,b)=>b.date.localeCompare(a.date));
  console.log('▶️ META_LIST:', META_LIST);

  const years = [...new Set(META_LIST.map(m=>m.year).filter(Boolean))].sort((a,b)=>b-a);
  buildYearList(years);
  renderCards(META_LIST);
})();
