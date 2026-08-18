(()=>{'use strict';

const SUPABASE_URL='https://trbwwaxabicopymadeya.supabase.co';
const SUPABASE_KEY='sb_publishable_JipFPrFQcJ6q82X1KDw74w_gNfZaCvA';
const REDIRECT_URL='https://mgroombridge.github.io/mkg-cv-builder/';
const LOCAL_KEY='mkg-cv-builder-v1';
const CURRENT_CV_KEY='mkg-cv-builder-current-cv-id';
const SAVE_MODE_KEY='mkg-cv-builder-save-mode';

const steps=[
  ['personal','Personal details','Start with the essentials employers need to contact you.'],
  ['profile','Professional profile','Write a short introduction that explains the value you bring.'],
  ['work','Work history','Add your most relevant roles and focus on results, responsibilities and impact.'],
  ['skills','Skills','Add the strengths and practical skills most relevant to the jobs you want.'],
  ['education','Education','Keep education concise and relevant.'],
  ['certificates','Certificates & licences','Include professional certificates, licences and accreditations.'],
  ['projects','Projects & achievements','Show projects and achievements that strengthen your application.']
];

const $=id=>document.getElementById(id);
const app=$('app');
const sb=window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
  : null;

const blank=()=>({
  personal:{name:'',title:'',email:'',phone:'',location:'',linkedin:'',website:''},
  profile:'',writingHelp:'suggest',writingStyle:'professional',
  work:[{role:'',company:'',location:'',start:'',end:'',bullets:''}],
  skills:'',
  education:[{qualification:'',institution:'',location:'',start:'',end:'',details:''}],
  certificates:[{name:'',issuer:'',date:'',expiry:''}],
  projects:[{name:'',subtitle:'',date:'',details:''}]
});

const sample=()=>({
  personal:{
    name:'Jordan Taylor',title:'Operations Coordinator',email:'jordan.taylor@example.com',phone:'07123 456789',
    location:'Manchester, UK',linkedin:'linkedin.com/in/jordan-taylor-sample',website:'jordantaylor.example.com'
  },
  profile:'Organised operations professional with experience coordinating teams, improving day-to-day processes and supporting customer-focused service delivery. Confident using Microsoft 365, reporting tools and clear communication to keep work moving, reduce errors and support consistent results.',
  writingHelp:'suggest',writingStyle:'professional',
  work:[
    {role:'Operations Coordinator',company:'Brightline Services',location:'Manchester',start:'Jan 2024',end:'Present',bullets:'Coordinated daily work schedules for a 25-person operations team\nImproved handover notes and reduced repeat queries between shifts\nTracked actions, risks and updates for weekly management reviews'},
    {role:'Team Administrator',company:'Northbridge Facilities',location:'Leeds',start:'Mar 2021',end:'Dec 2023',bullets:'Maintained accurate records across staff, suppliers and site activity\nPrepared reports for managers using Excel and Microsoft 365\nSupported onboarding, document checks and process updates'}
  ],
  skills:'Operations coordination\nMicrosoft 365\nProcess improvement\nStakeholder communication\nDocument control\nReporting\nTeam scheduling\nCustomer service',
  education:[{qualification:'Level 3 Diploma in Business Administration',institution:'City Skills College',location:'Leeds',start:'2019',end:'2020',details:'Focused on business communication, administration systems and workplace organisation.'}],
  certificates:[
    {name:'Microsoft Office Specialist: Excel Associate',issuer:'Microsoft',date:'2024',expiry:''},
    {name:'First Aid at Work',issuer:'SafeWork Training',date:'2023',expiry:'2026'}
  ],
  projects:[
    {name:'Shift handover improvement',subtitle:'Brightline Services',date:'2025',details:'Created a clearer handover process that helped supervisors spot urgent actions, reduce missed updates and improve team consistency.'},
    {name:'Supplier tracker redesign',subtitle:'Northbridge Facilities',date:'2023',details:'Rebuilt a simple spreadsheet tracker to make outstanding supplier actions easier to see and follow up.'}
  ]
});

let cv=loadLocal();
let step=0;
let page='builder';
let user=null;
let profile=null;
let cvs=[];
let versions=[];
let currentCvId=localStorage.getItem(CURRENT_CV_KEY)||null;
let currentCvTitle=null;
let saveMode=localStorage.getItem(SAVE_MODE_KEY)||'';
let saveTimer=null;
let lastVersionKey='';
let busy=false;
let pendingSaveDetail=null;

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function arr(a,b){return Array.isArray(a)&&a.length?a:b}
function merge(saved){const b=blank();return {...b,...saved,personal:{...b.personal,...(saved?.personal||{})},work:arr(saved?.work,b.work),education:arr(saved?.education,b.education),certificates:arr(saved?.certificates,b.certificates),projects:arr(saved?.projects,b.projects)}}
function loadLocal(){try{return merge(JSON.parse(localStorage.getItem(LOCAL_KEY)||'null')||{})}catch{return blank()}}
function lines(v){return String(v||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean)}
function any(o,keys){return keys.some(k=>String(o?.[k]||'').trim())}
function dates(a,b){return [a,b].filter(Boolean).join(' – ')}
function hasCvData(data=cv){return any(data.personal,['name','title','email','phone','location','linkedin','website'])||String(data.profile||'').trim()||String(data.skills||'').trim()||['work','education','certificates','projects'].some(g=>(data[g]||[]).some(row=>Object.values(row||{}).some(v=>String(v||'').trim())))}
function suggestedTitle(){return cv.personal.name?`${cv.personal.name} CV`:'Untitled CV'}
function fmt(d){if(!d)return 'Not saved';try{return new Date(d).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}catch{return d}}
function toast(message){const el=$('toast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600)}
function setStatus(message,error=false){const el=$('saveStatus');if(!el)return;el.textContent=message;el.classList.toggle('error',error)}
function localSave(){localStorage.setItem(LOCAL_KEY,JSON.stringify(cv));setStatus(user&&saveMode==='account'?'Saved locally + account':'Saved locally')}
function profileCompletion(){if(!profile)return 0;const keys=['full_name','email','phone','location','career_goals','target_roles'];return Math.round(keys.filter(k=>String(profile[k]||'').trim()).length/keys.length*100)}

async function init(){
  wireGlobal();
  if(sb){
    const {data}=await sb.auth.getSession();
    user=data.session?.user||null;
    if(user)await loadAccountContext();
    sb.auth.onAuthStateChange((_event,session)=>{
      setTimeout(async()=>{
        user=session?.user||null;
        if(user)await loadAccountContext();
        else clearAccountContext();
        render();
      },0);
    });
  }
  render();
}

function wireGlobal(){
  document.querySelectorAll('.nav-pill').forEach(btn=>{
    btn.onclick=()=>{
      if(btn.classList.contains('disabled'))return toast('Cover letter builder is planned for a later stage');
      page=btn.dataset.page;
      render();
    };
  });
  $('accountBtn').onclick=()=>user?signOut():$('accountDialog').showModal();
  $('signInBtn').onclick=()=>authenticate('signin');
  $('signUpBtn').onclick=()=>authenticate('signup');
  $('resetBtn').onclick=()=>confirmBox('Start again?','This clears the CV currently open on this device. Saved account CVs are not deleted.',()=>resetCurrentCv());
}

function updateHeader(){
  document.querySelectorAll('.nav-pill').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  $('accountBtn').textContent=user?'Sign out':'Sign in';
  if(user)setStatus(saveMode==='account'?'Account + local fallback':'Local save');
  else setStatus('Saved locally');
}

async function authenticate(mode){
  if(!sb)return toast('Supabase could not be loaded');
  const email=$('authEmail').value.trim();
  const password=$('authPassword').value;
  if(!email||!password)return toast('Enter your email and password');
  if(password.length<6)return toast('Password must be at least 6 characters');
  busy=true;
  const result=mode==='signup'
    ? await sb.auth.signUp({email,password,options:{emailRedirectTo:REDIRECT_URL}})
    : await sb.auth.signInWithPassword({email,password});
  busy=false;
  if(result.error)return toast(result.error.message);
  $('accountDialog').close();
  if(mode==='signup')toast(result.data.session?'Account created and signed in':'Account created. Check your email to confirm it.');
  else toast('Signed in');
}

async function signOut(){
  localSave();
  if(sb)await sb.auth.signOut();
  clearAccountContext();
  toast('Signed out. Local save is still available.');
  render();
}

function clearAccountContext(){
  user=null;profile=null;cvs=[];versions=[];currentCvId=null;currentCvTitle=null;lastVersionKey='';saveMode='';
  localStorage.removeItem(CURRENT_CV_KEY);localStorage.removeItem(SAVE_MODE_KEY);
}

async function loadAccountContext(){
  await ensureProfile();
  await loadCvs();
  if(currentCvId){
    const found=cvs.find(c=>c.id===currentCvId);
    if(found){
      cv=merge(found.data||{});
      currentCvTitle=found.title||suggestedTitle();
      saveMode='account';
      localStorage.setItem(SAVE_MODE_KEY,'account');
      lastVersionKey=versionKey();
      localSave();
    }else{
      currentCvId=null;currentCvTitle=null;lastVersionKey='';localStorage.removeItem(CURRENT_CV_KEY);
    }
  }
}

async function ensureProfile(){
  const {data,error}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
  if(error){toast('Profile load failed: '+error.message);return}
  if(data){profile=data;return}
  const payload={id:user.id,email:user.email||'',full_name:'',phone:'',location:'',career_goals:'',target_roles:'',default_cv_details:{}};
  const created=await sb.from('profiles').insert(payload).select().single();
  if(created.error)toast('Profile setup failed: '+created.error.message); else profile=created.data;
}

async function loadCvs(){
  if(!user)return;
  const {data,error}=await sb.from('cvs').select('*').order('updated_at',{ascending:false});
  if(error)return toast('CV list failed: '+error.message);
  cvs=data||[];
}

async function loadVersions(cvId){
  if(!user)return;
  const {data,error}=await sb.from('cv_versions').select('*').eq('cv_id',cvId).order('created_at',{ascending:false});
  if(error)return toast('Version history failed: '+error.message);
  versions=data||[];
}

function render(){
  updateHeader();
  if(page==='dashboard')return renderDashboard();
  if(page==='profile')return renderProfile();
  if(page==='jobs')return renderJobs();
  return renderBuilder();
}

function renderBuilder(){
  app.innerHTML=`
    <div id="migrationBox"></div>
    <section class="builder-topbar">
      <div>
        <span class="eyebrow">CV workspace</span>
        <strong>${esc(currentCvTitle||suggestedTitle())}</strong>
        <small>${user?(saveMode==='account'?'Saving to your account with local fallback':'Currently saved locally'):'Local save only — sign in for account saves'}</small>
      </div>
      <div class="builder-actions">
        <button id="sampleBtn" class="btn btn-secondary" type="button">Autofill Test Data</button>
        ${user&&saveMode!=='account'?'<button id="saveAccountBtn" class="btn btn-primary" type="button">Save to account</button>':''}
      </div>
    </section>
    <section class="workspace has-topbar">
      <aside class="step-nav" aria-label="CV sections">
        <div class="progress-wrap">
          <div class="progress-copy"><span>CV progress</span><strong id="progressText">${step+1} of ${steps.length}</strong></div>
          <div class="progress-track"><div id="progressBar"></div></div>
        </div>
        <nav id="stepList"></nav>
        <div class="nav-tip"><strong>Tip</strong><p>Keep your CV clear, relevant and easy to scan. Aim for evidence rather than long paragraphs.</p></div>
      </aside>
      <div class="editor-pane">
        <div class="editor-toolbar">
          <div><span class="eyebrow" id="stepEyebrow"></span><h1 id="stepTitle"></h1><p id="stepIntro"></p></div>
          <button id="mobilePreviewBtn" class="btn btn-secondary mobile-only" type="button">Preview CV</button>
        </div>
        <form id="cvForm" autocomplete="on"><div id="stepContent"></div></form>
        <div class="editor-footer">
          <button id="backBtn" class="btn btn-secondary" type="button">Back</button>
          <div class="footer-actions"><button id="saveBtn" class="btn btn-ghost" type="button">Save</button><button id="nextBtn" class="btn btn-primary" type="button">Next</button></div>
        </div>
      </div>
      <aside class="preview-pane" id="previewPane" aria-label="CV preview">
        <div class="preview-toolbar"><div><strong>Live preview</strong><small>Modern · clean · ATS-friendly</small></div><button id="closePreviewBtn" class="icon-btn mobile-only" type="button">×</button></div>
        <div class="preview-scroller"><article id="cvPreview" class="cv-page"></article></div>
        <div class="export-bar"><button id="wordBtn" class="btn btn-secondary" type="button">Export Word</button><button id="pdfBtn" class="btn btn-primary" type="button">Export PDF</button></div>
      </aside>
    </section>`;

  renderMigrationPrompt();
  renderStep();
  drawPreview();
  $('sampleBtn').onclick=()=>confirmBox('Autofill Test Data?','This replaces the CV currently open with safe sample data. If an account CV is open, that saved CV will stay untouched and the sample starts as a new CV.',()=>loadSampleCv());
  if($('saveAccountBtn'))$('saveAccountBtn').onclick=async()=>{saveMode='account';localStorage.setItem(SAVE_MODE_KEY,'account');await saveAccount('Saved local CV to account');render();toast('CV saved to your account. Local copy kept.');};
  $('mobilePreviewBtn').onclick=()=>$('previewPane').classList.add('open');
  $('closePreviewBtn').onclick=()=>$('previewPane').classList.remove('open');
  $('wordBtn').onclick=exportWord;
  $('pdfBtn').onclick=exportPdf;
  $('saveBtn').onclick=async()=>{await saveAll('Manual save');toast(user&&saveMode==='account'?'CV saved to account and locally':'CV saved on this device')};
  $('backBtn').onclick=()=>goStep(step-1);
  $('nextBtn').onclick=()=>step<steps.length-1?goStep(step+1):(saveAll('Finished CV review'),$('previewPane').classList.add('open'),toast('CV ready to review and export'));
}

function renderMigrationPrompt(){
  const box=$('migrationBox');
  if(!box)return;
  if(user&&!currentCvId&&hasCvData(cv)&&!saveMode){
    box.innerHTML=`<div class="banner"><div><strong>Local CV found</strong><p>You already have CV information saved on this device. Copy it into your account? Your local copy will not be deleted.</p></div><div class="banner-actions"><button id="keepLocalBtn" class="btn btn-secondary" type="button">Keep local only</button><button id="migrateBtn" class="btn btn-primary" type="button">Move to account</button></div></div>`;
    $('keepLocalBtn').onclick=()=>{saveMode='local';localStorage.setItem(SAVE_MODE_KEY,'local');renderBuilder();toast('This CV will stay local unless you choose Save to account')};
    $('migrateBtn').onclick=async()=>{saveMode='account';localStorage.setItem(SAVE_MODE_KEY,'account');await saveAccount('Migrated local CV into account');render();toast('Local CV copied into your account. Local copy kept.');};
  }
}

function loadSampleCv(){
  currentCvId=null;currentCvTitle='Sample Test CV';lastVersionKey='';localStorage.removeItem(CURRENT_CV_KEY);
  cv=sample();
  saveMode=user?'account':'local';
  localStorage.setItem(SAVE_MODE_KEY,saveMode);
  localSave();step=0;renderBuilder();toast('Sample test CV loaded');
}

function resetCurrentCv(){
  cv=blank();step=0;currentCvId=null;currentCvTitle=null;lastVersionKey='';localStorage.removeItem(CURRENT_CV_KEY);
  saveMode=user?'account':'local';localStorage.setItem(SAVE_MODE_KEY,saveMode);localSave();render();toast('Current CV cleared');
}

function goStep(i){if(i<0||i>=steps.length)return;step=i;renderStep();document.querySelector('.editor-pane')?.scrollTo?.({top:0,behavior:'smooth'})}

function renderStep(){
  const [id,title,intro]=steps[step];
  $('stepEyebrow').textContent=`Step ${step+1} of ${steps.length}`;
  $('stepTitle').textContent=title;
  $('stepIntro').textContent=intro;
  $('progressText').textContent=`${step+1} of ${steps.length}`;
  $('progressBar').style.width=`${((step+1)/steps.length)*100}%`;
  $('backBtn').disabled=step===0;
  $('nextBtn').textContent=step===steps.length-1?'Finish':'Next';
  $('stepContent').innerHTML=forms[id]();
  const nav=$('stepList');
  nav.innerHTML=steps.map((x,i)=>`<button class="step-button ${i===step?'active':''}" type="button" data-step="${i}"><span class="step-number">${i+1}</span><span class="step-label">${esc(x[1])}</span></button>`).join('');
  nav.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>goStep(Number(b.dataset.step)));
  bindForm();
}

const personalInput=(label,key,val,ph='',full='')=>`<div class="field ${full}"><label>${label}</label><input data-personal="${key}" value="${esc(val)}" placeholder="${esc(ph)}"></div>`;
const repeatInput=(label,group,i,key,val,ph='')=>`<div class="field"><label>${label}</label><input data-repeat="${group}" data-i="${i}" data-k="${key}" value="${esc(val)}" placeholder="${esc(ph)}"></div>`;
const repeatHeader=(title,group,i,len)=>`<div class="repeat-card-header"><strong>${title}</strong><div class="repeat-actions"><button class="small-btn" type="button" data-move="up" data-g="${group}" data-i="${i}" ${i===0?'disabled':''}>↑</button><button class="small-btn" type="button" data-move="down" data-g="${group}" data-i="${i}" ${i===len-1?'disabled':''}>↓</button><button class="small-btn remove" type="button" data-remove="${group}" data-i="${i}">×</button></div></div>`;
function repeatBlock(tip,html,group,label){return `<div class="section-help"><strong>Tip.</strong> ${tip}</div><div class="repeat-list">${html}</div><button class="btn btn-secondary add-btn" type="button" data-add="${group}">${label}</button>`}

const forms={
  personal(){const p=cv.personal;return `<div class="section-help"><strong>Keep it professional.</strong> You do not need age, marital status or a photo for a standard UK CV.</div><div class="form-grid">${personalInput('Full name','name',p.name,'Alex Morgan')}${personalInput('Professional title','title',p.title,'Project Coordinator')}${personalInput('Email','email',p.email,'alex@example.com')}${personalInput('Phone','phone',p.phone,'07123 456789')}${personalInput('Location','location',p.location,'London, UK')}${personalInput('LinkedIn','linkedin',p.linkedin,'linkedin.com/in/alexmorgan')}${personalInput('Website / portfolio','website',p.website,'alexmorgan.co.uk','full')}</div>`},
  profile(){return `<div class="section-help"><strong>Strong profile formula:</strong> who you are + your strongest experience + the value you offer.</div><div class="form-grid"><div class="field"><label>Writing help preference</label><select data-simple="writingHelp"><option value="suggest">Suggest polished wording</option><option value="rewrite">Rewrite my rough notes</option><option value="bullets">Create bullet points from job titles</option><option value="manual">I will write it myself</option></select><span class="hint">AI wording actions are planned for a later stage.</span></div><div class="field"><label>Wording style</label><select data-simple="writingStyle"><option value="professional">Professional and balanced</option><option value="concise">Concise and direct</option><option value="achievement">Achievement-focused</option><option value="friendly">Warm and approachable</option></select></div><div class="field full"><label>Professional profile</label><textarea data-simple="profile" maxlength="650" placeholder="Experienced operations professional with a strong record of coordinating teams...">${esc(cv.profile)}</textarea><div class="char-count">${cv.profile.length}/650</div></div></div>`},
  work(){return repeatBlock('Make each role evidence-led. Put the newest role first.',cv.work.map((x,i)=>`<div class="repeat-card">${repeatHeader('Role '+(i+1),'work',i,cv.work.length)}<div class="form-grid">${repeatInput('Job title','work',i,'role',x.role,'Operations Coordinator')}${repeatInput('Employer','work',i,'company',x.company,'Example Company')}${repeatInput('Location','work',i,'location',x.location,'London')}${repeatInput('Start date','work',i,'start',x.start,'Jan 2023')}${repeatInput('End date','work',i,'end',x.end,'Present')}<div class="field full"><label>Highlights</label><textarea class="compact" data-repeat="work" data-i="${i}" data-k="bullets" placeholder="Led a team of...&#10;Reduced processing time by...">${esc(x.bullets)}</textarea><span class="hint">Use a new line for each bullet point.</span></div></div></div>`).join(''),'work','+ Add another role')},
  skills(){return `<div class="section-help"><strong>Prioritise relevance.</strong> Add practical, technical and people skills.</div><div class="field"><label>Skills</label><textarea data-simple="skills" placeholder="Project coordination&#10;Stakeholder management&#10;Microsoft 365">${esc(cv.skills)}</textarea><span class="hint">Enter one skill per line. Commas also work.</span></div>`},
  education(){return repeatBlock('Include qualification, institution and dates.',cv.education.map((x,i)=>`<div class="repeat-card">${repeatHeader('Education '+(i+1),'education',i,cv.education.length)}<div class="form-grid">${repeatInput('Qualification','education',i,'qualification',x.qualification,'BSc Business Management')}${repeatInput('Institution','education',i,'institution',x.institution,'Example University')}${repeatInput('Location','education',i,'location',x.location,'London')}${repeatInput('Start date','education',i,'start',x.start,'Sep 2018')}${repeatInput('End date','education',i,'end',x.end,'Jun 2021')}<div class="field full"><label>Details</label><textarea class="compact" data-repeat="education" data-i="${i}" data-k="details">${esc(x.details)}</textarea></div></div></div>`).join(''),'education','+ Add education')},
  certificates(){return repeatBlock('Include active, relevant credentials first.',cv.certificates.map((x,i)=>`<div class="repeat-card">${repeatHeader('Credential '+(i+1),'certificates',i,cv.certificates.length)}<div class="form-grid">${repeatInput('Certificate / licence','certificates',i,'name',x.name,'PRINCE2 Foundation')}${repeatInput('Issuer','certificates',i,'issuer',x.issuer,'PeopleCert')}${repeatInput('Awarded','certificates',i,'date',x.date,'Mar 2025')}${repeatInput('Expiry','certificates',i,'expiry',x.expiry,'Mar 2028')}</div></div>`).join(''),'certificates','+ Add certificate or licence')},
  projects(){return repeatBlock('Add projects, awards, improvements or achievements.',cv.projects.map((x,i)=>`<div class="repeat-card">${repeatHeader('Item '+(i+1),'projects',i,cv.projects.length)}<div class="form-grid">${repeatInput('Project / achievement','projects',i,'name',x.name,'Warehouse process redesign')}${repeatInput('Organisation / context','projects',i,'subtitle',x.subtitle,'Example Company')}${repeatInput('Date','projects',i,'date',x.date,'2026')}<div></div><div class="field full"><label>What you achieved</label><textarea class="compact" data-repeat="projects" data-i="${i}" data-k="details">${esc(x.details)}</textarea></div></div></div>`).join(''),'projects','+ Add project or achievement')}
};

function bindForm(){
  document.querySelectorAll('[data-personal]').forEach(el=>el.oninput=()=>{cv.personal[el.dataset.personal]=el.value;changed(`Edited personal details: ${el.dataset.personal}`)});
  document.querySelectorAll('[data-simple]').forEach(el=>{el.value=cv[el.dataset.simple]||el.value;el.oninput=el.onchange=()=>{cv[el.dataset.simple]=el.value;changed(`Edited ${el.dataset.simple}`);if(el.tagName==='SELECT')renderStep()}});
  document.querySelectorAll('[data-repeat]').forEach(el=>el.oninput=()=>{cv[el.dataset.repeat][Number(el.dataset.i)][el.dataset.k]=el.value;changed(`Edited ${el.dataset.repeat}: ${el.dataset.k}`)});
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addRow(b.dataset.add));
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeRow(b.dataset.remove,Number(b.dataset.i)));
  document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>moveRow(b.dataset.g,Number(b.dataset.i),b.dataset.move));
}

