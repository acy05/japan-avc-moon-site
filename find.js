import {categories,products,coverage} from './catalog.js';import {mountShell,initCompare,esc} from './catalog-common.js';import {createFinderGuide} from './finder-guide.js';
mountShell('find');initCompare();document.querySelector('#categories').innerHTML=categories.map(c=>`<a class="category-card" href="search.html?category=${c.id}"><img src="${c.image}" alt="${esc(c.name)}" width="250" height="150" loading="lazy"><small>${c.english}</small><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p><p>${products.filter(p=>p.categoryId===c.id).length.toLocaleString()}品番 <span aria-hidden="true"></span></p></a>`).join('');document.querySelector('#catalog-count').textContent=`${coverage.products.toLocaleString()}品番を収録`;
createFinderGuide();
const mode=new URLSearchParams(location.search).get('mode');if(mode==='compare')location.replace('compare.html');else if(mode==='condition')location.replace('search.html');else if(mode==='number'){document.querySelector('#keyword').placeholder='品番の全部または一部を入力';document.querySelector('#keyword').focus();}

const routeSets={
 purpose:{title:'使われる環境から、つながりへ。',description:'まずは環境を整理し、必要な機能と仕様から候補を探します。',phrase:'どんな環境で、使いますか。',heading:'使用環境から、選定を始める。',cards:[
 ['01 / WATER & DUST','水や粉塵に触れる。','接続部の保護と取付条件を整理。必要なIP等級は各品番で確認します。',[['防水シリーズを見る','search.html?feature=防水'],['技術資料で確認','index.html#technology']]],
 ['02 / TEMPERATURE','温度の変化が大きい。','使用温度と材質の条件から、耐熱シリーズの仕様を確認します。',[['耐熱シリーズを見る','search.html?feature=耐熱'],['材質から選ぶ','search.html#filter-options']]],
 ['03 / EQUIPMENT','配線を保護したい。','設備内の配線経路と、ケーブルの保護・固定方法を考えます。',[['チューブ＆グランド','search.html?category=tube'],['電線径・ねじを指定','search.html#filter-options']]]]},
 question:{title:'接続と保護の課題から、考える。',description:'気になっている課題を、製品の構造や機能へつなぎます。',phrase:'困っていることから、一緒に。',heading:'解決したい課題から、探す。',cards:[
 ['01 / ELECTRICAL NOISE','電磁ノイズが気になる。','シールドケーブルの接続を検討。EMC対応シリーズから候補を探します。',[['EMCシリーズを見る','search.html?feature=EMC'],['技術・評価を確認','index.html#technology']]],
 ['02 / MULTIPLE CABLES','複数の電線をまとめたい。','電線の本数と外径を整理して、多芯型の構造と仕様を確認します。',[['多芯型を見る','search.html?feature=多芯'],['条件を指定する','search.html#filter-options']]],
 ['03 / CONNECTION','取付条件に合うか知りたい。','接続ねじ、電線の仕上外径、材質。分かっている寸法から絞り込みます。',[['接続条件を指定','search.html#filter-options'],['選定を相談する','https://www.ip68.jp/contacts/index.html']]]]}
};
if(routeSets[mode]){
 const entry=routeSets[mode];
 document.querySelector('.catalog-hero h1').textContent=entry.title;
 document.querySelector('.catalog-hero>div>p:last-child').textContent=entry.description;
 document.querySelector('#finder-guide-phrase').textContent=entry.phrase;
 document.querySelector('#routes h2').textContent=entry.heading;
 document.querySelector('.route-grid').innerHTML=entry.cards.map(([label,title,copy,links])=>`<article class="route-card"><small>${esc(label)}</small><h3>${esc(title)}</h3><p>${esc(copy)}</p>${links.map(([text,url])=>`<a href="${url}" ${url.startsWith('https:')?'target="_blank" rel="noopener"':''}>${esc(text)} ${url.startsWith('https:')?'':''}</a>`).join('')}</article>`).join('');

}

const switcher=document.createElement('nav');switcher.className='finder-mode-tabs';switcher.setAttribute('aria-label','探し方');
switcher.innerHTML=`<a href="find.html#routes" ${!routeSets[mode]?'aria-current="page"':''}>接続条件</a><a href="find.html?mode=purpose#routes" ${mode==='purpose'?'aria-current="page"':''}>使用環境</a><a href="find.html?mode=question#routes" ${mode==='question'?'aria-current="page"':''}>困りごと</a>`;
document.querySelector('#routes').prepend(switcher);

// Keep deep links aligned after category cards and images have settled.
function focusFinderEntry(){
 const target=location.hash==='#categories-section'?document.querySelector('#categories-section'):location.hash==='#routes'?document.querySelector('#routes'):null;
 if(!target)return;
 const heading=target.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'auto'});
}
window.addEventListener('hashchange',focusFinderEntry);
if(document.readyState==='complete')requestAnimationFrame(focusFinderEntry);
else window.addEventListener('load',()=>requestAnimationFrame(focusFinderEntry),{once:true});
