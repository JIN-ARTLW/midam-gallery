/* ========== script.js ========== */

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
 */
async function fetchImageList() {
  const res = await fetch('images/images.json');
  if (!res.ok) {
    console.error('images.json not found:', res.status);
    return [];
  }
  const files = await res.json();  // ["file1.png","file2.jpg", ...]

  return files.map(name => ({
    filename: name,
    src:      'images/' + name
  }));
}

/**
 * 2) 파일명 → 메타데이터 객체
 */
function parseMeta({ filename, src }) {
  // 확장자 제거
  const [base] = filename.split(/\.(?=[^.]+$)/);
  // 제목_설명_YYYY-MM-DD or 제목_YYYY-MM-DD
  const parts = base.split('_');
  let [title = '', desc = '', date = ''] = parts;
  if (parts.length === 2) [title, date] = parts;

  return {
    title: title.replace(/-/g, ' ').trim() || 'Untitled',
    desc,
    date,
    year: date.slice(0, 4),
    src
  };
}

/**
 * 3) 카드 DOM 생성
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
 * 4) 오버레이 열기/닫기
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
 * 5) 카드 렌더링
 */
function renderCards(arr) {
  GALLERY.innerHTML = '';
  arr.forEach(m => GALLERY.appendChild(createCard(m)));
}

/**
 * 6) 사이드바(전체/연도별) 링크 생성
 */
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
      renderCards(META_LIST.filter(m => m.year === y));
      SIDEBAR.classList.remove('open');
    };
    li.appendChild(a);
    ul.appendChild(li);
  });

  YEAR_LIST.appendChild(ul);
}

/* 햄버거 메뉴 토글 */
MENU_BTN.onclick = () => SIDEBAR.classList.toggle('open');

/**
 * 7) 초기화
 */
(async function init(){
  try {
    const items = await fetchImageList();
    META_LIST = items
      .map(parseMeta)
      .sort((a, b) => b.date.localeCompare(a.date)); // 최신→과거

    const years = [...new Set(META_LIST.map(m => m.year).filter(Boolean))]
      .sort((a, b) => b - a);

    buildYearList(years);
    renderCards(META_LIST);
  } catch(err) {
    console.error(err);
    GALLERY.innerHTML = '<p>이미지 로딩 중 오류가 발생했습니다.</p>';
  }
})();