function addRow(group){
  const templates={work:{role:'',company:'',location:'',start:'',end:'',bullets:''},education:{qualification:'',institution:'',location:'',start:'',end:'',details:''},certificates:{name:'',issuer:'',date:'',expiry:''},projects:{name:'',subtitle:'',date:'',details:''}};
  cv[group].push({...templates[group]});changed(`Added ${group} item`);renderStep();
}
function removeRow(group,i){if(cv[group].length===1)Object.keys(cv[group][0]).forEach(k=>cv[group][0][k]='');else cv[group].splice(i,1);changed(`Removed ${group} item`);renderStep()}
function moveRow(group,i,direction){const j=direction==='up'?i-1:i+1;if(j<0||j>=cv[group].length)return;[cv[group][i],cv[group][j]]=[cv[group][j],cv[group][i]];changed(`Reordered ${group}`);renderStep()}

function changed(detail='Edited CV'){
  localSave();drawPreview();clearTimeout(saveTimer);
  if(user&&saveMode==='account'){
    setStatus('Saving…');
    saveTimer=setTimeout(()=>saveAccount(detail),850);
  }
}

async function saveAll(detail='Saved CV'){
  localSave();
  if(user&&saveMode==='account')await saveAccount(detail);
}

function versionKey(){return currentCvId+':'+JSON.stringify(cv)}
async function saveAccount(detail='Edited CV'){
  if(!user)return;
  if(busy){pendingSaveDetail=detail;return}
  busy=true;
  const snapshot=JSON.parse(JSON.stringify(cv));
  const title=currentCvTitle||(snapshot.personal?.name?`${snapshot.personal.name} CV`:'Untitled CV');
  const payload={user_id:user.id,title,data:snapshot};
  let result;
  if(currentCvId)result=await sb.from('cvs').update(payload).eq('id',currentCvId).select().single();
  else result=await sb.from('cvs').insert(payload).select().single();
  if(result.error){busy=false;setStatus('Account save failed',true);toast(result.error.message);return}
  currentCvId=result.data.id;currentCvTitle=result.data.title||title;saveMode='account';
  localStorage.setItem(CURRENT_CV_KEY,currentCvId);localStorage.setItem(SAVE_MODE_KEY,'account');
  const key=currentCvId+':'+JSON.stringify(snapshot);
  if(key!==lastVersionKey){
    const vr=await sb.from('cv_versions').insert({cv_id:currentCvId,user_id:user.id,change_details:detail,data:snapshot});
    if(vr.error)toast('CV saved, but history entry failed: '+vr.error.message); else lastVersionKey=key;
  }
  await loadCvs();localSave();setStatus('Saved to account + locally');busy=false;
  if(pendingSaveDetail){const next=pendingSaveDetail;pendingSaveDetail=null;setTimeout(()=>saveAccount(next),0)}
}

