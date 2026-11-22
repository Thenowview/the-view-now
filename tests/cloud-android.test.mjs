import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleAndroidSession,validatedAndroidViewerUrl} from '../cloud/android-session.mjs';
import {ACCESS_ISSUER,ACCESS_AUD,accessCertFetch,accessRequest,signedAccessToken} from './access-fixture.mjs';

const url='https://newview.example/api/android/session';
const androidEnv={
 NEWVIEW_ANDROID_ACCESS_ISSUER:ACCESS_ISSUER,
 NEWVIEW_ANDROID_ACCESS_AUD:ACCESS_AUD,
 NEWVIEW_ANDROID_VIEWER_URL:'https://android.example.org/viewer'
};
const call=(request,env=androidEnv)=>handleAndroidSession(request,env,new URL(request.url),accessCertFetch);
test('Android viewer URLs reject invalid origins, secrets and untrusted schemes',()=>{
 assert.equal(validatedAndroidViewerUrl('https://android.example.org/viewer'),'https://android.example.org/viewer');
 for(const value of ['', 'http://android.example.org', 'https://user:pass@android.example.org',
  'https://localhost/viewer','https://127.0.0.1/viewer','https://android.local/viewer',
  'https://android.example.org:8443/viewer','https://android.example.org/viewer?token=secret',
  'https://android.example.org/viewer#secret','javascript:alert(1)','https://android.example.org.evil.test/']){
  assert.equal(validatedAndroidViewerUrl(value),null,value);
 }
});
test('session fails closed without Cloudflare Access configuration',async()=>{
 const response=await call(new Request(url),{NEWVIEW_ANDROID_VIEWER_URL:androidEnv.NEWVIEW_ANDROID_VIEWER_URL});
 assert.equal(response.status,503);
 assert.deepEqual(await response.json(),{status:'unconfigured',error:'Cloud Android access is not configured'});
});
test('session requires signed identity and refuses forged or expired JWT',async()=>{
 const missing=await call(new Request(url));
 assert.equal(missing.status,401);
 for(const token of ['garbage',signedAccessToken({exp:Math.floor(Date.now()/1000)-10}),signedAccessToken({aud:['wrong-audience']})]){
  const rejected=await call(accessRequest(new Request(url),token));
  assert.equal(rejected.status,401);
 }
});
test('session returns configured viewer only to authentic signed identity',async()=>{
 const response=await call(accessRequest(new Request(url)));
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(response.headers.get('access-control-allow-origin'),null);
 assert.equal(response.headers.get('x-frame-options'),'DENY');
 assert.deepEqual(await response.json(),{status:'ready',viewerUrl:'https://android.example.org/viewer'});
});
test('session does not disclose viewer URL when viewer is missing or invalid',async()=>{
 for(const value of [undefined,'http://unsafe.example.org','https://user:pass@android.example.org']){
  const response=await call(accessRequest(new Request(url)),{...androidEnv,NEWVIEW_ANDROID_VIEWER_URL:value});
  assert.equal(response.status,503);
  assert.doesNotMatch(await response.text(),/android\.example\.org/);
 }
});
test('unknown routes and non-GET methods reject without revealing a viewer URL',async()=>{
 for(const method of ['POST','PUT','DELETE']){
  const response=await call(accessRequest(new Request(url,{method})));
  assert.equal(response.status,405);
  assert.equal(response.headers.get('allow'),'GET');
 }
 const unknown=await call(accessRequest(new Request(url+'-untrusted')));
 assert.equal(unknown.status,404);
 const query=await call(accessRequest(new Request(url+'?token=x')));
 assert.equal(query.status,404);
});
test('front-end integration remains optional inside Watch and preserves four tabs',()=>{
 const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const html=read('web/index.html'),nav=read('web/simplified-ui.js');
 const cloud=read('web/cloud-android.js'),build=read('cloud/build.mjs');
 assert.match(nav,/\['home','Home'\],\['watch','Watch'\],\['read','Discover'\],\['customize','Settings'\]/);
 assert.match(nav,/addAction\(watchActions,'Cloud Android'/);
 assert.match(html,/cloud-android\.js/);
 assert.match(html,/cloud-android\.css/);
 assert.match(cloud,/api\/android\/session/);
 assert.match(cloud,/rel='noopener noreferrer'/);
 assert.match(build,/handleAndroidSession\(request,env,url\)/);
 assert.match(build,/androidSession/);
 assert.doesNotMatch(cloud,/\b5555\b|\badb\s+connect\b/i);
});
