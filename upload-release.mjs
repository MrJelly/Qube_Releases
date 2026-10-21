import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const repository='MrJelly/Qube_Releases';
function exec(command,args,options={}){
 const result=spawnSync(command,args,{cwd:root,encoding:'utf8',...options});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error(result.stderr?.trim()||`${command} exited ${result.status}`);
 return result.stdout?.trim()||'';
}
function check(){
 const local=JSON.parse(fs.readFileSync(path.join(root,'.release-local.json'),'utf8'));
 if(!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(local.version))throw Error('Invalid version');
 const assets=path.resolve(root,local.assetsDirectory);
 if(!assets.startsWith(path.join(root,'release-assets')+path.sep))throw Error('Invalid asset directory');
 const envelope=JSON.parse(fs.readFileSync(path.join(assets,'catalog.json'),'utf8'));
 const key=Buffer.from(fs.readFileSync(path.join(root,'plugin-public-key.hex'),'utf8').trim(),'hex');
 if(key.length!==32)throw Error('Invalid public key');
 const publicKey=crypto.createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),key]),type:'spki',format:'der'});
 if(!crypto.verify(null,Buffer.from(envelope.manifest),publicKey,Buffer.from(envelope.signature,'base64')))throw Error('Release catalogue signature is invalid');
 const manifest=JSON.parse(envelope.manifest);
 if(manifest.version!==local.version||manifest.release!==`https://github.com/${repository}/releases/tag/v${local.version}`)throw Error('Catalogue version or repository mismatch');
 const files=[];
 const names=new Set();
 for(const info of manifest.files){
  if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]+$/.test(info.name)||names.has(info.name))throw Error('Invalid or duplicate file name');
  names.add(info.name);
  const file=path.join(assets,info.name),bytes=fs.readFileSync(file);
  if(bytes.length!==info.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==info.sha256)throw Error('File verification failed: '+info.name);
  files.push(file);
 }
 if(!names.has('qingxia-windows-x64.exe')||!names.has('qingxia-source.zip')||!names.has('licenses.zip'))throw Error('Required release files missing');
 if(!fs.readFileSync(path.join(assets,'catalog.json')).equals(fs.readFileSync(path.join(root,'catalog.json'))))throw Error('Repository catalogue differs from release assets');
 const sums=manifest.files.map(f=>f.sha256+'  '+f.name).join('\n')+'\n';
 if(fs.readFileSync(path.join(assets,'SHA256SUMS.txt'),'utf8')!==sums)throw Error('Checksum file differs from catalogue');
 const remote=exec('git',['remote','get-url','origin']);
 if(![`https://github.com/${repository}.git`,`https://github.com/${repository}`,`git@github.com:${repository}.git`].includes(remote))throw Error('Unexpected repository remote');
 return {version:local.version,files:[...files,path.join(assets,'catalog.json'),path.join(assets,'SHA256SUMS.txt')],tag:'v'+local.version};
}
try{
 const release=check();
 console.log(`Local verification passed: ${release.tag}, ${release.files.length} attachments.`);
 if(process.argv.includes('--check'))process.exit(0);
 if(!process.argv.includes('--upload'))throw Error('Use --check or --upload');
 if(exec('git',['status','--porcelain']))throw Error('Commit release repository changes before uploading.');
 const bundled=path.join(root,'.tools/gh.exe');
 const gh=fs.existsSync(bundled)?bundled:'gh';
 const auth=spawnSync(gh,['auth','status','--hostname','github.com'],{cwd:root,stdio:'ignore'});
 if(auth.error)throw Error('GitHub CLI is required. Install it from https://cli.github.com/');
 if(auth.status!==0){if(process.argv.includes('--ci'))throw Error('Publishing token is unavailable');exec(gh,['auth','login','--hostname','github.com','--git-protocol','https','--web','--skip-ssh-key'],{stdio:'inherit'});}
 const existing=spawnSync(gh,['release','view',release.tag,'--repo',repository,'--json','isDraft,tagName,url'],{cwd:root,encoding:'utf8'});
 if(existing.status===0&&!JSON.parse(existing.stdout).isDraft)throw Error('This version is already published. Increase the version instead of replacing published files.');
 // The helper applies only to this push; it does not change global Git settings.
 const helper="!'"+gh.replaceAll('\\','/').replaceAll("'","'\\''")+"' auth git-credential";
 if(process.argv.includes('--push-source')){
  const source=path.dirname(root);
  const sourceRemote=exec('git',['remote','get-url','origin'],{cwd:source});
  if(sourceRemote!=='https://github.com/MrJelly/Qube.git'||exec('git',['branch','--show-current'],{cwd:source})!=='main')throw Error('Unexpected source repository or branch');
  if(exec('git',['status','--porcelain'],{cwd:source}))throw Error('Commit source changes before publishing.');
  exec('git',['-c','credential.helper=','-c','credential.helper='+helper,'push','origin','main'],{cwd:source,stdio:'inherit'});
 }
 exec('git',['-c','credential.helper=','-c','credential.helper='+helper,'push','--set-upstream','origin','main'],{stdio:'inherit'});
 if(existing.status===0){
  const value=JSON.parse(existing.stdout);
  if(!value.isDraft)throw Error('This version is already published. Increase the version instead of replacing published files.');
 }else{
  exec(gh,['release','create',release.tag,'--repo',repository,'--target','main','--draft','--title','轻匣 '+release.tag,'--notes-file',path.join(root,'release-notes.md')],{stdio:'inherit'});
 }
 exec(gh,['release','upload',release.tag,...release.files,'--repo',repository,'--clobber'],{stdio:'inherit'});
 const uploaded=JSON.parse(exec(gh,['release','view',release.tag,'--repo',repository,'--json','databaseId,isDraft,url,assets']));
 if(!uploaded.isDraft)throw Error('Unexpected published state');
 for(const file of release.files){const asset=uploaded.assets.find(a=>a.name===path.basename(file));if(!asset||asset.size!==fs.statSync(file).size)throw Error('Uploaded attachment missing or wrong size: '+path.basename(file));}
 if(process.argv.includes('--publish')){
  const assets=JSON.parse(exec(gh,['api',`repos/${repository}/releases/${uploaded.databaseId}/assets?per_page=100`,'--paginate','--slurp'])).flat();
  if(assets.length!==release.files.length)throw Error('Unexpected attachments in release draft. Publication stopped.');
  for(const file of release.files){const asset=assets.find(a=>a.name===path.basename(file));const digest='sha256:'+crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');if(!asset||asset.size!==fs.statSync(file).size||asset.digest!==digest)throw Error('Uploaded attachment checksum differs: '+path.basename(file));}
  exec(gh,['release','edit',release.tag,'--repo',repository,'--draft=false','--latest'],{stdio:'inherit'});
  const published=JSON.parse(exec(gh,['release','view',release.tag,'--repo',repository,'--json','isDraft']));
  if(published.isDraft)throw Error('Release is still a draft.');
  console.log('Release published.');
 }else console.log('Draft is ready. Review it in GitHub and click Publish release.');
 console.log(uploaded.url);
 if(!process.argv.includes('--ci'))exec(gh,['release','view',release.tag,'--repo',repository,'--web'],{stdio:'inherit'});
}catch(error){console.error(error.message);process.exitCode=1;}