function section(title,html){return `<section class="cv-section"><h2 class="cv-section-title">${title}</h2>${html}</section>`}
function entry(title,sub,meta,bullets=[],detail=''){return `<div class="cv-entry"><div class="cv-entry-head"><span class="cv-entry-title">${esc(title)}</span><span class="cv-entry-meta">${esc(meta)}</span></div>${sub?`<p class="cv-entry-sub">${esc(sub)}</p>`:''}${bullets.length?`<ul>${bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`:''}${detail?`<p class="cv-entry-detail">${esc(detail)}</p>`:''}</div>`}
function cvHtml(){
  const p=cv.personal;const contact=[p.email,p.phone,p.location,p.linkedin,p.website].filter(Boolean);
  const work=cv.work.filter(x=>any(x,['role','company','bullets']));const edu=cv.education.filter(x=>any(x,['qualification','institution','details']));const cert=cv.certificates.filter(x=>any(x,['name','issuer']));const proj=cv.projects.filter(x=>any(x,['name','subtitle','details']));const skills=lines(cv.skills);
  return `<header class="cv-head"><h1 class="cv-name">${esc(p.name||'Your Name')}</h1><p class="cv-title">${esc(p.title||'Professional Title')}</p><div class="cv-contact">${contact.length?contact.map(c=>`<span>${esc(c)}</span>`).join(''):'<span class="cv-placeholder">email · phone · location · LinkedIn</span>'}</div></header>${section('Professional profile',cv.profile?`<p>${esc(cv.profile)}</p>`:'<p class="cv-placeholder">Your professional profile will appear here.</p>')}${section('Work experience',work.length?work.map(x=>entry(x.role||'Job title',[x.company,x.location].filter(Boolean).join(' · '),dates(x.start,x.end),lines(x.bullets))).join(''):'<p class="cv-placeholder">Your work history will appear here.</p>')}${section('Skills',skills.length?`<div class="cv-skills">${skills.map(x=>`<span class="cv-skill">${esc(x)}</span>`).join('')}</div>`:'<p class="cv-placeholder">Your key skills will appear here.</p>')}${edu.length?section('Education',edu.map(x=>entry(x.qualification||'Qualification',[x.institution,x.location].filter(Boolean).join(' · '),dates(x.start,x.end),[],x.details)).join('')):''}${cert.length?section('Certificates & licences',cert.map(x=>entry(x.name||'Certificate',x.issuer,[x.date,x.expiry?`Expiry: ${x.expiry}`:''].filter(Boolean).join(' · '))).join('')):''}${proj.length?section('Projects & achievements',proj.map(x=>entry(x.name||'Project or achievement',x.subtitle,x.date,[],x.details)).join('')):''}`;
}
function drawPreview(){const el=$('cvPreview');if(el)el.innerHTML=cvHtml()}
function exportPdf(){localSave();toast('Opening print view — choose Save as PDF');setTimeout(()=>window.print(),120)}
function exportWord(){
  localSave();
  const css='body{font-family:Arial,sans-serif;font-size:10pt;color:#242424}h1{color:#183b5b}.cv-head{border-bottom:2px solid #245b8f}.cv-section-title{color:#245b8f;text-transform:uppercase;font-size:9pt}.cv-placeholder{display:none}';
  const blob=new Blob(['\ufeff',`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${cvHtml()}</body></html>`],{type:'application/msword;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=((cv.personal.name||'My CV').replace(/[^a-z0-9\-_ ]/gi,'')||'My CV')+' - CV.doc';document.body.appendChild(a);a.click();URL.revokeObjectURL(a.href);a.remove();toast('Word-compatible CV downloaded');
}

async function renderDashboard(){
  app.innerHTML=`<section class="page-wrap"><div class="page-head"><div><span class="eyebrow">Account dashboard</span><h1>Saved CVs</h1><p>${user?'Open saved CVs, review changes and manage your account documents.':'Sign in to save CVs to your account and use version history.'}</p></div><div class="head-actions"><button id="newCvBtn" class="btn btn-secondary" type="button">New CV</button>${user?'<button id="sampleAccountBtn" class="btn btn-primary" type="button">Create Sample Account Data</button>':''}</div></div><div id="dashboardContent"></div></section>`;
  $('newCvBtn').onclick=()=>newCv();
  if($('sampleAccountBtn'))$('sampleAccountBtn').onclick=()=>confirmBox('Create Sample Account Data?','This adds two clearly labelled sample CVs to your account for dashboard and history testing.',createSampleAccountData);
  if(!user){$('dashboardContent').innerHTML=signInCard();$('dashboardSignInBtn').onclick=()=>$('accountDialog').showModal();return}
  await loadCvs();
  const recent=await getRecentVersions();
  $('dashboardContent').innerHTML=`<div class="dashboard-grid">
    <section class="card span2"><div class="card-head"><div><h2>Your CVs</h2><p class="muted">${cvs.length} saved CV${cvs.length===1?'':'s'}</p></div></div>${cvs.length?`<div class="cv-list">${cvs.map(c=>`<article class="cv-row"><div class="cv-row-main"><strong>${esc(c.title||'Untitled CV')}</strong><small>Updated ${fmt(c.updated_at)}</small></div><div class="row-actions"><button class="btn btn-primary" data-open="${c.id}">Open</button><button class="btn btn-secondary" data-history="${c.id}">History</button><button class="btn btn-ghost" data-rename="${c.id}">Rename</button><button class="btn btn-danger" data-delete="${c.id}">Delete</button></div></article>`).join('')}</div>`:'<div class="empty-state"><strong>No account CVs yet</strong><p>Create a CV in the builder or add sample account data for testing.</p></div>'}</section>
    <section class="card"><h2>Recent activity</h2>${recent.length?recent.slice(0,6).map(v=>`<div class="activity"><strong>${esc(v.change_details||'CV edit')}</strong><span>${fmt(v.created_at)}</span></div>`).join(''):'<p class="muted">No account edits recorded yet.</p>'}</section>
    <section class="card"><h2>Profile</h2><p><strong>${profileCompletion()}% complete</strong></p><div class="progress-track"><div style="width:${profileCompletion()}%"></div></div><p class="muted">Complete your defaults once and reuse them in CVs.</p><button id="profileNextBtn" class="btn btn-secondary" type="button">Update profile</button></section>
    <section class="card span2" id="historyPanel"><h2>Version history</h2><p class="muted">Choose History on a CV to view and restore earlier saved edits.</p></section>
  </div>`;
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openCv(b.dataset.open));
  document.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>showHistory(b.dataset.history));
  document.querySelectorAll('[data-rename]').forEach(b=>b.onclick=()=>renameCv(b.dataset.rename));
  document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteCv(b.dataset.delete));
  $('profileNextBtn').onclick=()=>{page='profile';render()};
}

