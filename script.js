const SUPABASE_URL=window.PRIMO_SUPABASE_CONFIG?.url;
const SUPABASE_KEY=window.PRIMO_SUPABASE_CONFIG?.anonKey;
const APP_ID=window.PRIMO_SUPABASE_CONFIG?.appId||"primo_soccer_league_2026_adulto";
const MONTHS=["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
const CATEGORIES=[["Adulto","adulto"]];
const SCHEDULES={"Adulto":["Segunda 19:30 • Adulto","Terça 11:30 • Adulto","Terça 18:30 • Adulto","Terça 19:30 • Adulto","Quarta 19:30 • Adulto","Quinta 11:30 • Adulto","Quinta 18:30 • Adulto","Quinta 19:30 • Adulto"]};
const SLOT_LIMITS={"Segunda 19:30 • Adulto":8,"Terça 11:30 • Adulto":6,"Terça 18:30 • Adulto":6,"Terça 19:30 • Adulto":8,"Quarta 19:30 • Adulto":8,"Quinta 11:30 • Adulto":6,"Quinta 18:30 • Adulto":6,"Quinta 19:30 • Adulto":8};
const STORAGE_KEY="primo_soccer_league_2026_adulto_state_v1",MONTH_KEY="primo_soccer_league_2026_adulto_month_v1";
let currentMonth=localStorage.getItem(MONTH_KEY)||"MAIO",state=loadLocal(),sb=null,saveTimer=null,activeCategory=CATEGORIES[0][0];
function defaultState(){return{students:[],months:{},currentMonth,schemaVersion:3}}
function loadLocal(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||defaultState()}catch(e){return defaultState()}}
function norm(){if(!state||typeof state!=="object")state=defaultState();if(!Array.isArray(state.students))state.students=[];if(!state.months)state.months={};state.currentMonth=currentMonth;if(!state.months[currentMonth])state.months[currentMonth]={participants:{}}}
function saveLocal(){norm();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));localStorage.setItem(MONTH_KEY,currentMonth)}
function uid(){return"ADULTO-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,6).toUpperCase()}
function esc(t){return String(t??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function ageFromBirth(b){if(!b)return"";const d=new Date(b+"T00:00:00"),now=new Date();let a=now.getFullYear()-d.getFullYear();const m=now.getMonth()-d.getMonth();if(m<0||(m===0&&now.getDate()<d.getDate()))a--;return a}
function initials(n){return String(n||"A").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"A"}
function studentById(id){return state.students.find(s=>s.id===id)}
function monthObj(m=currentMonth){norm();if(!state.months[m])state.months[m]={participants:{}};return state.months[m]}
function participant(id,create=true,m=currentMonth){const mo=monthObj(m);if(!mo.participants[id]&&create)mo.participants[id]={studentId:id,schedules:[],weeks:Array.from({length:5},()=>({}))};return mo.participants[id]||null}
function emptyScore(){return{pd:0,pe:0,bonus:0}}
function getScore(id,w,sch){const p=participant(id);if(!p.weeks[w])p.weeks[w]={};if(!p.weeks[w][sch])p.weeks[w][sch]=emptyScore();return p.weeks[w][sch]}
function scoreTotal(sc){return(+sc.pd||0)+(+sc.pe||0)+(+sc.bonus||0)}
function totalStudent(id,m=currentMonth){const p=monthObj(m).participants[id];if(!p)return 0;return(p.weeks||[]).reduce((a,w)=>a+Object.values(w||{}).reduce((b,sc)=>b+scoreTotal(sc),0),0)}
function activeStudents(m=currentMonth){const ids=new Set(Object.entries(monthObj(m).participants||{}).filter(([id,p])=>p.schedules&&p.schedules.length).map(([id])=>id));return state.students.filter(s=>s.active!==false&&ids.has(s.id))}
function activeByCategory(cat=activeCategory){return activeStudents().filter(s=>s.category===cat)}
function ranked(cat=null){return activeStudents().filter(s=>!cat||s.category===cat).map(s=>({...s,total:totalStudent(s.id)})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name))}
function avatarHtml(s){
  return s.photo
    ? `<span class="avatar"><img src="${s.photo}" onclick="openPhoto('${s.photo}')"></span>`
    : `<span class="avatar">${initials(s.name)}</span>`;
}
function photoPickerHtml(s){
  return `<label class="avatarInputLabel">
    ${s.photo?`<img src="${s.photo}" onclick="event.preventDefault(); openPhoto('${s.photo}')">`:initials(s.name)}
    <input class="photoInput" type="file" accept="image/*" onchange="loadPhoto(event,'${s.id}')">
  </label>`;
}
function loadPhoto(e,id){const file=e.target.files&&e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height,max=420;if(w>h&&w>max){h=Math.round(h*max/w);w=max}else if(h>=w&&h>max){w=Math.round(w*max/h);h=max}const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);const s=studentById(id);if(s){s.photo=c.toDataURL("image/jpeg",.82);scheduleSave();renderAll()}};img.src=r.result};r.readAsDataURL(file)}
function setSync(msg,type="warn"){const el=document.getElementById("syncStatus");el.textContent=msg;el.style.color=type==="ok"?"#8ff0b3":type==="error"?"#ff8b8b":"#ffe082"}
function scheduleSave(){saveLocal();clearTimeout(saveTimer);saveTimer=setTimeout(saveCloud,700)}
function setCategory(cat){activeCategory=cat;renderAll()}
function openCategory(cat){activeCategory=cat;showPage("disputa")}
function showPage(page){
  ["dashboard","cadastro","agenda","disputa","matamata","ranking","imprimir","config","pais"].forEach(p=>{
    const pg = document.getElementById("page-"+p);
    const tb = document.getElementById("tab-"+p);
    if(pg) pg.classList.toggle("hidden",p!==page);
    if(tb) tb.classList.toggle("active",p===page);
  });
  renderAll();
}
function renderAll(){
  norm();
  renderMonth();
  renderSelectors();
  renderDashboard();
  renderStudents();
  renderAgenda();
  renderScore();
  renderRankings();
  renderPrintSelect();
  if(typeof applyDashboardCover==="function") applyDashboardCover();
}
function renderMonth(){const sel=document.getElementById("monthSelect");if(!sel.dataset.ready){sel.innerHTML=MONTHS.map(m=>`<option value="${m}">${m}</option>`).join("");sel.dataset.ready="1";sel.onchange=()=>{currentMonth=sel.value;if(!state.months[currentMonth])state.months[currentMonth]={participants:{}};scheduleSave();renderAll()}}sel.value=currentMonth;document.getElementById("heroMonth").textContent=currentMonth}

const MULTI_SCHEDULE_CATEGORIES = ["Adulto"];
function canHaveTwoSchedules(cat){return MULTI_SCHEDULE_CATEGORIES.includes(cat)}
function annualTotalStudent(id){return MONTHS.reduce((sum,m)=>sum+totalStudent(id,m),0)}
function rankedAnnual(cat=null){return state.students.filter(s=>s.active!==false&&(!cat||s.category===cat)).map(s=>({...s,total:annualTotalStudent(s.id)})).filter(s=>s.total>0).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name))}
function studentOptionLabel(s){const p=participant(s.id,false);const count=p?.schedules?.length||0;const icon=count>=2?"🔥":count===1?"✅":"⚽";return `${icon} ${s.name}`}
function restoreSelectValue(id,value){const el=document.getElementById(id);if(el&&value&&[...el.options].some(o=>o.value===value))el.value=value}

