import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Android container requires immutable reviewed digest and localhost-only ADB',()=>{
 const compose=read('infra/cloud-android/compose.yaml');
 assert.match(compose,/image: "\$\{REDROID_IMAGE:\?/);
 assert.doesNotMatch(compose,/^\s+image:\s+redroid\/redroid:.*latest/m);
 assert.match(compose,/127\.0\.0\.1:5555:5555/);
 assert.match(compose,/privileged: true/);
 assert.match(compose,/\.\/data:\/data/);
 assert.match(read('.gitignore'),/infra\/cloud-android\/data\//);
 assert.match(read('.gitignore'),/infra\/cloud-android\/\.env/);
});
test('preflight blocks when digest, Docker or Binder prerequisites are missing',()=>{
 const script=read('infra/cloud-android/preflight.sh');
 assert.match(script,/REDROID_IMAGE=redroid\/redroid@sha256/);
 assert.match(script,/Docker daemon inaccessible/);
 assert.match(script,/Binder support not detected/);
 assert.match(script,/PREFLIGHT PASS/);
 if(process.platform!=='win32'){
  const output=execFileSync('bash',['-n',new URL('../infra/cloud-android/preflight.sh',import.meta.url).pathname],{encoding:'utf8'});
  assert.equal(output,'');
 }
});
test('Cloudflare build attempts Git HEAD fallback for immutable deployed revision',()=>{
 const build=read('cloud/build.mjs');
 assert.match(build,/WORKERS_CI_COMMIT_SHA/);
 assert.match(build,/CI_COMMIT_SHA/);
 assert.match(build,/execFileSync\('git',\['rev-parse','HEAD'\]/);
 assert.match(build,/revision=validRevision/);
 assert.match(build,/\/\^\[a-f0-9\]\{40\}\$/);
});
