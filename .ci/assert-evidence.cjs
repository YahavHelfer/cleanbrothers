const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const stable=v=>typeof v==='string'?v:JSON.stringify(v);
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
for(const method of ['equal','deepEqual']){
 const verify=assert[method];
 assert[method]=function(actual,expected,...rest){
  try{return verify(actual,expected,...rest)}catch(e){
   const location=(e.stack||'').split('\n').find(x=>x.includes('cms-public-equivalence.test.mjs:')||x.includes('cms-site-chrome.test.mjs:'));
   if(location){const a=stable(actual),b=stable(expected);let i=0;while(i<Math.min(a.length,b.length)&&a[i]===b[i])i++;
    fs.appendFileSync(process.env.QA_ASSERTS,JSON.stringify({location:location.trim().match(/(cms-[^/:]+\.test\.mjs:\d+:\d+)/)?.[1],actual:hash(a),expected:hash(b),actualSnippet:a.slice(Math.max(0,i-24),i+95),expectedSnippet:b.slice(Math.max(0,i-24),i+95)})+'\n');}
   throw e;
  }
 };
}