function signInCard(){return `<section class="card sign-in-card"><h2>Sign in needed</h2><p class="muted">The builder still saves locally when you are signed out. Sign in to use cloud CVs, dashboard saves and version history.</p><button id="dashboardSignInBtn" class="btn btn-primary" type="button">Sign in or create account</button></section>`}
async function getRecentVersions(){const {data}=await sb.from('cv_versions').select('id,cv_id,change_details,created_at').order('created_at',{ascending:false}).limit(10);return data||[]}

function newCv(){
  currentCvId=null;currentCvTitle=null;lastVersionKey='';localStorage.removeItem(CURRENT_CV_KEY);cv=blank();step=0;saveMode=user?'account':'local';localStorage.setItem(SAVE_MODE_KEY,saveMode);localSave();page='builder';render();toast('New CV ready');
}
async function openCv(id){
  const item=cvs.find(c=>c.id===id);if(!item)return;
  cv=merge(item.data||{});currentCvId=item.id;currentCvTitle=item.title;saveMode='account';lastVersionKey=versionKey();localStorage.setItem(CURRENT_CV_KEY,item.id);localStorage.setItem(SAVE_MODE_KEY,'account');localSave();step=0;page='builder';render();toast('CV opened');
}
async function showHistory(id){
  await loadVersions(id);const item=cvs.find(c=>c.id===id);const panel=$('historyPanel');if(!panel)return;
  panel.innerHTML=`<div class="card-head"><div><h2>Version history</h2><p class="muted">${esc(item?.title||'CV')}</p></div><span class="history-count">${versions.length} version${versions.length===1?'':'s'}</span></div>${versions.length?`<div class="history-list">${versions.map(v=>`<article class="history-row"><div><strong>${esc(v.change_details||'Edit')}</strong><small>${fmt(v.created_at)}</small></div><button class="btn btn-secondary" data-restore="${v.id}" type="button">Restore</button></article>`).join('')}</div>`:'<p class="muted">No versions recorded yet.</p>'}`;
  panel.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>restoreVersion(b.dataset.restore));
}
async function restoreVersion(id){
  const v=versions.find(x=>x.id===id);if(!v)return;
  confirmBox('Restore this version?','The earlier snapshot will become the current CV and a new restore version will be recorded.',async()=>{
    cv=merge(v.data||{});currentCvId=v.cv_id;currentCvTitle=cvs.find(c=>c.id===v.cv_id)?.title||suggestedTitle();saveMode='account';lastVersionKey='';localStorage.setItem(CURRENT_CV_KEY,currentCvId);localStorage.setItem(SAVE_MODE_KEY,'account');localSave();await saveAccount('Restored earlier version');page='builder';render();toast('Version restored');
  });
}
async function renameCv(id){
  const item=cvs.find(c=>c.id===id);const title=window.prompt('New CV name',item?.title||'Untitled CV');if(!title||title===item?.title)return;
  const r=await sb.from('cvs').update({title}).eq('id',id);if(r.error)return toast(r.error.message);
  await sb.from('cv_versions').insert({cv_id:id,user_id:user.id,change_details:`Renamed CV to ${title}`,data:item?.data||{}});
  if(currentCvId===id)currentCvTitle=title;await loadCvs();renderDashboard();toast('CV renamed');
}
async function deleteCv(id){
  const item=cvs.find(c=>c.id===id);confirmBox('Delete this CV?',`Delete “${item?.title||'this CV'}” and its version history from your account? The local device copy is not automatically deleted.`,async()=>{
    const r=await sb.from('cvs').delete().eq('id',id);if(r.error)return toast(r.error.message);
    if(currentCvId===id){currentCvId=null;currentCvTitle=null;lastVersionKey='';localStorage.removeItem(CURRENT_CV_KEY)}
    await loadCvs();renderDashboard();toast('CV deleted');
  });
}