function renderSelectors(){
  const currentStudent=document.getElementById("studentPicker")?.value||"";
  const currentSchedule=document.getElementById("schedulePicker")?.value||"";
  const currentScoreSchedule=document.getElementById("scoreSchedule")?.value||"";
  const currentWeek=document.getElementById("scoreWeek")?.value||"";
  document.getElementById("studentCategory").innerHTML=CATEGORIES.map(c=>`<option value="${c[0]}">${c[0]}</option>`).join("");
  ["agendaCategory","disputeCategory"].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.innerHTML=CATEGORIES.map(c=>`<option value="${c[0]}">${c[0]}</option>`).join("");el.value=activeCategory});
  const sp=document.getElementById("studentPicker");
  if(sp){sp.innerHTML=state.students.filter(s=>s.active!==false&&s.category===activeCategory).map(s=>`<option value="${s.id}">${esc(studentOptionLabel(s))}</option>`).join("")||`<option value="">Cadastre alunos nesta categoria</option>`;restoreSelectValue("studentPicker",currentStudent)}
  const sch=SCHEDULES[activeCategory]||[];
  const ap=document.getElementById("schedulePicker");if(ap){ap.innerHTML=sch.map(s=>`<option value="${s}">${s}</option>`).join("");restoreSelectValue("schedulePicker",currentSchedule)}
  const ss=document.getElementById("scoreSchedule");if(ss){ss.innerHTML=sch.map(s=>`<option value="${s}">${s}</option>`).join("");restoreSelectValue("scoreSchedule",currentScoreSchedule)}
  const sw=document.getElementById("scoreWeek");if(sw){sw.innerHTML=[0,1,2,3,4].map(i=>`<option value="${i}">Semana ${i+1}</option>`).join("");restoreSelectValue("scoreWeek",currentWeek)}
  renderCopyMonthPicker();
}
function renderDashboard(){document.getElementById("categoryButtons").innerHTML=`<button class="btn-adulto" onclick="showPage('disputa')">Abrir PRIMO SOCCER LEAGUE 2026</button><button class="btn-adulto" onclick="showPage('matamata')">Mata-mata Top 8</button>`;document.getElementById("dashActive").textContent=activeStudents().length;document.getElementById("dashBank").textContent=state.students.filter(s=>s.active!==false).length;document.getElementById("dashPoints").textContent=activeStudents().reduce((a,s)=>a+totalStudent(s.id),0)}
function addStudent(){const name=document.getElementById("studentName").value.trim(),birth=document.getElementById("studentBirth").value,category=document.getElementById("studentCategory").value;if(!name)return alert("Digite o nome do aluno.");state.students.push({id:uid(),name,birth,category,active:true,photo:"",createdAt:new Date().toISOString()});document.getElementById("studentName").value="";document.getElementById("studentBirth").value="";scheduleSave();renderAll();alert("Aluno cadastrado!")}
function renderStudents(){
  const body = document.getElementById("studentsTable");
  if(!body) return;
  const active = state.students.filter(s=>s.active!==false);
  if(!active.length){
    body.innerHTML = `<tr><td colspan="7">Nenhum aluno cadastrado.</td></tr>`;
    return;
  }

  let html = "";
  CATEGORIES.forEach(cat=>{
    const list = active.filter(s=>s.category===cat[0]);
    if(!list.length) return;

    html += `<tr class="categoryDivider cat-${cat[1]}"><td colspan="7">🏆 ${cat[0]} • ${list.length} aluno(s)</td></tr>`;
    html += list.map((s,i)=>`<tr>
      <td>${i+1}</td>
      <td>${photoPickerHtml(s)}</td>
      <td><input value="${esc(s.name)}" oninput="editStudent('${s.id}','name',this.value)"></td>
      <td><input type="date" value="${s.birth||""}" oninput="editStudent('${s.id}','birth',this.value)"></td>
      <td>${ageFromBirth(s.birth)} anos</td>
      <td><select onchange="editStudent('${s.id}','category',this.value)">
        ${CATEGORIES.map(c=>`<option value="${c[0]}" ${s.category===c[0]?"selected":""}>${c[0]}</option>`).join("")}
      </select></td>
      <td><button class="danger" onclick="deleteStudent('${s.id}')">Excluir</button></td>
    </tr>`).join("");
  });

  body.innerHTML = html || `<tr><td colspan="7">Nenhum aluno cadastrado.</td></tr>`;
}
function editStudent(id,field,value){const s=studentById(id);if(s){s[field]=value;scheduleSave();renderAll()}}
function deleteStudent(id){if(!confirm("Excluir aluno e todos os pontos dele?"))return;state.students=state.students.filter(s=>s.id!==id);Object.values(state.months||{}).forEach(m=>{if(m.participants)delete m.participants[id]});scheduleSave();renderAll()}
function addToSchedule(){
  const id=document.getElementById("studentPicker").value,sch=document.getElementById("schedulePicker").value;if(!id||!sch)return;
  const student=studentById(id);if(!student)return;
  const p=participant(id);const maxSchedules=2;
  if(p.schedules.includes(sch))return alert("Esse aluno já está nesse horário.");
  if(p.schedules.length>=maxSchedules)return alert("Esse atleta já está em 2 horários nesta semana.");
  const studentsInSlot=activeByCategory().filter(s=>(participant(s.id,false)?.schedules||[]).includes(sch));const limit=SLOT_LIMITS[sch]||6;if(studentsInSlot.length>=limit)return alert(`Esse horário já está com ${limit} vagas preenchidas.`);
  p.schedules.push(sch);scheduleSave();renderAll();const picker=document.getElementById("studentPicker");if(picker)picker.value=id;
}
function renderAgenda(){
  const schList=SCHEDULES[activeCategory]||[];
  document.getElementById("agendaGrid").innerHTML=schList.map(sch=>{
    const list=activeByCategory().filter(s=>(participant(s.id,false)?.schedules||[]).includes(sch));
    return`<div class="slotCard"><div class="slotTitle"><span>${sch}</span><span class="badge">${list.length}/${SLOT_LIMITS[sch]||6}</span></div>${list.map(s=>{const count=participant(s.id,false)?.schedules?.length||0;const icon=count>=2?"🔥":count===1?"✅":"⚽";const cls=count>=2?"multiSchedule":"singleSchedule";return `<div class="item ${cls}"><span>${icon} ${esc(s.name)}</span><button class="danger" onclick="removeFromSchedule('${s.id}','${sch}')">Remover</button></div>`}).join("")||"<p>Nenhum aluno.</p>"}</div>`;
  }).join("");
}
function removeFromSchedule(id,sch){const p=participant(id,false);if(p){p.schedules=p.schedules.filter(x=>x!==sch);scheduleSave();renderAll()}}
function quickScoreControl(id,week,sch,field,value,label){
  return `<div class="quickScore" aria-label="${label}">
    <button type="button" class="scoreBtn minus" onclick="adjustScore('${id}',${week},'${sch}','${field}',-1,this)">−</button>
    <button type="button" class="scoreValue" onclick="adjustScore('${id}',${week},'${sch}','${field}',1,this)" title="Clique para somar +1">${value}</button>
    <button type="button" class="scoreBtn plus" onclick="adjustScore('${id}',${week},'${sch}','${field}',1,this)">+</button>
  </div>`;
}
function renderScore(){
  const sch=document.getElementById("scoreSchedule").value||(SCHEDULES[activeCategory]||[])[0]||"",week=+document.getElementById("scoreWeek").value||0;
  document.getElementById("scoreTitle").textContent=`PRIMO SOCCER LEAGUE 2026 • ${sch} • Semana ${week+1}`;
  const list=activeByCategory().filter(s=>(participant(s.id,false)?.schedules||[]).includes(sch));
  document.getElementById("scoreTable").innerHTML=list.map((s,i)=>{
    const score=getScore(s.id,week,sch);
    return `<tr data-student="${s.id}">
      <td>${i+1}</td>
      <td class="sticky"><div class="playerCell quickPlayer" onclick="adjustScore('${s.id}',${week},'${sch}','pd',1,this)" title="Clique no atleta para somar +1 no pé direito">${avatarHtml(s)}<strong>${esc(s.name)}</strong></div></td>
      <td>${quickScoreControl(s.id,week,sch,'pd',score.pd,'Pé direito')}</td>
      <td>${quickScoreControl(s.id,week,sch,'pe',score.pe,'Pé esquerdo')}</td>
      <td><select class="bonusSelect" onchange="setScore('${s.id}',${week},'${sch}','bonus',this.value,this)"><option value="0" ${score.bonus==0?"selected":""}>0</option><option value="5" ${score.bonus==5?"selected":""}>5</option><option value="7" ${score.bonus==7?"selected":""}>7</option></select></td>
      <td class="totalCell"><strong>${scoreTotal(score)}</strong></td>
    </tr>`
  }).join("")||`<tr><td colspan="6">Nenhum atleta neste horário. Vá em Agenda e adicione atletas neste horário.</td></tr>`;
}
function updateScoreRow(el,sc,field){
  const row=el.closest("tr");
  if(!row)return;
  const cells=row.querySelectorAll("td");
  const fieldCell=field==="pd"?cells[2]:field==="pe"?cells[3]:null;
  if(fieldCell){
    const valueBtn=fieldCell.querySelector(".scoreValue");
    if(valueBtn)valueBtn.textContent=sc[field];
    fieldCell.classList.remove("scoreFlash");
    void fieldCell.offsetWidth;
    fieldCell.classList.add("scoreFlash");
  }
  const total=row.querySelector(".totalCell strong");
  if(total)total.textContent=scoreTotal(sc);
}
function adjustScore(id,week,sch,field,delta,el){
  const sc=getScore(id,week,sch);
  sc[field]=Math.max(0,(+sc[field]||0)+delta);
  updateScoreRow(el,sc,field);
  scheduleSave();
  renderRankings();
}
function setScore(id,week,sch,field,value,el){
  const sc=getScore(id,week,sch);
  sc[field]=+value||0;
  const row=el.closest("tr");
  if(row)row.querySelector(".totalCell strong").textContent=scoreTotal(sc);
  scheduleSave();renderRankings();
}
function clearTrainingScore(){const sch=document.getElementById("scoreSchedule").value,week=+document.getElementById("scoreWeek").value;if(!confirm("Limpar pontuação deste treino?"))return;activeByCategory().forEach(s=>{const p=participant(s.id,false);if(p?.weeks?.[week]?.[sch])p.weeks[week][sch]=emptyScore()});scheduleSave();renderAll()}
function rankRow(s,i){return`<div class="rankRow"><div class="rankLeft"><span>${i===0?"🥇":i===1?"🥈":i===2?"🥉":"⚽"}</span>${avatarHtml(s)}<span>${i+1}º - ${esc(s.name)}</span></div><strong>${s.total} pts</strong></div>`}
function renderRankings(){
  const categoryRanking=document.getElementById("categoryRanking");
  if(categoryRanking){const monthList=ranked(activeCategory),yearList=rankedAnnual(activeCategory);categoryRanking.innerHTML=`<h3>🏆 Pontuação mensal • ${currentMonth}</h3>${monthList.map(rankRow).join("")||"<p>Nenhum aluno ativo nesta categoria.</p>"}<h3 class="annualTitle">📅 Pontuação geral do ano</h3>${yearList.map(rankRow).join("")||"<p>Nenhuma pontuação anual nesta categoria.</p>"}`}
  const rg=document.getElementById("rankingGeneral");if(rg)rg.innerHTML="";
  const all=document.getElementById("allCategoryRankings");
  if(all){all.innerHTML=CATEGORIES.map(c=>{const monthly=ranked(c[0]),annual=rankedAnnual(c[0]);return`<div class="catCard cat-${c[1]}"><h2>${c[0]}</h2><h3>🏆 Pontuação mensal • ${currentMonth}</h3>${monthly.map(rankRow).join("")||"<p>Nenhum aluno ativo no mês.</p>"}<h3 class="annualTitle">📅 Pontuação geral do ano</h3>${annual.map(rankRow).join("")||"<p>Nenhuma pontuação anual.</p>"}</div>`}).join("")}
}
function renderCopyMonthPicker(){const picker=document.getElementById("copyMonthPicker");const available=MONTHS.filter(m=>m!==currentMonth&&Object.values(state.months?.[m]?.participants||{}).some(p=>p.schedules&&p.schedules.some(s=>(SCHEDULES[activeCategory]||[]).includes(s))));picker.innerHTML=available.map(m=>`<option value="${m}">${m}</option>`).join("")||`<option value="">Nenhum mês com agenda</option>`}
function copyAgendaFromMonth(){const source=document.getElementById("copyMonthPicker").value;if(!source)return alert("Nenhum mês com agenda para copiar.");const sourceMo=monthObj(source),targetMo=monthObj(currentMonth),schList=SCHEDULES[activeCategory]||[];const entries=Object.entries(sourceMo.participants||{}).filter(([id,p])=>{const st=studentById(id);return st&&st.category===activeCategory&&p.schedules&&p.schedules.some(s=>schList.includes(s))});if(!entries.length)return alert("Esse mês não possui agenda nessa categoria.");entries.forEach(([id,p])=>{targetMo.participants[id]={studentId:id,schedules:p.schedules.filter(s=>schList.includes(s)),weeks:Array.from({length:5},()=>({}))}});scheduleSave();renderAll();alert("Agenda da categoria copiada com pontuação zerada.")}
function clearCategoryAgenda(){if(!confirm("Limpar agenda desta categoria no mês atual?"))return;const schList=SCHEDULES[activeCategory]||[];activeByCategory().forEach(s=>{const p=participant(s.id,false);if(p)p.schedules=p.schedules.filter(x=>!schList.includes(x))});scheduleSave();renderAll()}
function renderPrintSelect(){const el=document.getElementById("printCategory");if(el)el.innerHTML=CATEGORIES.map(c=>`<option value="${c[0]}">${c[0]}</option>`).join("")}
function preparePrint(type){const cat=document.getElementById("printCategory").value;const list=type==="general"?ranked():ranked(cat);const title=type==="general"?"RANKING GERAL DO MÊS":cat;document.getElementById("printArea").innerHTML=`<div class="printCard"><img src="primo-logo.png" class="printLogo"><h1>PRIMO SOCCER LEAGUE 2026</h1><h2>${title} • ${currentMonth}</h2>${list.map((s,i)=>`<div class="printRow"><span>${i+1}º</span><span class="printPhoto">${s.photo?`<img src="${s.photo}">`:initials(s.name)}</span><span>${esc(s.name)}</span><strong>${s.total} pts</strong></div>`).join("")||"<p>Nenhum aluno.</p>"}</div>`}

