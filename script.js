/* ========== script.js (정렬 롤백 버전) ========== */
const IMAGE_DIR = 'images/';

/* DOM */
const GALLERY   = document.getElementById('gallery');
const YEAR_LIST = document.getElementById('year-list');
const OVERLAY   = document.getElementById('overlay');
const O_IMG     = document.getElementById('overlay-img');
const O_META    = document.getElementById('overlay-meta');
const CLOSE_BTN = document.getElementById('close-btn');
const MENU_BTN  = document.getElementById('menu-btn');
const SIDEBAR   = document.getElementById('sidebar');

let META_LIST = [];

/* 파일 목록 */
async function fetchImageList(){
  const res  = await fetch(IMAGE_DIR);
  const html = await res.text();
  const reg  = /href="([^"?]*\.(?:jpg|jpeg|png))"/gi;
  return [...html.matchAll(reg)].map(m=>m[1]);
}

/* 파일명 파싱 */
function parseMeta(file){
  const decoded = decodeURIComponent(file);
  const [name]  = decoded.split(/\.(?=[^.]+$)/);
  const dateReg = /(\d{4})-(\d{2})-(\d{2})$/;
  const m = name.match(dateReg);

  let epoch=-Infinity, date='', year='';
  if(m){ 
    const [_, y, mo, d] = m; 
    date  = `${y}-${mo}-${d}`; 
    year  = y; 
    epoch = new Date(+y, +mo-1, +d).getTime(); 
  }

  const prefix = m 
    ? name.slice(0, -m[0].length).replace(/[_-]+$/, '') 
    : name;
  const [t='', dsc=''] = prefix.split('_');
  const title = t.replace(/-/g,' ').trim() || 'Untitled';
  const desc  = dsc.replace(/-/g,' ').trim();

  return { title, desc, date, year, epoch, src: IMAGE_DIR + file };
}

/* 카드 */
function createCard(m){
  const d = document.createElement('div');
  d.className    = 'card';
  d.dataset.year = m.year;

  const img = document.createElement('img');
  img.src = m.src;
  img.alt = m.title;
  d.appendChild(img);
  d.onclick = () => openOverlay(m);

  return d;
}

/* 렌더 */
function renderCards(list){
  GALLERY.innerHTML = '';
  list.forEach(m => GALLERY.appendChild(createCard(m)));
}

/* 사이드바 */
function buildYearList(years){
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

/* 오버레이 */
function openOverlay(m){
  O_IMG.src = m.src;
  O_META.children[0].textContent = m.title;
  O_META.children[1].textContent = m.desc;
  O_META.children[2].textContent = m.date;
  OVERLAY.classList.remove('hidden');
}

CLOSE_BTN.onclick = () => OVERLAY.classList.add('hidden');
OVERLAY.onclick   = e => {
  if (e.target === OVERLAY) OVERLAY.classList.add('hidden');
};

/* 햄버거 메뉴 토글 */
MENU_BTN.onclick = () => SIDEBAR.classList.toggle('open');

/* 초기화 */
(async function init(){
  const files = await fetchImageList();
  META_LIST = files
    .map(parseMeta)
    .sort((a, b) => b.epoch - a.epoch);  // 최신→과거

  const years = [...new Set(
    META_LIST.filter(m => m.year).map(m => m.year)
  )].sort((a, b) => b - a);

  buildYearList(years);
  renderCards(META_LIST);
})();
