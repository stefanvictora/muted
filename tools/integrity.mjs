import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

async function files(root, relative='extension') {
  const result=[];
  for(const entry of await readdir(join(root,relative),{withFileTypes:true})) {
    const path=`${relative}/${entry.name}`;
    if(entry.isSymbolicLink()) throw new Error('Keine symbolischen Links im Paket erlaubt.');
    if(entry.isDirectory()) result.push(...await files(root,path));
    else if(entry.isFile()) result.push(path);
  }
  return result.sort();
}
const hash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');

export async function createManifest(root,version) {
  const lines=[`# Muted ${version}`, '# SHA-256; ausschließlich Runtime-Dateien in extension/'];
  for(const path of await files(root)) lines.push(`${await hash(join(root,path))}  ${path}`);
  return lines.join('\n')+'\n';
}

export async function verifyPackage(directory) {
  const root=resolve(directory);
  const text=await readFile(join(root,'release-manifest.txt'),'utf8');
  const entries=text.split(/\r?\n/).filter(line=>line && !line.startsWith('#')).map(line=>{
    const match=/^([0-9a-f]{64})  (extension\/[a-zA-Z0-9_./-]+)$/.exec(line);
    if(!match || match[2].split('/').some(part=>!part || part==='..' || part==='.')) throw new Error('Ungültige Hashliste.');
    return {hash:match[1],path:match[2]};
  });
  const actual=await files(root), expected=entries.map(e=>e.path).sort();
  if(!expected.length || JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error('Dateiliste stimmt nicht überein (fehlende oder zusätzliche Datei).');
  for(const entry of entries) if(await hash(join(root,entry.path))!==entry.hash) throw new Error(`Hash stimmt nicht: ${entry.path}`);
  return {files:entries.length};
}