function totalStudentUntilWeek(id, maxWeekExclusive=2, m=currentMonth){
  const p=monthObj(m).participants[id];
  if(!p)return 0;
  return(p.weeks||[]).slice(0,maxWeekExclusive).reduce((a,w)=>a+Object.values(w||{}).reduce((b,sc)=>b+scoreTotal(sc),0),0)
}
function rankedFirstTwoWeeks(){
  return activeStudents().map(s=>({...s,total:totalStudentUntilWeek(s.id,2)})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
}
function playoffObj(){const mo=monthObj();if(!mo.playoffs)mo.playoffs={qf:[],sf:[],final:[],champion:null};return mo.playoffs}
function generatePlayoffs(){
  const top=rankedFirstTwoWeeks().slice(0,8);
  if(top.length<8)return alert("É preciso ter pelo menos 8 atletas com agenda ativa para gerar o mata-mata.");
  const po=playoffObj();
  po.qf=[[top[0].id,top[7].id],[top[1].id,top[6].id],[top[2].id,top[5].id],[top[3].id,top[4].id]].map((players,i)=>({id:"qf"+i,players,winner:null}));
  po.sf=[{id:"sf0",players:[null,null],winner:null},{id:"sf1",players:[null,null],winner:null}];
  po.final=[{id:"final0",players:[null,null],winner:null}];
  po.champion=null;
  scheduleSave();renderAll();alert("Quartas de final geradas com os 8 melhores das semanas 1 e 2.");
}
function resetPlayoffs(){if(!confirm("Resetar todo o mata-mata?"))return;monthObj().playoffs={qf:[],sf:[],final:[],champion:null};scheduleSave();renderAll()}
function setMatchWinner(round,index,winner){
  const po=playoffObj();
  po[round][index].winner=winner;
  if(round==="qf"){
    const target=index<2?0:1, slot=index%2;
    po.sf[target].players[slot]=winner;po.sf[target].winner=null;po.final[0].players=[null,null];po.final[0].winner=null;po.champion=null;
  }
  if(round==="sf"){
    po.final[0].players[index]=winner;po.final[0].winner=null;po.champion=null;
  }
  if(round==="final") po.champion=winner;
  scheduleSave();renderAll();
}
function matchCard(match,round,index,label){
  const names=match.players||[];
  const rows=[0,1].map(pos=>{const id=names[pos];const s=id?studentById(id):null;const checked=match.winner&&match.winner===id?"checked":"";return `<label class="playPlayer ${checked?'winner':''}">${s?avatarHtml(s):'<span class="avatar">?</span>'}<span>${s?esc(s.name):'Aguardando vencedor'}</span>${s?`<input type="radio" name="${round}${index}" ${checked} onchange="setMatchWinner('${round}',${index},'${id}')">`:''}</label>`}).join("");
  return `<div class="matchCard"><h3>${label}</h3>${rows}</div>`;
}
function renderPlayoffs(){
  const el=document.getElementById("playoffArea");if(!el)return;
  const top=rankedFirstTwoWeeks().slice(0,8);
  const po=playoffObj();
  const seeded=top.map((s,i)=>`<div class="seedRow"><span>${i+1}º</span>${avatarHtml(s)}<strong>${esc(s.name)}</strong><em>${s.total} pts</em></div>`).join("")||"<p>Nenhum atleta ativo.</p>";
  el.innerHTML=`<div class="card"><h2>Classificação até a 2ª semana</h2>${seeded}</div><div class="card"><h2>Quartas de final</h2>${(po.qf||[]).map((m,i)=>matchCard(m,"qf",i,["1º x 8º","2º x 7º","3º x 6º","4º x 5º"][i])).join("")||'<p>Clique em “Gerar quartas com top 8”.</p>'}</div><div class="card"><h2>Semifinais</h2>${(po.sf||[]).map((m,i)=>matchCard(m,"sf",i,"Semifinal "+(i+1))).join("")}</div><div class="card"><h2>Final</h2>${(po.final||[]).map((m,i)=>matchCard(m,"final",i,"Final")).join("")}${po.champion?`<div class="championBox">🏆 Campeão: ${esc(studentById(po.champion)?.name||'')}</div>`:''}</div>`;
}
const renderAllBaseForPlayoff = renderAll;
renderAll = function(){renderAllBaseForPlayoff();renderPlayoffs();};

async function initCloud(){try{setSync("Conectando ao banco online...");if(!window.supabase)throw new Error("Biblioteca Supabase não carregou");sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);const{data,error}=await sb.from("primo_app_state").select("data").eq("app_id",APP_ID).maybeSingle();if(error)throw error;if(data&&data.data&&Object.keys(data.data).length){const keep=currentMonth;state=data.data;currentMonth=keep;saveLocal()}else await saveCloud();setSync("Dados online conectados.","ok");renderAll()}catch(e){console.error(e);setSync("Erro online: confirme SQL e config.","error")}}
async function saveCloud(){if(!sb){if(!window.supabase)return;sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY)}try{norm();const{error}=await sb.from("primo_app_state").upsert({app_id:APP_ID,data:state,updated_at:new Date().toISOString()},{onConflict:"app_id"});if(error)throw error;setSync("Dados salvos online.","ok")}catch(e){console.error(e);setSync("Erro ao salvar online.","error")}}
async function syncNow(){await saveCloud();alert("Sincronizado")}
async function loadCloud(){await initCloud()}

