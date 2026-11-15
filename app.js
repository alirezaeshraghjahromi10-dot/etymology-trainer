const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=s=>+(String(s).match(/\d+/)||[1e9])[0];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
let ALL=[];
const S={sessions:new Set(),root:'',dir:'en2fa',mode:'',q:[],i:0,ok:0,no:0,wrong:[],sq:'',bs:'',sel:new Set()};
const main=h=>{$('#main').innerHTML=h};
const sn=w=>/\d/.test(w.session)?num(w.session):w.session;
const badge=w=>`<span class=badge>جلسه ${esc(sn(w))}</span>`;
const en=t=>`<span class=en>${esc(t)}</span>`;
const MODES=[['browse','📖','واژه‌های جلسه','یک جلسه را باز کن، واژه‌ها را انتخاب کن و معنی و مثال‌ها را ببین'],
  ['card','🃏','فلش‌کارت','کارت‌ها تصادفی؛ روی کارت بزن تا پاسخ و مثال‌ها را ببینی'],
  ['quiz','🎯','آزمون چهارگزینه‌ای','معنی یا واژه را انتخاب کن'],
  ['sent','📝','آزمون جمله‌ای','معنی واژه‌ی زیرخط‌دار در جمله چیست؟'],
  ['type','⌨️','تایپ پاسخ','از روی معنی فارسی، واژه را بنویس'],
  ['cloze','✍️','جای‌خالی','واژه‌ی جاافتاده در جمله را پیدا کن']];

