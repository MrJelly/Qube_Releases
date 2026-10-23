import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repository='MrJelly/Qube_Releases';
const version=tag=>/^v\d+\.\d+\.\d+$/.test(tag)?tag.slice(1).split('.').map(Number):null;
export function olderReleases(releases,latest){
 const current=version(latest.tag_name);
 if(!current||latest.draft||latest.prerelease)throw Error('Latest must be a published stable release');
 return releases.filter(release=>{
  const candidate=version(release.tag_name);
  if(!candidate||release.id===latest.id)return false;
  for(let i=0;i<3;i++){if(candidate[i]!==current[i])return candidate[i]<current[i];}
  return false;
 });
}

// Only retire older releases after the public latest release and all its assets are verified.
export function pruneReleases(gh='gh',root=path.dirname(fileURLToPath(import.meta.url)),expectedTag,publicKeyPath=path.join(root,'plugin-public-key.hex')){
 const run=args=>{const result=spawnSync(gh,args,{cwd:root,encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw Error(result.stderr?.trim()||'Release cleanup failed');return result.stdout;};
 const latest=JSON.parse(run(['api',`repos/${repository}/releases/latest`]));
 if(expectedTag&&latest.tag_name!==expectedTag)throw Error('Latest release changed; cleanup stopped');
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'qingxia-retention-'));
 try{
  run(['release','download',latest.tag_name,'--repo',repository,'--pattern','catalog.json','--dir',temporary]);
  const envelope=JSON.parse(fs.readFileSync(path.join(temporary,'catalog.json'),'utf8'));
  const key=Buffer.from(fs.readFileSync(publicKeyPath,'utf8').trim(),'hex');
  const publicKey=crypto.createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),key]),type:'spki',format:'der'});
  if(!crypto.verify(null,Buffer.from(envelope.manifest),publicKey,Buffer.from(envelope.signature,'base64')))throw Error('Latest catalogue signature is invalid');
  const manifest=JSON.parse(envelope.manifest);
  if(latest.tag_name!==`v${manifest.version}`||!manifest.files?.length)throw Error('Latest catalogue version is invalid');
  const assets=JSON.parse(run(['api',`repos/${repository}/releases/${latest.id}/assets?per_page=100`,'--paginate','--slurp'])).flat();
  if(!manifest.files.some(f=>f.name==='qingxia-windows-x64.exe'))throw Error('Latest application is missing');
  for(const file of manifest.files){const asset=assets.find(a=>a.name===file.name);if(!asset||asset.size!==file.bytes||asset.digest!==`sha256:${file.sha256}`)throw Error('Latest attachment failed verification: '+file.name);}
  const releases=JSON.parse(run(['api',`repos/${repository}/releases?per_page=100`,'--paginate','--slurp'])).flat();
  const outdated=olderReleases(releases,latest);
  for(const release of outdated){
   if(JSON.parse(run(['api',`repos/${repository}/releases/latest`])).id!==latest.id)throw Error('Latest release changed; cleanup stopped');
   run(['release','delete',release.tag_name,'--repo',repository,'--cleanup-tag','--yes']);console.log('Removed old release: '+release.tag_name);
  }
  console.log('Kept latest release: '+latest.tag_name);
 }finally{
  const resolved=fs.realpathSync(temporary);
  if(path.dirname(resolved)===fs.realpathSync(os.tmpdir())&&path.basename(resolved).startsWith('qingxia-retention-'))fs.rmSync(resolved,{recursive:true,force:true});
 }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv.includes('--prune'))throw Error('Use --prune to remove verified older releases');
 const root=path.dirname(fileURLToPath(import.meta.url));
 pruneReleases(fs.existsSync(path.join(root,'.tools/gh.exe'))?path.join(root,'.tools/gh.exe'):'gh',root);
}
