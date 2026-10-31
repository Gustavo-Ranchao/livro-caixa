const fs=require('fs');
const index=fs.readFileSync('index.html','utf8');
const renderer=fs.readFileSync('renderer.js','utf8');
const main=fs.readFileSync('main.js','utf8');
const views=[...index.matchAll(/class="top-module-btn"[^>]*data-view="([^"]+)"/g)].map(x=>x[1]);
const permitidos=(main.match(/const MODULOS_PERMITIDOS = new Set\(\[([\s\S]*?)\]\);/)||[])[1]||'';
const viewsRenderer=(renderer.match(/const VIEWS = \[([\s\S]*?)\];/)||[])[1]||'';
const faltas=[];
for(const view of new Set(views)){
  if(!new RegExp(`['"]${view}['"]`).test(permitidos))faltas.push(`${view}: não permitido em main.js`);
  if(!new RegExp(`['"]${view}['"]`).test(viewsRenderer))faltas.push(`${view}: ausente da lista VIEWS em renderer.js`);
}
if(faltas.length){console.error('Módulos sem integração completa:\n- '+faltas.join('\n- '));process.exit(1);}
console.log(`Integração dos módulos verificada: ${new Set(views).size} módulos.`);
