import {productMap} from './catalog.js';
import {mountShell,initCompare,selected,setSelected,esc,detailUrl,toast,searchReturnUrl} from './catalog-common.js';
mountShell('compare');
const params=new URLSearchParams(location.search);
if(params.has('ids'))setSelected((params.get('ids')||'').split(',').filter(id=>productMap.has(id)));
initCompare({tray:false});
document.querySelector('.catalog-hero>.primary-btn').href=searchReturnUrl();
let differences=false;
function render(){
 const ps=selected().map(id=>productMap.get(id)),el=document.querySelector('#comparison');
 if(ps.length<2)differences=false;
 const oldScroll=el.querySelector('.table-scroll'),scroll={left:oldScroll?.scrollLeft||0,top:oldScroll?.scrollTop||0};
 const url=new URL(location.href);url.search=ps.length?'?ids='+ps.map(p=>encodeURIComponent(p.id)).join(','):'';history.replaceState(null,'',url);
 if(!ps.length){el.innerHTML=`<div class="empty-state"><p class="eyebrow">YOUR COMPARISON</p><h2>気になる製品を、並べてみる。</h2><p>検索結果の「比較に追加」から、4製品まで選べます。</p><a class="primary-btn" href="${esc(searchReturnUrl())}">製品を選ぶ </a></div>`;return;}
 const rows=[['材質',p=>p.materialLabel||'—'],['色・材質区分',p=>p.variantLabel||'—'],['IP等級（シリーズ）',p=>p.series.metadata['IP等級']||'—'],['使用温度範囲（シリーズ）',p=>p.series.metadata['使用温度範囲']||'—']];
 for(const label of new Set(ps.flatMap(p=>p.specifications.map(s=>s.label))))rows.push([label,p=>p.specifications.find(s=>s.label===label)?.value||'—']);
 const differentRows=rows.filter(([,get])=>new Set(ps.map(get)).size>1).length;
 el.innerHTML=`${ps.length===1?`<div class="comparison-notice">もう1製品追加すると、違いを比較できます。<a href="${esc(searchReturnUrl())}">製品を追加 </a></div>`:''}<div class="comparison-tools"><label><input id="diff-only" type="checkbox" ${differences?'checked':''} ${ps.length<2?'disabled':''}> 異なる項目だけ表示 <span class="diff-count">${differentRows}項目</span></label><div><button id="share-compare" class="quiet-btn">比較URLをコピー</button><button id="print-compare" class="quiet-btn">印刷する</button></div></div><p class="comparison-caption">${differences&&differentRows===0?'仕様値に違いはありません。':`淡い青の行は、仕様値が異なる項目です。${ps.length>2?'横にスクロールしてすべての製品を確認できます。':''}`}</p><div class="table-scroll" tabindex="0" role="region" aria-label="製品比較表"><table class="compare-table" style="--compare-products:${ps.length}"><caption class="sr-only">選択した${ps.length}製品の仕様比較</caption><thead><tr><th class="row-label" scope="col">${ps.length}製品を比較</th>${ps.map(p=>`<th scope="col"><img src="${esc(p.image||'assets/catalog-parts.svg')}" alt="シリーズ写真"><p class="series-name" title="${esc(p.name)}">${esc(p.name.replace(/^\d+-\d+\s*/,''))}</p><h2><a href="${detailUrl(p)}">${esc(p.partNumber)}</a></h2><a class="detail-link" href="${detailUrl(p)}">詳細を見る </a><button class="remove-product" data-remove="${esc(p.id)}" aria-label="${esc(p.partNumber)} を比較から外す">外す ×</button></th>`).join('')}</tr></thead><tbody>${rows.map(([label,get])=>{const vals=ps.map(get),diff=new Set(vals).size>1;return differences&&!diff?'':`<tr class="${diff?'different':''}"><th class="row-label" scope="row">${esc(label)}</th>${vals.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`;}).join('')}<tr><th class="row-label" scope="row">仕様の出典</th>${ps.map(p=>`<td><a class="detail-link" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">公式製品ページ </a></td>`).join('')}</tr></tbody></table></div><a class="back-results" href="${esc(searchReturnUrl())}"> 検索結果に戻る</a>`;
 const table=el.querySelector('.table-scroll');table.scrollLeft=scroll.left;table.scrollTop=scroll.top;
 document.querySelector('#diff-only').onchange=e=>{differences=e.target.checked;render();document.querySelector('#diff-only')?.focus({preventScroll:true});};
 document.querySelector('#print-compare').onclick=()=>window.print();
 document.querySelector('#share-compare').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);toast('比較URLをコピーしました。');}catch{toast('コピーできませんでした。アドレス欄のURLをご利用ください。');}};
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){setSelected(selected().filter(id=>id!==b.dataset.remove));document.querySelector('.remove-product,.empty-state a')?.focus({preventScroll:true});}});
document.addEventListener('avc:compare',render);render();