async function createSampleAccountData(){
  if(!user)return;
  const one=sample();const two=sample();
  two.personal.name='Sam Morgan';two.personal.title='Customer Service Team Leader';two.personal.email='sam.morgan@example.com';two.profile='Customer service team leader with experience supporting front-line teams, improving customer response quality and keeping daily work organised.';
  const insert=await sb.from('cvs').insert([{user_id:user.id,title:'SAMPLE — Operations CV',data:one},{user_id:user.id,title:'SAMPLE — Team Leader CV',data:two}]).select();
  if(insert.error)return toast(insert.error.message);
  for(const item of insert.data){const vr=await sb.from('cv_versions').insert({cv_id:item.id,user_id:user.id,change_details:'Created sample account data',data:item.data});if(vr.error)toast('Sample CV created but history failed: '+vr.error.message)}
  await loadCvs();await renderDashboard();toast('Two sample account CVs created');
}

function renderProfile(){
  if(!user){app.innerHTML=`<section class="page-wrap">${signInCard()}</section>`;setTimeout(()=>{$('dashboardSignInBtn').onclick=()=>$('accountDialog').showModal()},0);return}
  app.innerHTML=`<section class="page-wrap"><div class="page-head"><div><span class="eyebrow">Profile</span><h1>Your reusable details</h1><p>Save common details once and reuse them when creating or editing CVs.</p></div></div><section class="card profile-card"><div class="form-grid"><div class="field"><label>Name</label><input id="pfName" value="${esc(profile?.full_name||'')}"></div><div class="field"><label>Email</label><input id="pfEmail" value="${esc(profile?.email||user.email||'')}"></div><div class="field"><label>Phone</label><input id="pfPhone" value="${esc(profile?.phone||'')}"></div><div class="field"><label>Location</label><input id="pfLocation" value="${esc(profile?.location||'')}"></div><div class="field full"><label>Career goals</label><textarea id="pfGoals" placeholder="What would you like your next role to lead to?">${esc(profile?.career_goals||'')}</textarea></div><div class="field full"><label>Target roles</label><textarea id="pfRoles" placeholder="Operations Manager, Project Coordinator, Programme Manager...">${esc(profile?.target_roles||'')}</textarea></div><div class="field full"><label>Default CV details</label><textarea id="pfDefaults" placeholder="Standard details or wording you often reuse.">${esc(profile?.default_cv_details?.notes||'')}</textarea></div></div><div class="profile-actions"><button id="applyProfileBtn" class="btn btn-secondary" type="button">Apply contact details to current CV</button><button id="saveProfileBtn" class="btn btn-primary" type="button">Save profile</button></div></section></section>`;
  $('saveProfileBtn').onclick=saveProfile;
  $('applyProfileBtn').onclick=()=>{cv.personal.name=$('pfName').value;cv.personal.email=$('pfEmail').value;cv.personal.phone=$('pfPhone').value;cv.personal.location=$('pfLocation').value;changed('Applied profile details');page='builder';render();toast('Profile details applied to the current CV')};
}
async function saveProfile(){
  const payload={id:user.id,full_name:$('pfName').value,email:$('pfEmail').value,phone:$('pfPhone').value,location:$('pfLocation').value,career_goals:$('pfGoals').value,target_roles:$('pfRoles').value,default_cv_details:{notes:$('pfDefaults').value}};
  const r=await sb.from('profiles').upsert(payload).select().single();if(r.error)return toast(r.error.message);profile=r.data;toast('Profile saved');renderProfile();
}

