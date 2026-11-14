const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=s=>+(String(s).match(/\d+/)||[1e9])[0];
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const DAY=864e5, GAP=[0,1,2,4,8,16,32];
let ALL=[], srs=JSON.parse(localStorage.getItem('ety_srs')||'{}');
const S={sessions:new Set(),root:'',dir:'en2fa',mode:'',q:[],i:0,score:0,re:new Set()};
const main=h=>{$('#main').innerHTML=h};

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
fetch('data/all_sessions.json').then(r=>r.json()).then(d=>load(normalize(d)))
  .catch(()=>{$('#load').hidden=false});
$('#files').onchange=async e=>{
  let out=[];for(const f of e.target.files){
    const part=normalize(JSON.parse(await f.text())),m=f.name.match(/\d+/);   // session number = file name
    if(m)part.forEach(w=>w.session='session '+m[0]);out.push(...part);
  }load(out);
};

// ---------- pool / SRS ----------
const pool=()=>ALL.filter(w=>S.sessions.has(w.session)&&(!S.root||w.root===S.root));
const isDue=w=>srs[w.id]&&srs[w.id].due<=Date.now();
function dueList(){
  const p=pool(),seen=shuffle(p.filter(isDue)),fresh=shuffle(p.filter(w=>!srs[w.id])).slice(0,20);
  return seen.concat(fresh);
}
function grade(w,ok){
  const b=ok?Math.min((srs[w.id]?.box||0)+1,6):0;
  srs[w.id]={box:b,due:Date.now()+GAP[b]*DAY};
  localStorage.setItem('ety_srs',JSON.stringify(srs));
  if(ok)S.score++;
  else if(!S.re.has(w.id)){S.re.add(w.id);S.q.push(w)}   // wrong → see it again this round
}
const dirOf=()=>S.dir==='mix'?(Math.random()<.5?'en2fa':'fa2en'):S.dir;