// ---------- data ----------
function normalize(d,out=[]){
  const add=(s,l)=>(l||[]).forEach(w=>out.push({...w,session:String(w.session||s||'?'),examples:w.examples||[],root:w.root||w.affix||w.root_suffix||''}));
  if(Array.isArray(d))d.forEach(x=>normalize(x,out));
  else if(d.sessions)d.sessions.forEach(s=>add(s.session,s.vocabulary_list));
  else add(d.session,d.vocabulary_list);
  return out;
}
function load(list){
  ALL=[...new Map(list.map(w=>({...w,id:w.session+'|'+w.word})).map(w=>[w.id,w])).values()];
  S.sessions=new Set(ALL.map(w=>w.session));
  $('#load').hidden=true;menu();
}
fetch('data/all_sessions.json').then(r=>r.json()).then(d=>load(normalize(d))).catch(()=>{$('#load').hidden=false});
$('#files').onchange=async e=>{
  let out=[];for(const f of e.target.files){
    const part=normalize(JSON.parse(await f.text())),m=f.name.match(/\d+/);
    if(m)part.forEach(w=>w.session='session '+m[0]);out.push(...part);
  }load(out);
};
const pool=()=>ALL.filter(w=>S.sessions.has(w.session)&&(!S.root||w.root===S.root));
const dirOf=()=>S.dir==='mix'?(Math.random()<.5?'en2fa':'fa2en'):S.dir;
function dist(w){   // 3 distractors: same root first, then same session, then anything
  const bad=x=>x.word===w.word||x.persian_meaning===w.persian_meaning;
  let ds=shuffle(ALL.filter(x=>w.root&&x.root===w.root&&!bad(x))).slice(0,3);
  for(const f of [x=>x.session===w.session,()=>true])
    if(ds.length<3)ds=ds.concat(shuffle(ALL.filter(x=>!bad(x)&&!ds.includes(x)&&f(x)))).slice(0,3);
  return ds;
}
function pick(w){   // an example sentence that contains the word
  const re=new RegExp('\\b'+w.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
  const c=w.examples.map(e=>({e,m:e.match(re)})).filter(x=>x.m);
  if(!c.length)return null;const x=c[Math.random()*c.length|0];return{e:x.e,m:x.m[0]};
}

// ---------- menu ----------
function menu(){$('#setup').hidden=false;main('');renderSetup();if(S.sq)search(S.sq)}
const sessList=()=>[...new Set(ALL.map(w=>w.session))].sort((a,b)=>num(a)-num(b)||a.localeCompare(b));
function renderSetup(){
  const sess=sessList();
  const roots=[...new Set(ALL.map(w=>w.root).filter(Boolean))].sort();
  $('#setup').innerHTML=`
  <div class=row><h3>جلسه‌ها</h3><button class=sm data-all=1>همه</button><button class=sm data-all=0>هیچ‌کدام</button></div>
  <div class=chips>${sess.map(s=>`<label><input type=checkbox value="${esc(s)}" ${S.sessions.has(s)?'checked':''}>${/\d/.test(s)?num(s):esc(s)}</label>`).join('')}</div>
  <div class=row><label>ریشه <select id=root class=en><option value="">همه‌ی ریشه‌ها</option>${roots.map(r=>`<option ${r===S.root?'selected':''}>${esc(r)}</option>`).join('')}</select></label>
  <label>جهت <select id=dir>${[['en2fa','انگلیسی ← فارسی'],['fa2en','فارسی ← انگلیسی'],['mix','ترکیبی']].map(([v,t])=>`<option value=${v} ${v===S.dir?'selected':''}>${t}</option>`).join('')}</select></label></div>
  <p class=info>${pool().length} واژه انتخاب شده</p>
  <div class=tiles>${MODES.map(([m,i,t,d])=>`<button class=tile data-m=${m}><b>${i} ${t}</b><small>${d}</small></button>`).join('')}</div>
  <input type=search dir=auto id=sq value="${esc(S.sq)}" placeholder="🔍 جستجوی واژه، معنی یا ریشه…">`;
  $('#stat').textContent=`${ALL.length} واژه`;
}
$('#setup').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.all!=null){S.sessions=new Set(b.dataset.all==='1'?ALL.map(w=>w.session):[]);renderSetup()}
  if(b.dataset.m==='browse')browse();else if(b.dataset.m)go(b.dataset.m);
});
$('#setup').addEventListener('change',e=>{
  if(!(e.target.type==='checkbox'||e.target.id==='root'||e.target.id==='dir'))return;   // blur of the search box must not reset the page
  if(e.target.type==='checkbox'){e.target.checked?S.sessions.add(e.target.value):S.sessions.delete(e.target.value)}
  if(e.target.id==='root')S.root=e.target.value;
  if(e.target.id==='dir')S.dir=e.target.value;
  const y=scrollY;renderSetup();scrollTo(0,y);
});
$('#setup').addEventListener('input',e=>{if(e.target.id==='sq'){S.sq=e.target.value;search(S.sq)}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'){const n=$('#next');if(n)n.click()}});

// ---------- flow ----------
function go(m){
  S.mode=m;S.i=0;S.ok=0;S.no=0;S.wrong=[];
  let q=shuffle(pool());                       // always random, no performance tracking
  if(m==='cloze'||m==='sent')q=q.filter(pick);
  if(!q.length){alert('واژه‌ای برای تمرین با این انتخاب وجود ندارد.');return}
  S.q=q;$('#setup').hidden=true;step();
}
const bar=()=>`<div class=bar><button class=sm id=back>← منو</button><span>${S.mode==='card'?'':`✅ ${S.ok} &nbsp; ❌ ${S.no} &nbsp;·&nbsp; `}${S.i+1} از ${S.q.length}</span></div><div class=prog><i style="width:${S.i/S.q.length*100}%"></i></div>`;
const wire=()=>{$('#back').onclick=menu;const n=$('#next');if(n)n.onclick=()=>{S.i++;step()}};
const ans=(w,ok)=>{if(ok)S.ok++;else{S.no++;S.wrong.push(w)}};
const nextBtn='<div class=row><button class=pri id=next>بعدی ←</button></div>';
function step(){
  if(S.i>=S.q.length){
    const t=S.ok+S.no,p=t?Math.round(S.ok/t*100):0;
    main(`<div class=card><h2>پایان 🎉</h2>${S.mode==='card'?`<p>${S.q.length} کارت را مرور کردی.</p>`:`<div class=big>${p}٪</div><p>${S.ok} از ${t} پاسخ درست</p>`}
    ${S.wrong.length?`<h3>مرور غلط‌ها</h3>${S.wrong.map(w=>`<div class=res>${en(w.word)} — <span class=fa>${esc(w.persian_meaning)}</span> ${badge(w)}</div>`).join('')}`:''}
    <div class=row><button id=back>بازگشت به منو</button><button class=pri id=again>تکرار با ترتیب جدید</button></div></div>`);
    wire();$('#again').onclick=()=>go(S.mode);return;
  }
  V[S.mode](S.q[S.i]);
}
function choose(w,os,optsAreWords){
  $$('.opt').forEach(b=>b.onclick=()=>{
    const ok=os[b.dataset.i]===w;ans(w,ok);
    $$('.opt').forEach((x,i)=>{
      x.disabled=true;if(os[i]===w)x.classList.add('ok');
      x.insertAdjacentHTML('beforeend',`<span>${optsAreWords?'':`<small class=en>${esc(os[i].word)}</small> `}${badge(os[i])}</span>`);
    });
    if(!ok)b.classList.add('no');
    $('#nx').innerHTML=nextBtn;wire();
  });
}

// ---------- views ----------
const V={
  card(w){
    const fa=dirOf()==='fa2en';
    const e=`<div class="big en">${esc(w.word)}</div>`,p=`<div class="big fa">${esc(w.persian_meaning)}</div>`;
    main(`${bar()}<div class="card flip" id=c>${badge(w)}${fa?p:e}<div id=bk hidden>${fa?e:p}<div class=root>${esc(w.root)}</div><ul class=en>${w.examples.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><p class=hint id=hint>برای دیدن پاسخ بزن</p></div>${nextBtn}`);
    wire();$('#c').onclick=()=>{$('#bk').hidden=false;$('#hint').hidden=true};
  },
  quiz(w){
    const fa=dirOf()==='fa2en',os=shuffle([w,...dist(w)]);
    main(`${bar()}<div class=card>${badge(w)}<div class="big ${fa?'fa':'en'}">${esc(fa?w.persian_meaning:w.word)}</div><div class=root>${esc(w.root)}</div>
    ${os.map((o,i)=>`<button class="opt ${fa?'en':'fa'}" data-i=${i}><span>${esc(fa?o.word:o.persian_meaning)}</span></button>`).join('')}</div><div id=nx></div>`);
    wire();choose(w,os,fa);
  },
  sent(w){
    const p=pick(w),os=shuffle([w,...dist(w)]);
    main(`${bar()}<div class=card>${badge(w)}<p class="sent en">${esc(p.e).replace(esc(p.m),`<u>${esc(p.m)}</u>`)}</p><p class=q>معنی واژه‌ی زیرخط‌دار چیست؟</p>
    ${os.map((o,i)=>`<button class="opt fa" data-i=${i}><span>${esc(o.persian_meaning)}</span></button>`).join('')}</div><div id=nx></div>`);
    wire();choose(w,os,false);
  },
  type(w){
    main(`${bar()}<div class=card>${badge(w)}<div class="big fa">${esc(w.persian_meaning)}</div><div class=root>${esc(w.root)}</div>
    <input type=text id=ans autocomplete=off autocapitalize=off spellcheck=false placeholder="واژه‌ی انگلیسی…"><div id=fb></div></div>`);
    wire();const a=$('#ans');a.focus();
    a.onkeydown=e=>{
      if(e.key!=='Enter'||a.disabled)return;e.stopPropagation();
      const ok=a.value.trim().toLowerCase()===w.word.toLowerCase();ans(w,ok);a.disabled=true;
      $('#fb').innerHTML=`<p class=${ok?'good':'bad'}>${ok?'درست ✓':'پاسخ: <b class=en>'+esc(w.word)+'</b>'}</p>${nextBtn}`;wire();
    };
  },
  cloze(w){
    const p=pick(w);
    main(`${bar()}<div class=card>${badge(w)}<p class="sent en">${esc(p.e.replace(p.m,'____'))}</p><div class="fa root">${esc(w.persian_meaning)}</div>
    <input type=text id=ans autocomplete=off autocapitalize=off spellcheck=false placeholder="واژه‌ی جاافتاده…"><div id=fb></div></div>`);
    wire();const a=$('#ans');a.focus();
    a.onkeydown=e=>{
      if(e.key!=='Enter'||a.disabled)return;e.stopPropagation();
      const v=a.value.trim().toLowerCase(),ok=v===w.word.toLowerCase()||v===p.m.toLowerCase();ans(w,ok);a.disabled=true;
      $('#fb').innerHTML=`<p class=${ok?'good':'bad'}>${ok?'درست ✓':'پاسخ: <b class=en>'+esc(p.m)+'</b>'}</p><p class=en>${esc(p.e)}</p>${nextBtn}`;wire();
    };
  }
};

// ---------- browse a session ----------
const detail=w=>`<div class=card><b class=en>${esc(w.word)}</b> — <span class=fa>${esc(w.persian_meaning)}</span> ${badge(w)}<div class=root>${esc(w.root)}</div><ul class=en>${w.examples.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`;
function browse(){
  $('#setup').hidden=true;
  const sess=sessList();if(!sess.includes(S.bs))S.bs=sess[0];
  const ws=ALL.filter(w=>w.session===S.bs);
  main(`<div class=bar><button class=sm id=back>← منو</button><span>${ws.length} واژه</span></div>
  <div class=row><label>جلسه <select id=bsel>${sess.map(s=>`<option value="${esc(s)}" ${s===S.bs?'selected':''}>${/\d/.test(s)?num(s):esc(s)}</option>`).join('')}</select></label>
  <button class=sm id=sall>انتخاب همه</button><button class=sm id=snone>پاک‌کردن انتخاب</button></div>
  <div class=chips id=wl>${ws.map(w=>`<label class="${S.sel.has(w.id)?'on':''}" data-id="${esc(w.id)}">${en(w.word)}</label>`).join('')}</div>
  <div id=det></div>`);
  wire();
  const det=()=>{$('#det').innerHTML=ws.filter(w=>S.sel.has(w.id)).map(detail).join('')};
  det();
  $('#bsel').onchange=e=>{S.bs=e.target.value;S.sel=new Set();browse()};
  $('#wl').onclick=e=>{const l=e.target.closest('[data-id]');if(!l)return;const id=l.dataset.id;S.sel.has(id)?S.sel.delete(id):S.sel.add(id);l.classList.toggle('on');det()};
  $('#sall').onclick=()=>{ws.forEach(w=>S.sel.add(w.id));browse()};
  $('#snone').onclick=()=>{S.sel=new Set();browse()};
}

// ---------- search ----------
function search(t){
  t=t.trim().toLowerCase();
  if(!t){main('');return}
  const r=ALL.filter(w=>[w.word,w.persian_meaning,w.root].some(s=>String(s).toLowerCase().includes(t)));
  main(`<p class=info>${r.length} نتیجه${r.length>100?' (۱۰۰ مورد اول)':''}</p>${r.slice(0,100).map(w=>`<div class="card"><b class=en>${esc(w.word)}</b> — <span class=fa>${esc(w.persian_meaning)}</span> ${badge(w)}<br><small class=en>${esc(w.root)}</small><ul class=en>${w.examples.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`).join('')}`);
}