// ===== Logo + Link dos Pais v4 =====
let parentCategory = CATEGORIES[0][0];

function isParentMode(){
  const p = new URLSearchParams(location.search);
  return p.get("pais")==="1" || p.get("parents")==="1" || location.hash==="#pais";
}

function copyParentLink(){
  const url = location.origin + location.pathname + "?pais=1";
  const el = document.getElementById("parentLinkText");
  if(el) el.textContent = url;
  if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(()=>alert("Link dos pais copiado!")).catch(()=>alert(url));
  } else {
    alert(url);
  }
}

function setParentCategory(cat){
  parentCategory = cat;
  renderParentMode();
}

function renderParentMode(){
  const m=document.getElementById("parentMonth");if(m)m.textContent=currentMonth;
  const tabs=document.getElementById("parentCategoryTabs");if(tabs){tabs.innerHTML=CATEGORIES.map(c=>{const active=c[0]===parentCategory?"active":"";return `<button class="btn-${c[1]} ${active}" onclick="setParentCategory('${c[0]}')">${c[0]}</button>`}).join("")}
  const area=document.getElementById("parentRankingArea");if(area){const monthList=ranked(parentCategory),yearList=rankedAnnual(parentCategory);area.innerHTML=`<div class="card"><h2 class="rankTitle"><img src="primo-logo.png" class="rankLogo"> ${parentCategory}</h2><h3>🏆 Pontuação mensal • ${currentMonth}</h3><div class="rankList">${monthList.map(rankRow).join("")||"<p>Nenhum resultado nesta categoria.</p>"}</div><h3 class="annualTitle">📅 Pontuação geral do ano</h3><div class="rankList">${yearList.map(rankRow).join("")||"<p>Nenhuma pontuação anual nesta categoria.</p>"}</div></div>`}
}
const renderRankingsBase = renderRankings;
renderRankings = function(){
  renderRankingsBase();
  if(isParentMode()) renderParentMode();
};



