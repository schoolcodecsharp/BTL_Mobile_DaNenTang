const fs=require('fs');
const sharp=require('C:/Users/truon/AppData/Local/OpenAI/Codex/runtimes/cua_node/7d8d3ac5ca9f6767/bin/node_modules/sharp');
(async()=>{
const imgs=JSON.parse(fs.readFileSync('.slide-build/assets.json'));
let comps=[];
for(let i=0;i<imgs.length;i++){
let b=await sharp(imgs[i].path).resize(290,230,{fit:'inside'}).png().toBuffer();
comps.push({input:b,left:10+(i%4)*310,top:10+Math.floor(i/4)*265});
// Contact sheet labels only, not presentation artwork.
let label=Buffer.from(`<svg width="290" height="25"><text x="0" y="20" font-family="Arial" font-size="18">image${String(i+1).padStart(2,'0')}</text></svg>`);
comps.push({input:label,left:10+(i%4)*310,top:240+Math.floor(i/4)*265});
}
await sharp({create:{width:1240,height:1590,channels:3,background:'#eeeeee'}}).composite(comps).png().toFile('.slide-build/contact.png');
})();
