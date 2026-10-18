// Uncompressed ZIP: no dependency, network service, or uploaded customer package.
export function zip(entries) {
  const encoder=new TextEncoder(),parts=[],central=[];let offset=0;
  const crc=bytes=>{let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;};
  const header=(size)=>{const bytes=new Uint8Array(size);return [bytes,new DataView(bytes.buffer)];};
  for(const [path,content] of Object.entries(entries)) {
    const name=encoder.encode(path),data=typeof content==='string'?encoder.encode(content):content,checksum=crc(data);
    const [local,l]=header(30);l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint32(14,checksum,true);l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);l.setUint16(26,name.length,true);
    parts.push(local,name,data);
    const [record,c]=header(46);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint32(16,checksum,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.push(record,name);offset+=30+name.length+data.length;
  }
  const [end,e]=header(22);e.setUint32(0,0x06054b50,true);e.setUint16(8,Object.keys(entries).length,true);e.setUint16(10,Object.keys(entries).length,true);e.setUint32(12,central.reduce((n,b)=>n+b.length,0),true);e.setUint32(16,offset,true);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}