function initParentModeIfNeeded(){
  if(!isParentMode()) return;
  document.body.classList.add("parentMode");
  showPage("pais");
  renderParentMode();
}

/* ===== PATCH FINAL JOÃO - IMPRESSÃO INTERNA + FOTO AMPLIADA + CAPA ESTÁVEL ===== */

function applyDashboardCover(){
  const hero = document.getElementById("appHero");
  if(!hero) return;

  const cover = state?.settings?.dashboardCoverCustom || "visual-adulto-oficial.jpeg";

  hero.style.backgroundImage =
    `linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.20) 42%,rgba(2,8,23,.94)), url("${cover}")`;
}

function uploadCover(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const maxW = 1200;
      let w = img.width;
      let h = img.height;

      if(w > maxW){
        h = Math.round(h * maxW / w);
        w = maxW;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);

      state.settings = state.settings || {};
      state.settings.dashboardCoverCustom = canvas.toDataURL("image/jpeg",0.86);

      scheduleSave();
      applyDashboardCover();
      alert("Capa do Dashboard atualizada!");
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function clearCover(){
  if(!confirm("Remover capa personalizada?")) return;

  state.settings = state.settings || {};
  delete state.settings.dashboardCover;
  delete state.settings.dashboardCoverV9;
  delete state.settings.dashboardCoverCustom;

  scheduleSave();
  applyDashboardCover();
}

function openPhoto(src){
  let modal = document.getElementById("photoModal");

  if(!modal){
    modal = document.createElement("div");
    modal.id = "photoModal";
    modal.innerHTML = '<img id="photoModalImg" alt="Foto ampliada">';
    modal.onclick = () => modal.classList.remove("show");
    document.body.appendChild(modal);
  }

  const img = document.getElementById("photoModalImg");
  img.src = src;
  modal.classList.add("show");
}

function preparePrint(type){
  const cat = document.getElementById("printCategory").value;
  const list = type==="general" ? ranked() : ranked(cat);
  const title = type==="general" ? "RANKING GERAL DO MÊS" : cat;

  document.getElementById("printArea").innerHTML = `
    <div class="printCard printOnlyCard">
      <img src="primo-logo.png" class="printLogo">
      <h1>PRIMO SOCCER LEAGUE 2026</h1>
      <h2>${title} • ${currentMonth}</h2>
      <div class="printTableOnly">
        ${list.map((s,i)=>`
          <div class="printRow">
            <span>${i+1}º</span>
            <span class="printPhoto">
              ${s.photo?`<img src="${s.photo}" onclick="openPhoto('${s.photo}')">`:initials(s.name)}
            </span>
            <span>${esc(s.name)}</span>
            <strong>${s.total} pts</strong>
          </div>
        `).join("") || "<p>Nenhum aluno.</p>"}
      </div>
    </div>`;
}



/* ===== PRINT ADULTO + MATA-MATA ===== */
preparePrint = function(type){
  const cat="Adulto";
  if(type==="playoffs"){
    const po=playoffObj();
    const top=rankedFirstTwoWeeks().slice(0,8);
    const topHtml=top.map((s,i)=>`<div class="printRow"><span>${i+1}º</span><span class="printPhoto">${s.photo?`<img src="${s.photo}">`:initials(s.name)}</span><span>${esc(s.name)}</span><strong>${s.total} pts</strong></div>`).join("");
    const mini=(m,label)=>`<div class="printMatch"><h3>${label}</h3>${(m.players||[]).map(id=>{const s=id?studentById(id):null;return `<p>${s?esc(s.name):'Aguardando'} ${m.winner===id?'🏆':''}</p>`}).join("")}</div>`;
    document.getElementById("printArea").innerHTML=`<div class="printCard printOnlyCard"><img src="primo-logo.png" class="printLogo"><h1>PRIMO SOCCER LEAGUE 2026</h1><h2>MATA-MATA • ${currentMonth}</h2><h3>Top 8 até a 2ª semana</h3><div class="printTableOnly">${topHtml}</div><div class="printBracket">${(po.qf||[]).map((m,i)=>mini(m,["1º x 8º","2º x 7º","3º x 6º","4º x 5º"][i])).join("")}${(po.sf||[]).map((m,i)=>mini(m,"Semifinal "+(i+1))).join("")}${(po.final||[]).map(m=>mini(m,"Final")).join("")}</div>${po.champion?`<h2>🏆 CAMPEÃO: ${esc(studentById(po.champion)?.name||'')}</h2>`:''}</div>`;
    return;
  }
  const list=type==="annual"?rankedAnnual(cat):ranked(cat);
  const title=type==="annual"?`RANKING ANUAL • ADULTO`:`RANKING ADULTO • ${currentMonth}`;
  document.getElementById("printArea").innerHTML=`<div class="printCard printOnlyCard"><img src="primo-logo.png" class="printLogo"><h1>PRIMO SOCCER LEAGUE 2026</h1><h2>${title}</h2><div class="printTableOnly">${list.map((s,i)=>`<div class="printRow"><span>${i+1}º</span><span class="printPhoto">${s.photo?`<img src="${s.photo}" onclick="openPhoto('${s.photo}')">`:initials(s.name)}</span><span>${esc(s.name)}</span><strong>${s.total} pts</strong></div>`).join("")||"<p>Nenhum atleta.</p>"}</div></div>`;
};

renderAll();showPage("dashboard");initCloud();setTimeout(()=>{ if(typeof initParentModeIfNeeded==="function") initParentModeIfNeeded(); applyDashboardCover(); },700);

/* ===== AJUSTES SOLICITADOS JOÃO - FOTO, ORDEM ALFABÉTICA, ANUAL POR MÊS E EDIÇÃO MANUAL ===== */
const MONTH_LABELS_SHORT = ["Jan","Fev","Mar","Abril","Maio","Jun","Jul","Agosto","Setembro","Out","Nov","Dez"];
function sortByName(list){
  return [...list].sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"pt-BR",{sensitivity:"base"}));
}
function monthlyPointsForStudent(id){
  return MONTHS.map(m=>totalStudent(id,m));
}
function annualRows(cat="Adulto"){
  return state.students
    .filter(s=>s.active!==false && (!cat || s.category===cat))
    .map(s=>{const months=monthlyPointsForStudent(s.id);return {...s,months,total:months.reduce((a,b)=>a+b,0)}})
    .sort((a,b)=>b.total-a.total || String(a.name||"").localeCompare(String(b.name||""),"pt-BR",{sensitivity:"base"}));
}
function annualTableHtml(cat="Adulto"){
  const rows = annualRows(cat);
  if(!rows.length) return "<p>Nenhum atleta cadastrado.</p>";
  return `<div class="annualTableWrap"><table class="annualTable"><thead><tr><th>#</th><th>Atleta</th>${MONTH_LABELS_SHORT.map(m=>`<th>${m}</th>`).join("")}<th>Total</th></tr></thead><tbody>${rows.map((s,i)=>`<tr><td>${i+1}</td><td class="annualName">${avatarHtml(s)}<strong>${esc(s.name)}</strong></td>${s.months.map(v=>`<td>${v||0}</td>`).join("")}<td class="annualTotal"><strong>${s.total}</strong></td></tr>`).join("")}</tbody></table></div>`;
}
function annualPrintTableHtml(cat="Adulto"){
  const rows = annualRows(cat);
  if(!rows.length) return "<p>Nenhum atleta cadastrado.</p>";
  return `<table class="printAnnualTable"><thead><tr><th>#</th><th>Atleta</th>${MONTH_LABELS_SHORT.map(m=>`<th>${m}</th>`).join("")}<th>Total</th></tr></thead><tbody>${rows.map((s,i)=>`<tr><td>${i+1}</td><td>${esc(s.name)}</td>${s.months.map(v=>`<td>${v||0}</td>`).join("")}<td><strong>${s.total}</strong></td></tr>`).join("")}</tbody></table>`;
}