// ---------- menu ----------
function menu(){
  $('#setup').hidden=false;main('');
  const sess=[...new Set(ALL.map(w=>w.session))].sort((a,b)=>num(a)-num(b)||a.localeCompare(b));
  const roots=[...new Set(ALL.map(w=>w.root).filter(Boolean))].sort();
  const n=pool().length,due=pool().filter(isDue).length+Math.min(20,pool().filter(w=>!srs[w.id]).length);
  $('#setup').innerHTML=`
  <div class=row><b>Sessions</b><button data-all=1>All</button><button data-all=0>None</button></div>
  <div class=chips>${sess.map(s=>`<label><input type=checkbox value="${esc(s)}" ${S.sessions.has(s)?'checked':''}> ${/\d/.test(s)?num(s):esc(s)}</label>`).join('')}</div>
  <div class=row><label>Root <select id=root><option value="">All roots</option>${roots.map(r=>`<option ${r===S.root?'selected':''}>${esc(r)}</option>`).join('')}</select></label>
  <label>Direction <select id=dir>${[['en2fa','English → Persian'],['fa2en','Persian → English'],['mix','Mixed']].map(([v,t])=>`<option value=${v} ${v===S.dir?'selected':''}>${t}</option>`).join('')}</select></label></div>
  <p>${n} words selected</p>
  <div class=row>${[['review',`Review (${due})`],['card','Flashcards'],['quiz','Quiz'],['type','Typing'],['cloze','Cloze']].map(([m,t])=>`<button data-m=${m}>${t}</button>`).join('')}</div>
  <div class=row><input type=text id=q placeholder="Search word, meaning or root…"></div>`;
  $('#stat').textContent=`${ALL.length} words`;
}
$('#setup').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.all!=null){S.sessions=new Set(b.dataset.all==='1'?ALL.map(w=>w.session):[]);menu()}
  if(b.dataset.m)go(b.dataset.m);
});
$('#setup').addEventListener('change',e=>{
  if(e.target.type==='checkbox'){e.target.checked?S.sessions.add(e.target.value):S.sessions.delete(e.target.value)}
  if(e.target.id==='root')S.root=e.target.value;
  if(e.target.id==='dir')S.dir=e.target.value;
  const y=scrollY;menu();scrollTo(0,y);
});
$('#setup').addEventListener('input',e=>{if(e.target.id==='q')search(e.target.value)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'){const n=$('#next');if(n)n.click()}});

function go(m){
  S.mode=m;S.re=new Set();S.i=0;S.score=0;
  let q=m==='review'?dueList():shuffle(pool());
  if(m==='cloze')q=q.filter(pick);
  if(!q.length){alert('No words to practice with this selection.');return}
  S.q=q;$('#setup').hidden=true;step();
}
const bar=()=>`<div class=bar><button id=back>← Menu</button><span>${S.i+1}/${S.q.length} · ✓ ${S.score}</span></div>`;
const wire=()=>{$('#back').onclick=menu;const n=$('#next');if(n)n.onclick=()=>{S.i++;step()}};
function step(){
  if(S.i>=S.q.length){main(`<div class=card><h2>Finished</h2><p>${S.score} correct out of ${S.q.length}</p><button id=back>← Menu</button></div>`);wire();return}
  const w=S.q[S.i];V[S.mode==='review'?'card':S.mode](w);
}

// ---------- views ----------
const V={
  card(w){
    const d=dirOf(),fa=d==='fa2en';
    const en=`<div class=big>${esc(w.word)}</div>`,pe=`<div class="big fa">${esc(w.persian_meaning)}</div>`;
    main(`${bar()}<div class=card id=c>${fa?pe:en}<div id=bk hidden>${fa?en:pe}<div class=root>${esc(w.root)}</div><ul>${w.examples.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div></div>
    <div class=row><button id=show>Show answer</button><span id=g hidden><button id=no>Again</button> <button id=yes>Good</button></span></div>`);
    wire();
    const flip=()=>{$('#bk').hidden=false;$('#show').hidden=true;$('#g').hidden=false};
    $('#show').onclick=$('#c').onclick=flip;
    $('#yes').onclick=()=>{grade(w,true);S.i++;step()};
    $('#no').onclick=()=>{grade(w,false);S.i++;step()};
  },
  quiz(w){
    const d=dirOf(),fa=d==='fa2en';
    let ds=shuffle(ALL.filter(x=>w.root&&x.root===w.root&&x.word!==w.word&&x.persian_meaning!==w.persian_meaning)).slice(0,3);
    const fill=f=>{if(ds.length<3)ds=ds.concat(shuffle(ALL.filter(x=>x.word!==w.word&&!ds.includes(x)&&f(x)))).slice(0,3)};
    fill(x=>x.session===w.session);fill(()=>true);
    const os=shuffle([w,...ds]);
    main(`${bar()}<div class=card><div class="big ${fa?'fa':''}">${esc(fa?w.persian_meaning:w.word)}</div><div class=root>${esc(w.root)}</div>
    ${os.map((o,i)=>`<button class="opt ${fa?'':'fa'}" data-i=${i}>${esc(fa?o.word:o.persian_meaning)}</button>`).join('')}</div><div id=nx></div>`);
    wire();
    $$('.opt').forEach(b=>b.onclick=()=>{
      const ok=os[b.dataset.i]===w;grade(w,ok);
      $$('.opt').forEach((x,i)=>{x.disabled=true;if(os[i]===w)x.classList.add('ok')});
      if(!ok)b.classList.add('no');
      $('#nx').innerHTML='<button id=next>Next</button>';wire();
    });
  },
  type(w){
    main(`${bar()}<div class=card><div class="big fa">${esc(w.persian_meaning)}</div><div class=root>${esc(w.root)}</div>
    <input type=text id=ans autocomplete=off autocapitalize=off spellcheck=false placeholder="English word"><div id=fb></div></div>`);
    wire();const a=$('#ans');a.focus();
    a.onkeydown=e=>{
      if(e.key!=='Enter'||a.disabled)return;e.stopPropagation();
      const ok=a.value.trim().toLowerCase()===w.word.toLowerCase();grade(w,ok);a.disabled=true;
      $('#fb').innerHTML=`<p class=${ok?'good':'bad'}>${ok?'Correct ✓':'Answer: <b>'+esc(w.word)+'</b>'}</p><button id=next>Next</button>`;wire();
    };
  },
  cloze(w){
    const p=pick(w),blank=p.e.replace(p.m,'____');
    main(`${bar()}<div class=card><div class=big style="font-size:1.3rem">${esc(blank)}</div><div class="fa root">${esc(w.persian_meaning)}</div>
    <input type=text id=ans autocomplete=off autocapitalize=off spellcheck=false placeholder="Missing word"><div id=fb></div></div>`);
    wire();const a=$('#ans');a.focus();
    a.onkeydown=e=>{
      if(e.key!=='Enter'||a.disabled)return;e.stopPropagation();
      const v=a.value.trim().toLowerCase(),ok=v===w.word.toLowerCase()||v===p.m.toLowerCase();grade(w,ok);a.disabled=true;
      $('#fb').innerHTML=`<p class=${ok?'good':'bad'}>${ok?'Correct ✓':'Answer: <b>'+esc(p.m)+'</b>'}</p><p>${esc(p.e)}</p><button id=next>Next</button>`;wire();
    };
  }
};
function pick(w){   // choose an example sentence that contains the word
  const re=new RegExp('\\b'+w.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
  const c=w.examples.map(e=>({e,m:e.match(re)})).filter(x=>x.m);
  if(!c.length)return null;const x=c[Math.random()*c.length|0];return{e:x.e,m:x.m[0]};
}

// ---------- search ----------
function search(t){
  t=t.trim().toLowerCase();
  if(!t){main('');return}
  const r=ALL.filter(w=>[w.word,w.persian_meaning,w.root].some(s=>String(s).toLowerCase().includes(t)));
  main(`<div><p>${r.length} result(s)${r.length>100?' (showing 100)':''}</p>${r.slice(0,100).map(w=>`<div class=res><b>${esc(w.word)}</b> — <span class=fa>${esc(w.persian_meaning)}</span><br><small>${esc(w.root)} · session ${/\d/.test(w.session)?num(w.session):esc(w.session)}</small><ul>${w.examples.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`).join('')}</div>`);
}