function renderJobs(){
  app.innerHTML=`<section class="page-wrap"><div class="page-head"><div><span class="eyebrow">Prepared for a future stage</span><h1>Global job search</h1><p>The search interface is ready, but no live job provider is connected in this stage.</p></div></div><section class="card"><div class="form-grid"><div class="field"><label>Job title or keyword</label><input placeholder="Project manager"></div><div class="field"><label>Location</label><input placeholder="London, remote or hybrid"></div><div class="field"><label>Work type</label><select><option>Any</option><option>Full-time</option><option>Part-time</option><option>Contract</option></select></div><div class="field"><label>Salary range</label><input placeholder="£35,000+"></div></div><div class="search-actions"><button class="btn btn-primary" type="button" id="plannedSearchBtn">Search jobs</button></div><div class="placeholder-results"><div class="result-skeleton"></div><div class="result-skeleton"></div><div class="result-skeleton"></div><strong>Planned results layout</strong><p>Future live job results will appear here with save and CV-tailoring options.</p></div></section></section>`;
  $('plannedSearchBtn').onclick=()=>toast('Live job search is deliberately not connected in this stage');
}

function confirmBox(title,message,action){
  $('confirmTitle').textContent=title;$('confirmMessage').textContent=message;
  $('confirmActionBtn').onclick=()=>setTimeout(()=>Promise.resolve(action()).catch(e=>toast(e.message||'Something went wrong')),0);
  $('confirmDialog').showModal();
}

init();
})();
