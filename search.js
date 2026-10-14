import {categories,filterProducts,coverage,verifiedAt} from './catalog.js';
import {mountShell,initCompare,productCard,refreshCompare,esc,rememberSearch} from './catalog-common.js';
mountShell('search');initCompare();
const form=document.querySelector('#filters'),grid=document.querySelector('#products');
const disclosure=document.querySelector('#filter-options'),count=document.querySelector('#result-count');
const mobile=matchMedia('(max-width: 700px)'),pageSize=12;
const fields=['q','category','material','thread','diameter','feature'];
const names={q:'キーワード',category:'カテゴリ',material:'材質',thread:'接続ねじ',diameter:'電線外径',feature:'特徴'};
let page=1,applied={};
for(const c of categories)form.elements.category.add(new Option(c.name,c.id));
function writeForm(){for(const k of fields)form.elements[k].value=applied[k]||'';}
function readUrl(){
 const params=new URLSearchParams(location.search);
 applied=Object.fromEntries(fields.map(k=>[k,params.get(k)||'']));writeForm();
 applied=Object.fromEntries(fields.map(k=>[k,form.elements[k].value]));
 if(applied.diameter&&Number(applied.diameter)<=0)applied.diameter='';writeForm();
 const requested=Number(params.get('page'));page=Number.isFinite(requested)?Math.max(1,Math.floor(requested)):1;
 document.querySelector('#sort').value=params.get('sort')==='diameter'?'diameter':'part';
}
function filterLabel(k,v){if(k==='diameter')return `${v} mm`;if(form.elements[k].tagName==='SELECT')return [...form.elements[k].options].find(o=>o.value===v)?.text||v;return v;}
function render(update=true){
 const results=filterProducts(applied),order=document.querySelector('#sort').value;
 results.sort(order==='diameter'?(a,b)=>(a.cableRange?.[0]??Infinity)-(b.cableRange?.[0]??Infinity)||a.partNumber.localeCompare(b.partNumber):(a,b)=>a.partNumber.localeCompare(b.partNumber,'en',{numeric:true}));
 const pages=Math.max(1,Math.ceil(results.length/pageSize));page=Math.min(page,pages);
 if(update){const params=new URLSearchParams();for(const [k,v] of Object.entries(applied))if(v)params.set(k,v);if(page>1)params.set('page',page);if(order!=='part')params.set('sort',order);history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));}
 rememberSearch();grid.innerHTML=results.slice((page-1)*pageSize,page*pageSize).map(productCard).join('');
 count.innerHTML=`<span class="result-total">${results.length.toLocaleString()}</span> 製品${results.length?` <small>${(page-1)*pageSize+1}–${Math.min(page*pageSize,results.length)}件を表示</small>`:''}`;
 const filters=Object.entries(applied).filter(([,v])=>v);
 document.querySelector('#active-filters').innerHTML=filters.length?filters.map(([k,v])=>`<button type="button" class="filter-chip" data-clear-filter="${k}" aria-label="${esc(names[k]+'：'+filterLabel(k,v))} の条件を外す">${esc(filterLabel(k,v))}<span aria-hidden="true">×</span></button>`).join(''):'<span class="all-products">すべての製品</span>';
 const facets=filters.filter(([k])=>k!=='q').length;document.querySelector('#filter-count').textContent=facets?`${facets}条件`:'';
 document.querySelector('#empty').hidden=!!results.length;document.querySelector('.pagination').hidden=pages<=1;
 document.querySelector('#page-count').textContent=`${page} / ${pages}`;document.querySelector('#prev').disabled=page<=1;document.querySelector('#next').disabled=page>=pages;refreshCompare();
}
function revealResults(){if(mobile.matches)disclosure.open=false;count.focus({preventScroll:true});count.scrollIntoView({block:'start',behavior:'auto'});}
form.addEventListener('submit',e=>{e.preventDefault();applied=Object.fromEntries(fields.map(k=>[k,form.elements[k].value.trim()]));page=1;render();if(mobile.matches)revealResults();});
function reset(){applied={};writeForm();page=1;render();revealResults();}
document.querySelector('#reset-filters').onclick=reset;document.querySelector('#empty-reset').onclick=reset;
document.querySelector('#active-filters').addEventListener('click',e=>{const b=e.target.closest('[data-clear-filter]');if(!b)return;applied[b.dataset.clearFilter]='';writeForm();page=1;render();count.focus({preventScroll:true});});
document.querySelector('#sort').onchange=()=>{page=1;render();};
for(const [id,step] of [['prev',-1],['next',1]])document.querySelector('#'+id).onclick=()=>{page+=step;render();revealResults();};
window.addEventListener('popstate',()=>{readUrl();render(false);});mobile.addEventListener('change',()=>{disclosure.open=!mobile.matches;});disclosure.open=!mobile.matches;
document.querySelector('#coverage-note').textContent=`公式公開仕様表 ${coverage.pages}ページ・${coverage.products.toLocaleString()}品番を収録（確認日：${verifiedAt}）。${coverage.note}`;readUrl();render(false);

// TOP's distinct entries open the actual control requested by the visitor.
function focusEntry(){
 if(location.hash==='#filter-options'){
  disclosure.open=true;form.elements.category.focus({preventScroll:true});disclosure.scrollIntoView({block:'start',behavior:'auto'});
 }else if(location.hash==='#q'){
  form.elements.q.focus({preventScroll:true});form.elements.q.scrollIntoView({block:'center',behavior:'auto'});
 }
}
window.addEventListener('hashchange',focusEntry);
if(document.readyState==='complete')requestAnimationFrame(focusEntry);
else window.addEventListener('load',()=>requestAnimationFrame(focusEntry),{once:true});
