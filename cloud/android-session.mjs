import {checkNewViewAccess} from './access-auth.mjs';

// Metadata-only endpoint: never relay ADB, credentials or Android commands.
export function validatedAndroidViewerUrl(raw){
 if(typeof raw!=='string'||!raw.trim()||raw.length>2048)return null;
 try{
  const u=new URL(raw),h=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||
    !h.includes('.')||h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||
    h.endsWith('.internal')||h.endsWith('.test')||h.endsWith('.invalid')||
    h.endsWith('.example')||h.includes(':')||/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)||
    /\s/.test(raw))return null;
  return u.href;
 }catch{return null;}
}
export async function handleAndroidSession(request,env,url,fetcher=fetch){
 const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',
  'Vary':'Cf-Access-Jwt-Assertion, Cookie'};
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(url.pathname!=='/api/android/session'||url.search)return json({error:'Unknown Android endpoint'},404);
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET'}});
 const access=await checkNewViewAccess(request,{
  NEWVIEW_SYNC_ACCESS_ISSUER:env?.NEWVIEW_ANDROID_ACCESS_ISSUER,
  NEWVIEW_SYNC_ACCESS_AUD:env?.NEWVIEW_ANDROID_ACCESS_AUD
 },fetcher);
 if(!access.configured)return json({status:'unconfigured',error:'Cloud Android access is not configured'},503);
 if(!access.ok)return json({error:'Cloud Android requires authenticated access'},401);
 const viewerUrl=validatedAndroidViewerUrl(env?.NEWVIEW_ANDROID_VIEWER_URL);
 if(!viewerUrl)return json({status:'unconfigured',error:'Cloud Android viewer is not configured'},503);
 return json({status:'ready',viewerUrl});
}
