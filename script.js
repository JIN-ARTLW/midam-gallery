/* ========== script.js (롤백 버전) ========== */

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

/* 1) 폴더 리스팅 (images/) */
async function fetchImageList() {
  const res  = await fetch(IMAGE_DIR);
  const html = await res.text();
  const reg  = /href="([^"?]*\.(?:jpg|jpeg|png))"/gi;
  return [...html.matchAll(reg)].map(m=>m[1]);
}

/* 2) 파일명 → 메타 */
function parseMeta(file) {
  const decoded = decodeURIComponent(file);
  const [name]  = decoded.split(/\.(?=[^.]+$)/);
  const dateReg = /(\d{4})-(\d{2})-(\d{2})$/;
  const m = name.match(dateReg);

  let title = name, desc = '', date = '', year = '', epoch = 0;
  if (m) {
    const [_,y,mo,d] = m;
    date = `${y}-${mo}-${d}`;
    year = y;
    epoch = new Date(+y, +mo-1, +d).getTime();
    title = name.slice(0, name.length - m[0].length - 1);
  }
  return {
    title: title.replace(/[_-]+/g,' ').trim() || 'Untitled',
    desc: '',
    date,
    year,
    epoch,
    src: IMAGE_DIR + file
  };
}

/* 3) 카드 생성 */
function createCard(m) {
  const d = document.createElement('div');
  d.className    = 'card';
  d.dataset.year = m.year;
  const img = document.createElement('img');
  img.src = m.src;
  img.alt = m.title;
  d.appendChild(img);
  d.onclick = ()=>openOverlay(m);
  return d;
}

/* 4) 오버레이 */
function openOverlay(m) {
  O_IMG.src = m.src;
  O_META.querySelector('h3').textContent   = m.title;
  O_META.querySelector('p').textContent    = m.desc;
  O_META.querySelector('time').textContent = m.date;
  OVERLAY.classList.remove('hidden');
}
CLOSE_BTN.onclick = ()=>OVERLAY.classList.add('hidden');
OVERLAY.onclick   = e=>{ if (e.target===OVERLAY) OVERLAY.classList.add('hidden'); };

/* 5) 렌더 */
function renderCards(list) {
  GALLERY.innerHTML = '';
  list.forEach(m=>GALLERY.appendChild(createCard(m)));
}

/* 6) 연도 사이드바 */
function buildYearList(years) {
  YEAR_LIST.innerHTML = '';
  const ul = document.createElement('ul');

  // 전체
  let li = document.createElement('li');
  let a  = document.createElement('a');
  a.textContent = '전체'; a.href = '#';
  a.onclick = e=>{ e.preventDefault(); renderCards(META_LIST); SIDEBAR.classList.remove('open'); };
  li.appendChild(a); ul.appendChild(li);

  years.forEach(y=>{
    li = document.createElement('li');
    a  = document.createElement('a');
    a.textContent = y; a.href = '#';
    a.onclick = e=>{ e.preventDefault(); renderCards(META_LIST.filter(m=>m.year===y)); SIDEBAR.classList.remove('open'); };
    li.appendChild(a); ul.appendChild(li);
  });

  YEAR_LIST.appendChild(ul);
}

/* 햄버거 토글 */
MENU_BTN.onclick = ()=>SIDEBAR.classList.toggle('open');

/* init */
(async function init(){
  const files = await fetchImageList();
  META_LIST = files.map(parseMeta)
                   .sort((a,b)=>b.epoch - a.epoch);

  const years = [...new Set(META_LIST.map(m=>m.year).filter(Boolean))]
                   .sort((a,b)=>b-a);
  buildYearList(years);
  renderCards(META_LIST);
})();