photoPickerHtml = function(s){
  const inputId = `photoInput-${s.id}`;
  return `<label class="avatarInputLabel" title="Clique para alterar a foto">
    ${s.photo?`<img src="${s.photo}" onclick="event.preventDefault(); openPhoto('${s.photo}')">`:initials(s.name)}
    <input id="${inputId}" class="photoInput" type="file" accept="image/*" onchange="loadPhoto(event,'${s.id}')">
  </label>`;
};
function clickPhotoInput(id){
  const input = document.getElementById(`photoInput-${id}`);
  if(input) input.click();
}
function removePhoto(id){
  const s = studentById(id);
  if(!s) return;
  if(!s.photo) return alert("Esse atleta ainda não tem foto cadastrada.");
  if(!confirm("Excluir a foto deste atleta?")) return;
  s.photo = "";
  scheduleSave();
  renderAll();
}

renderSelectors = function(){
  const currentStudent=document.getElementById("studentPicker")?.value||"";
  const currentSchedule=document.getElementById("schedulePicker")?.value||"";
  const currentScoreSchedule=document.getElementById("scoreSchedule")?.value||"";
  const currentWeek=document.getElementById("scoreWeek")?.value||"";
  document.getElementById("studentCategory").innerHTML=CATEGORIES.map(c=>`<option value="${c[0]}">${c[0]}</option>`).join("");
  ["agendaCategory","disputeCategory"].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.innerHTML=CATEGORIES.map(c=>`<option value="${c[0]}">${c[0]}</option>`).join("");el.value=activeCategory});
  const sp=document.getElementById("studentPicker");
  if(sp){sp.innerHTML=sortByName(state.students.filter(s=>s.active!==false&&s.category===activeCategory)).map(s=>`<option value="${s.id}">${esc(studentOptionLabel(s))}</option>`).join("")||`<option value="">Cadastre alunos nesta categoria</option>`;restoreSelectValue("studentPicker",currentStudent)}
  const sch=SCHEDULES[activeCategory]||[];
  const ap=document.getElementById("schedulePicker");if(ap){ap.innerHTML=sch.map(s=>`<option value="${s}">${s}</option>`).join("");restoreSelectValue("schedulePicker",currentSchedule)}
  const ss=document.getElementById("scoreSchedule");if(ss){ss.innerHTML=sch.map(s=>`<option value="${s}">${s}</option>`).join("");restoreSelectValue("scoreSchedule",currentScoreSchedule)}
  const sw=document.getElementById("scoreWeek");if(sw){sw.innerHTML=[0,1,2,3,4].map(i=>`<option value="${i}">Semana ${i+1}</option>`).join("");restoreSelectValue("scoreWeek",currentWeek)}
  renderCopyMonthPicker();
};

renderStudents = function(){
  const body = document.getElementById("studentsTable");
  if(!body) return;
  const active = sortByName(state.students.filter(s=>s.active!==false));
  if(!active.length){body.innerHTML = `<tr><td colspan="7">Nenhum aluno cadastrado.</td></tr>`;return;}
  let html = "";
  CATEGORIES.forEach(cat=>{
    const list = active.filter(s=>s.category===cat[0]);
    if(!list.length) return;
    html += `<tr class="categoryDivider cat-${cat[1]}"><td colspan="7">🏆 ${cat[0]} • ${list.length} atleta(s) em ordem alfabética</td></tr>`;
    html += list.map((s,i)=>`<tr>
      <td>${i+1}</td>
      <td>${photoPickerHtml(s)}</td>
      <td><input value="${esc(s.name)}" onblur="editStudent('${s.id}','name',this.value)" onchange="editStudent('${s.id}','name',this.value)"></td>
      <td><input type="date" value="${s.birth||""}" onchange="editStudent('${s.id}','birth',this.value)"></td>
      <td>${ageFromBirth(s.birth)} anos</td>
      <td><select onchange="editStudent('${s.id}','category',this.value)">
        ${CATEGORIES.map(c=>`<option value="${c[0]}" ${s.category===c[0]?"selected":""}>${c[0]}</option>`).join("")}
      </select></td>
      <td class="studentActions"><button class="secondary smallBtn" onclick="clickPhotoInput('${s.id}')">Alterar foto</button><button class="danger smallBtn" onclick="removePhoto('${s.id}')">Excluir foto</button><button class="danger smallBtn" onclick="deleteStudent('${s.id}')">Excluir atleta</button></td>
    </tr>`).join("");
  });
  body.innerHTML = html || `<tr><td colspan="7">Nenhum aluno cadastrado.</td></tr>`;
};

renderAgenda = function(){
  const schList=SCHEDULES[activeCategory]||[];
  document.getElementById("agendaGrid").innerHTML=schList.map(sch=>{
    const list=sortByName(activeByCategory().filter(s=>(participant(s.id,false)?.schedules||[]).includes(sch)));
    return`<div class="slotCard"><div class="slotTitle"><span>${sch}</span><span class="badge">${list.length}/${SLOT_LIMITS[sch]||6}</span></div>${list.map(s=>{const count=participant(s.id,false)?.schedules?.length||0;const icon=count>=2?"🔥":count===1?"✅":"⚽";const cls=count>=2?"multiSchedule":"singleSchedule";return `<div class="item ${cls}"><span>${icon} ${esc(s.name)}</span><button class="danger" onclick="removeFromSchedule('${s.id}','${sch}')">Remover</button></div>`}).join("")||"<p>Nenhum aluno.</p>"}</div>`;
  }).join("");
};

quickScoreControl = function(id,week,sch,field,value,label){
  return `<div class="quickScore" aria-label="${label}">
    <button type="button" class="scoreBtn minus" onclick="adjustScore('${id}',${week},'${sch}','${field}',-1,this)">−</button>
    <button type="button" class="scoreValue" onclick="adjustScore('${id}',${week},'${sch}','${field}',1,this)" title="Clique para somar +1">${value}</button>
    <button type="button" class="scoreBtn plus" onclick="adjustScore('${id}',${week},'${sch}','${field}',1,this)">+</button>
    <button type="button" class="scoreEdit" onclick="editScoreManual('${id}',${week},'${sch}','${field}',this)" title="Editar pontuação manualmente">✎</button>
  </div>`;
};
function editScoreManual(id,week,sch,field,el){
  const sc = getScore(id,week,sch);
  const label = field === "pd" ? "pé direito" : "pé esquerdo";
  const val = prompt(`Digite a pontuação do ${label}:`, sc[field] ?? 0);
  if(val === null) return;
  const n = Math.max(0, parseInt(String(val).replace(/[^0-9]/g,""),10) || 0);
  sc[field] = n;
  updateScoreRow(el, sc, field);
  scheduleSave();
  renderRankings();
}

