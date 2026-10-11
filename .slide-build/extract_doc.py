from pathlib import Path
import struct, json, re
B=Path('BC.doc').read_bytes()
u16=lambda b,o:struct.unpack_from('<H',b,o)[0]
u32=lambda b,o:struct.unpack_from('<I',b,o)[0]
ss=1<<u16(B,30)
sec=lambda n:B[(n+1)*ss:(n+2)*ss]
fat_ids=list(struct.unpack_from('<109I',B,76)); nxt=u32(B,68)
for _ in range(u32(B,72)):
 d=sec(nxt); fat_ids+=list(struct.unpack('<'+str(ss//4-1)+'I',d[:-4])); nxt=u32(d,ss-4)
fat=[]
for i in fat_ids:
 if i<0xfffffffa:fat+=list(struct.unpack('<'+str(ss//4)+'I',sec(i)))
def chain(n):
 out=b''; seen=set()
 while n<0xfffffffa and n not in seen:
  seen.add(n);out+=sec(n);n=fat[n]
 return out
directory=chain(u32(B,48)); entries={}
for p in range(0,len(directory),128):
 d=directory[p:p+128]; ln=u16(d,64)
 if ln: entries[d[:ln-2].decode('utf-16-le')]=(u32(d,116),struct.unpack_from('<Q',d,120)[0])
streams={k:chain(v[0])[:v[1]] for k,v in entries.items() if v[1]>=4096}
w=streams['WordDocument'];tab=streams['1Table' if u16(w,10)&0x200 else '0Table']
off=32; csw=u16(w,off);off+=2+csw*2;cslw=u16(w,off);off+=2+cslw*4;cnt=u16(w,off);off+=2
fc,lcb=struct.unpack_from('<II',w,off+33*8);clx=tab[fc:fc+lcb];p=0
while clx[p]==1:p+=3+u16(clx,p+1)
assert clx[p]==2
ln=u32(clx,p+1);plc=clx[p+5:p+5+ln];n=(ln-4)//12;cps=struct.unpack_from('<'+str(n+1)+'I',plc,0);parts=[]
for i in range(n):
 f=u32(plc,4*(n+1)+8*i+2);compressed=bool(f&0x40000000);f=f&0x3fffffff; count=cps[i+1]-cps[i]
 if compressed: parts.append(w[f//2:f//2+count].decode('cp1252',errors='replace'))
 else: parts.append(w[f:f+2*count].decode('utf-16-le',errors='replace'))
text=''.join(parts).replace('\r','\n').replace('\x07',' | ')
Path('.slide-build/source.txt').write_text(text,encoding='utf-8')
out=Path('.slide-build/assets');out.mkdir(exist_ok=True)
imgs=[]
for name,data in streams.items():
 pos=0
 while True:
  p=data.find(b'\x89PNG\r\n\x1a\n',pos)
  if p<0:break
  end=data.find(b'IEND\xaeB`\x82',p)
  if end<0:break
  blob=data[p:end+8];pos=end+8
  try: width,height=struct.unpack_from('>II',blob,16)
  except:continue
  dest=out/f'image{len(imgs)+1:02}.png';dest.write_bytes(blob);imgs.append({'path':str(dest),'width':width,'height':height})
Path('.slide-build/assets.json').write_text(json.dumps(imgs,indent=2))
print(json.dumps({'characters':len(text),'images':imgs},ensure_ascii=False))
