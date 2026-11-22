'use strict';
/* Optional Cloud Android viewer. No ADB, tokens or privileged commands. */
(function(root){
 let panel,openLink,status,refresh;
 function text(tag,value,klass){const e=document.createElement(tag);if(klass)e.className=klass;e.textContent=value;return e;}
 function validViewerUrl(raw){
  try{
   const u=new URL(raw);
   if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||
      !u.hostname.includes('.')||u.hostname==='localhost'||
      /(?:\.local|\.internal|\.test|\.invalid|\.example|\.localhost)$/i.test(u.hostname)||
      /^\d+(?:\.\d+){3}$/.test(u.hostname)||u.hostname.includes(':'))return null;
   return u.href;
  }catch{return null;}
 }
 async function check(){
  if(!status)return;
  openLink.hidden=true;openLink.removeAttribute('href');
  refresh.disabled=true;status.textContent='Checking private Android availability…';
  try{
   const response=await fetch('/api/android/session',{method:'GET',cache:'no-store',credentials:'same-origin',redirect:'error',headers:{Accept:'application/json'}});
   if(response.status===401){status.textContent='Sign in to Cloudflare Access before opening Cloud Android.';return;}
   if(response.status===404){status.textContent='Cloud Android has not been deployed to this NewView version.';return;}
   if(response.status===503){status.textContent='Cloud Android is not configured. Existing NewView features are unaffected.';return;}
   if(!response.ok)throw Error('Unavailable');
   const details=await response.json();
   const viewer=details?.status==='ready'?validViewerUrl(details.viewerUrl):null;
   if(!viewer)throw Error('Invalid viewer');
   openLink.href=viewer;openLink.hidden=false;
   status.textContent='Private Android viewer configured. Open it only if you trust the linked host.';
  }catch{status.textContent='Unable to reach Cloud Android. Retry after reconnecting.';}
  finally{refresh.disabled=false;}
 }
 function open(){
  if(!panel)return;
  root.NewViewSections?.show?.('watch');panel.hidden=false;check();
  panel.querySelector('h3')?.focus();
 }
 function close(){if(!panel)return;panel.hidden=true;openLink.hidden=true;openLink.removeAttribute('href');}
 function install(){
  const parent=document.getElementById('nv-watch-hub');
  if(!parent||document.getElementById('nv-cloud-android'))return;
  panel=text('section','','nv-cloud-android');panel.id='nv-cloud-android';panel.hidden=true;
  panel.setAttribute('aria-label','Cloud Android connection');
  const head=text('h3','Cloud Android');head.tabIndex=-1;
  const description=text('p','Connect to an independently hosted, Access-protected virtual Android viewer. Android does not run inside Cloudflare Workers.');
  status=text('p','Connection not checked.','nv-cloud-android-status');status.setAttribute('role','status');
  const controls=text('div','','nv-cloud-android-actions');
  refresh=text('button','Check connection');refresh.type='button';refresh.addEventListener('click',check);
  openLink=text('a','Open private Android viewer');openLink.hidden=true;openLink.target='_blank';openLink.rel='noopener noreferrer';
  const done=text('button','Close');done.type='button';done.addEventListener('click',close);
  controls.append(refresh,openLink,done);panel.append(head,description,status,controls);parent.append(panel);
 }
 root.NewViewCloudAndroid=Object.freeze({open,close});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);