renderRankings = function(){
  const categoryRanking=document.getElementById("categoryRanking");
  if(categoryRanking){
    const monthList=ranked(activeCategory);
    categoryRanking.innerHTML=`<h3>🏆 Pontuação mensal • ${currentMonth}</h3>${monthList.map(rankRow).join("")||"<p>Nenhum aluno ativo nesta categoria.</p>"}<h3 class="annualTitle">📅 Pontuação anual por mês</h3>${annualTableHtml(activeCategory)}`;
  }
  const rg=document.getElementById("rankingGeneral");if(rg)rg.innerHTML="";
  const all=document.getElementById("allCategoryRankings");
  if(all){all.innerHTML=CATEGORIES.map(c=>{const monthly=ranked(c[0]);return`<div class="catCard cat-${c[1]}"><h2>${c[0]}</h2><h3>🏆 Pontuação mensal • ${currentMonth}</h3>${monthly.map(rankRow).join("")||"<p>Nenhum aluno ativo no mês.</p>"}<h3 class="annualTitle">📅 Pontuação anual por mês</h3>${annualTableHtml(c[0])}</div>`}).join("")}
  if(typeof isParentMode === "function" && isParentMode()) renderParentMode();
};

renderParentMode = function(){
  const m=document.getElementById("parentMonth");if(m)m.textContent=currentMonth;
  const tabs=document.getElementById("parentCategoryTabs");if(tabs){tabs.innerHTML=CATEGORIES.map(c=>{const active=c[0]===parentCategory?"active":"";return `<button class="btn-${c[1]} ${active}" onclick="setParentCategory('${c[0]}')">${c[0]}</button>`}).join("")}
  const area=document.getElementById("parentRankingArea");if(area){const monthList=ranked(parentCategory);area.innerHTML=`<div class="card"><h2 class="rankTitle"><img src="primo-logo.png" class="rankLogo"> ${parentCategory}</h2><h3>🏆 Pontuação mensal • ${currentMonth}</h3><div class="rankList">${monthList.map(rankRow).join("")||"<p>Nenhum resultado nesta categoria.</p>"}</div><h3 class="annualTitle">📅 Pontuação anual por mês</h3>${annualTableHtml(parentCategory)}</div>`}
};

preparePrint = function(type){
  const cat="Adulto";
  if(type==="playoffs"){
    const po=playoffObj();
    const top=rankedFirstTwoWeeks().slice(0,8);
    const topHtml=top.map((s,i)=>`<div class="printRow"><span>${i+1}º</span><span class="printPhoto">${s.photo?`<img src="${s.photo}">`:initials(s.name)}</span><span>${esc(s.name)}</span><strong>${s.total} pts</strong></div>`).join("");
    const mini=(m,label)=>`<div class="printMatch"><h3>${label}</h3>${(m.players||[]).map(id=>{const s=id?studentById(id):null;return `<p>${s?esc(s.name):'Aguardando'} ${m.winner===id?'🏆':''}</p>`}).join("")}</div>`;
    document.getElementById("printArea").innerHTML=`<div class="printCard printOnlyCard"><img src="primo-logo.png" class="printLogo"><h1>PRIMO SOCCER LEAGUE 2026</h1><h2>MATA-MATA • ${currentMonth}</h2><h3>Top 8 até a 2ª semana</h3><div class="printTableOnly">${topHtml}</div><div class="printBracket">${(po.qf||[]).map((m,i)=>mini(m,["1º x 8º","2º x 7º","3º x 6º","4º x 5º"][i])).join("")}${(po.sf||[]).map((m,i)=>mini(m,"Semifinal "+(i+1))).join("")}${(po.final||[]).map(m=>mini(m,"Final")).join("")}</div>${po.champion?`<h2>🏆 CAMPEÃO: ${esc(studentById(po.champion)?.name||'')}</h2>`:''}</div>`;
    return;
  }
  if(type==="annual"){
    document.getElementById("printArea").innerHTML=`<div class="printCard printOnlyCard annualPrintCard"><img src="primo-logo.png" class="printLogo"><h1>PRIMO SOCCER LEAGUE 2026</h1><h2>RANKING ANUAL • ADULTO</h2>${annualPrintTableHtml(cat)}</div>`;
    return;
  }
  const list=ranked(cat);
  document.getElementById("printArea").innerHTML=`<div class="printCard printOnlyCard"><img src="primo-logo.png" class="printLogo"><h1>PRIMO SOCCER LEAGUE 2026</h1><h2>RANKING ADULTO • ${currentMonth}</h2><div class="printTableOnly">${list.map((s,i)=>`<div class="printRow"><span>${i+1}º</span><span class="printPhoto">${s.photo?`<img src="${s.photo}" onclick="openPhoto('${s.photo}')">`:initials(s.name)}</span><span>${esc(s.name)}</span><strong>${s.total} pts</strong></div>`).join("")||"<p>Nenhum atleta.</p>"}</div></div>`;
};

renderAll();


/* ===== AJUSTES JOÃO - ID FIXO, FILTRO DE TREINO E FINALIZAR TREINO ===== */
function normalizeIdText(id){return String(id||"").toUpperCase().replace(/[^A-Z0-9-]/g,"");}
function ensureStudentIds(){
  if(!state || !Array.isArray(state.students)) return;
  const used=new Set();
  state.students.forEach((s,idx)=>{
    if(!s.id) s.id=uid();
    s.id=normalizeIdText(s.id) || uid();
    while(used.has(s.id)) s.id=uid();
    used.add(s.id);
    if(!s.createdAt) s.createdAt=new Date().toISOString();
  });
}
const normBeforeIds = norm;
norm = function(){
  normBeforeIds();
  ensureStudentIds();
  if(!state.months[currentMonth].finishedTrainings) state.months[currentMonth].finishedTrainings={};
  state.schemaVersion=4;
};
function trainingKey(week,sch){return `semana-${(+week||0)+1}__${String(sch||"")}`;}
function isTrainingFinished(week,sch){return !!monthObj().finishedTrainings?.[trainingKey(week,sch)];}
function trainingFinishedInfo(week,sch){return monthObj().finishedTrainings?.[trainingKey(week,sch)]||null;}
function copyAthleteId(id){
  const txt=String(id||"");
  if(navigator.clipboard){navigator.clipboard.writeText(txt).then(()=>alert("ID do atleta copiado: "+txt)).catch(()=>alert(txt));}
  else alert(txt);
}
function shortAthleteId(id){
  const t=String(id||"");
  return t.length>18 ? t.slice(0,10)+"…"+t.slice(-5) : t;
}

