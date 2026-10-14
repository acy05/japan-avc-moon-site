import {catalogData} from './data/catalog-data.js';
export const categories=[
{id:'nylon',name:'ナイロン製ケーブルグランド',english:'NYLON',description:'単穴・多芯・耐熱など、接続条件から選ぶ。',image:'assets/nylon.jpg'},
{id:'metal',name:'メタル製ケーブルグランド',english:'METAL',description:'真鍮・ステンレス・EMC対応のラインナップ。',image:'assets/metal.jpg'},
{id:'tube',name:'コルゲートチューブ＆グランド',english:'PROTECTION',description:'ケーブルを保護する、チューブと接続部品。',image:'assets/tube.jpg'},
{id:'parts',name:'周辺パーツ',english:'ACCESSORIES',description:'プラグ・ロックナット・工具・アダプター。',image:'assets/catalog-parts.svg'}];
export const series=catalogData.series;
const sm=new Map(series.map(s=>[s.id,s]));
export const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s\-‐−]/g,'');
export const products=catalogData.products.map(p=>{const s=sm.get(p.seriesId);const specifications=s.specificationLabels.map((label,i)=>({label,value:p.specValues[i]})).filter(x=>x.value);return {...p,specifications,series:s,categoryId:s.categoryId,name:s.name,image:s.image,sourceUrl:s.sourceUrl,search:normalize([p.partNumber,s.name,s.section,p.variantLabel,p.materialLabel,p.thread,...specifications.map(x=>x.value)].join(' '))};});
export const productMap=new Map(products.map(p=>[p.id,p]));
export const coverage=catalogData.coverage;
export const verifiedAt=catalogData.verifiedAt;
export const spec=(p,pattern)=>p.specifications.find(x=>pattern.test(x.label))?.value||'—';
export function filterProducts({q='',category='',thread='',material='',diameter='',feature=''}={}) {
 const words=q.normalize('NFKC').trim().split(/\s+/).filter(Boolean).map(normalize);
 return products.filter(p=>words.every(w=>p.search.includes(w))&&(!category||p.categoryId===category)&&(!thread||p.threadType===thread)&&(!material||p.materialType===material)&&(!feature||p.name.includes(feature))&&(diameter===''||(p.cableRange&&Number(diameter)>=p.cableRange[0]&&Number(diameter)<=p.cableRange[1])));
}
