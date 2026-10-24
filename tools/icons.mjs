// Deterministic local icon generation; no downloaded assets or runtime dependencies.
import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
function crc(data) {let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data) {const name=Buffer.from(type),length=Buffer.alloc(4),checksum=Buffer.alloc(4);length.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([length,name,data,checksum]);}
await mkdir('extension/assets',{recursive:true});
for (const size of [16,32,48,128]) {
  const raw=Buffer.alloc(size*(size*4+1));
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const dx=x+.5-size/2,dy=y+.5-size/2,d=Math.hypot(dx,dy),r=size*.45;
    const alpha=Math.round(Math.max(0,Math.min(1,r+.5-d))*255);
    const value=d>r-size*.065 || dx<0 ? 36 : 226;
    const i=y*(size*4+1)+1+x*4;raw[i]=value;raw[i+1]=value;raw[i+2]=value;raw[i+3]=alpha;
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  await writeFile(`extension/assets/icon-${size}.png`,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}