renderSelectors = function(){
  const currentStudent=document.getElementById("studentPicker")?.value||"";
  const currentSchedule=document.getElementById("schedulePicker")?.value||"";
  const currentScoreSchedule=document.getElementById("scoreSchedule")?.value||"";
  const currentWeek=document.getElementById("scoreWeek")?.value||"";
  document.getElementById("studentCategory").innerHTML=CATEGORIES.map(c=>`<option value="${c[0]}">${c[0]}</option>`).join("");
  ["agendaCategory","disputeCategory"].forEach(id=>{const el=document.getElementById(id);if(!el)return;el.innerHTML=CATEGORIES.map(c=>`<option value="${c[0]}">${c[0]}</option>`).join("");el.value=activeCategory});
  const sp=document.getElementById("studentPicker");
  if(sp){sp.innerHTML=sortByName(state.students.filter(s=>s.active!==false&&s.category===activeCategory)).map(s=>`<option value="${s.id}">${esc(studentOptionLabel(s))}</option>`).join("")||`<option value="">Cadastre alunos nesta categoria</option>`;restoreSelectValue("studentPicker",currentStudent)}
  const sch=SCHEDULES[activeCategory]||[];
  const ap=document.getElementById("schedulePicker");if(ap){ap.innerHTML=sch.map(s=>`<option value="${s}">${s}</option>`).join("");restoreSelectValue("schedulePicker",currentSchedule)}
  const ss=document.getElementById("scoreSchedule");if(ss){ss.innerHTML=sch.map(s=>`<option value="${s}">${s}</option>`).join("");restoreSelectValue("scoreSchedule",currentScoreSchedule);ss.onchange=()=>renderScore();}
  const sw=document.getElementById("scoreWeek");if(sw){sw.innerHTML=[0,1,2,3,4].map(i=>`<option value="${i}">Semana ${i+1}</option>`).join("");restoreSelectValue("scoreWeek",currentWeek);sw.onchange=()=>renderScore();}
  renderCopyMonthPicker();
};

renderStudents = function(){
  const body = document.getElementById("studentsTable");
  if(!body) return;
  norm();
  const active = sortByName(state.students.filter(s=>s.active!==false));
  if(!active.length){body.innerHTML = `<tr><td colspan="8">Nenhum atleta cadastrado.</td></tr>`;return;}
  let html = "";
  CATEGORIES.forEach(cat=>{
    const list = active.filter(s=>s.category===cat[0]);
    if(!list.length) return;
    html += `<tr class="categoryDivider cat-${cat[1]}"><td colspan="8">🏆 ${cat[0]} • ${list.length} atleta(s) em ordem alfabética</td></tr>`;
    html += list.map((s,i)=>`<tr>
      <td>${i+1}</td>
      <td><button class="idBadge" title="Clique para copiar o ID" onclick="copyAthleteId('${s.id}')">${esc(shortAthleteId(s.id))}</button></td>
      <td>${photoPickerHtml(s)}</td>
      <td><input value="${esc(s.name)}" onblur="editStudent('${s.id}','name',this.value)" onchange="editStudent('${s.id}','name',this.value)"></td>
      <td><input type="date" value="${s.birth||""}" onchange="editStudent('${s.id}','birth',this.value)"></td>
      <td>${ageFromBirth(s.birth)} anos</td>
      <td><select onchange="editStudent('${s.id}','category',this.value)">
        ${CATEGORIES.map(c=>`<option value="${c[0]}" ${s.category===c[0]?"selected":""}>${c[0]}</option>`).join("")}
      </select></td>
      <td class="studentActions"><button class="secondary smallBtn" onclick="clickPhotoInput('${s.id}')">Alterar foto</button><button class="danger smallBtn" onclick="removePhoto('${s.id}')">Excluir foto</button><button class="danger smallBtn" onclick="deleteStudent('${s.id}')">Excluir atleta</button></td>
    </tr>`).join("");
  });
  body.innerHTML = html || `<tr><td colspan="8">Nenhum atleta cadastrado.</td></tr>`;
};

function scoreStatusHtml(week,sch){
  const info=trainingFinishedInfo(week,sch);
  if(!info) return `<span class="trainingOpen">Treino aberto para pontuar</span>`;
  const dt=info.finishedAt ? new Date(info.finishedAt).toLocaleString("pt-BR") : "salvo";
  return `<span class="trainingSaved">✅ Treino finalizado e salvo • ${dt}</span>`;
}

renderScore = function(){
  const sch=document.getElementById("scoreSchedule")?.value||(SCHEDULES[activeCategory]||[])[0]||"",week=+document.getElementById("scoreWeek")?.value||0;
  const title=document.getElementById("scoreTitle");
  if(title) title.innerHTML=`PRIMO SOCCER LEAGUE 2026 • ${esc(sch)} • Semana ${week+1}<br>${scoreStatusHtml(week,sch)}`;
  const list=sortByName(activeByCategory().filter(s=>(participant(s.id,false)?.schedules||[]).includes(sch)));
  const table=document.getElementById("scoreTable");
  if(!table) return;
  table.innerHTML=list.map((s,i)=>{
    const score=getScore(s.id,week,sch);
    return `<tr data-student="${s.id}">
      <td>${i+1}</td>
      <td class="sticky"><div class="playerCell quickPlayer" onclick="adjustScore('${s.id}',${week},'${sch}','pd',1,this)" title="Clique no atleta para somar +1 no pé direito">${avatarHtml(s)}<div><strong>${esc(s.name)}</strong><small class="athleteIdLine">ID: ${esc(shortAthleteId(s.id))}</small></div></div></td>
      <td>${quickScoreControl(s.id,week,sch,'pd',score.pd,'Pé direito')}</td>
      <td>${quickScoreControl(s.id,week,sch,'pe',score.pe,'Pé esquerdo')}</td>
      <td><select class="bonusSelect" onchange="setScore('${s.id}',${week},'${sch}','bonus',this.value,this)"><option value="0" ${score.bonus==0?"selected":""}>0</option><option value="5" ${score.bonus==5?"selected":""}>5</option><option value="7" ${score.bonus==7?"selected":""}>7</option></select></td>
      <td class="totalCell"><strong>${scoreTotal(score)}</strong></td>
    </tr>`
  }).join("")||`<tr><td colspan="6">Nenhum atleta neste horário. Vá em Agenda, selecione este dia/horário e adicione atletas. Ao trocar o dia do treino aqui, a lista atualiza automaticamente.</td></tr>`;
};

async function finishTraining(){
  const sch=document.getElementById("scoreSchedule")?.value;
  const week=+document.getElementById("scoreWeek")?.value||0;
  if(!sch) return alert("Selecione o dia/horário do treino.");
  const list=activeByCategory().filter(s=>(participant(s.id,false)?.schedules||[]).includes(sch));
  if(!list.length) return alert("Não há atletas agendados neste treino para finalizar.");
  const total=list.reduce((sum,s)=>sum+scoreTotal(getScore(s.id,week,sch)),0);
  if(!confirm(`Finalizar e salvar este treino?\n\n${sch}\nSemana ${week+1}\nAtletas: ${list.length}\nPontos no treino: ${total}`)) return;
  const mo=monthObj();
  if(!mo.finishedTrainings) mo.finishedTrainings={};
  mo.finishedTrainings[trainingKey(week,sch)]={
    schedule:sch,
    week:week+1,
    finishedAt:new Date().toISOString(),
    athletes:list.map(s=>({id:s.id,name:s.name,total:scoreTotal(getScore(s.id,week,sch))})),
    total
  };
  saveLocal();
  await saveCloud();
  renderAll();
  alert("Treino finalizado e salvo no banco online.");
}

const addStudentBeforeId = addStudent;
addStudent = function(){
  const name=document.getElementById("studentName").value.trim(),birth=document.getElementById("studentBirth").value,category=document.getElementById("studentCategory").value||"Adulto";
  if(!name)return alert("Digite o nome do atleta.");
  const newId=uid();
  state.students.push({id:newId,name,birth,category,active:true,photo:"",createdAt:new Date().toISOString()});
  document.getElementById("studentName").value="";document.getElementById("studentBirth").value="";
  scheduleSave();renderAll();alert("Atleta cadastrado com ID: "+newId);
};

/* Recarrega a tela com os overrides ativos */
renderAll();
