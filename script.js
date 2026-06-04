const STORAGE_KEY="primo_league_horarios_v1";
const MONTH_KEY="primo_league_month_horarios_v1";
const COVER_KEY="primo_league_cover_horarios_v1";
const DEFAULT_COVER="capa-primo-soccer.jpeg";
const slotData=[
  {name:"Segunda 19:30", vagas:8},
  {name:"Terça 11:30", vagas:6},
  {name:"Terça 18:30", vagas:6},
  {name:"Terça 19:30", vagas:8},
  {name:"Quarta 19:30", vagas:8},
  {name:"Quinta 11:30", vagas:6},
  {name:"Quinta 18:30", vagas:6},
  {name:"Quinta 19:30", vagas:8}
];
const slots=slotData.map(s=>s.name);
function slotLimit(slot){return slotData.find(s=>s.name===slot)?.vagas||0}
let currentWeek=0,currentPage="score",cropState={playerId:null,src:"",x:0,y:0,scale:1,dragging:false,lastX:0,lastY:0};
let state=loadState();

function newAthlete(name){return{id:Date.now()+Math.random(),name,photo:"",slots:[],weeks:Array.from({length:5},()=>({}))}}
function emptyScore(){return{pd:0,pe:0,bonus:0}}
function loadState(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY));if(s&&Array.isArray(s.athletes))return s}catch(e){}return{athletes:[]}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));scheduleCloudSave()}
function n(v){const x=Number(v);return Number.isFinite(x)?x:0}
function initials(name){return String(name||"J").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"J"}
function esc(t){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function score(a,week,slot){a.weeks[week][slot]??=emptyScore();return a.weeks[week][slot]}
function scoreBase(s){return n(s.pd)+n(s.pe)}
function scoreFinal(s){return scoreBase(s)+n(s.bonus)}
function weekTotal(a,w){return slots.reduce((sum,sl)=>sum+(a.weeks[w][sl]?scoreFinal(a.weeks[w][sl]):0),0)}
function athleteTotal(a){return a.weeks.reduce((sum,_,i)=>sum+weekTotal(a,i),0)}
function ranked(){return state.athletes.map(a=>({...a,total:athleteTotal(a),weekTotals:a.weeks.map((_,i)=>weekTotal(a,i))})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name))}
function fillSelects(){
  const html='<option value="">Sem segundo treino</option>'+slots.map(s=>`<option>${s}</option>`).join("");
  document.getElementById("athleteSlot1").innerHTML=slots.map(s=>`<option>${s}</option>`).join("");
  document.getElementById("athleteSlot2").innerHTML=html;
  document.getElementById("sessionSlot").innerHTML=slots.map(s=>`<option>${s}</option>`).join("");
}
function setPage(p){currentPage=p;["score","athletes","agenda","knockout","year","ranking","config"].forEach(x=>{document.getElementById("page"+cap(x)).classList.toggle("hidden",x!==p);document.getElementById("tab"+cap(x)).classList.toggle("active",x===p)});renderAll()}
function cap(s){return s[0].toUpperCase()+s.slice(1)}
function renderWeeks(){const el=document.getElementById("weekTabs");el.innerHTML="";for(let i=0;i<5;i++){const b=document.createElement("button");b.className="tab"+(i===currentWeek?" active":"");b.textContent=`S${i+1}`;b.onclick=()=>{currentWeek=i;renderAll()};el.appendChild(b)}}
function addAthlete(){const name=document.getElementById("athleteName").value.trim();if(!name)return alert("Digite o nome do atleta.");const a=newAthlete(name);a.slots=[document.getElementById("athleteSlot1").value,document.getElementById("athleteSlot2").value].filter(Boolean);state.athletes.push(a);document.getElementById("athleteName").value="";save();renderAll()}
function deleteAthlete(id){if(confirm("Apagar atleta?")){state.athletes=state.athletes.filter(a=>a.id!=id);save();renderAll()}}
function renderAthletes(){const body=document.getElementById("athletesBody");body.innerHTML=state.athletes.map((a,i)=>`<tr>
<td>${i+1}</td>
<td>${photoHtml(a)}</td>
<td><input value="${esc(a.name)}" oninput="editAthlete('${a.id}','name',this.value)"></td>
<td><select onchange="editSlot('${a.id}',0,this.value)">${slots.map(s=>`<option ${a.slots[0]===s?"selected":""}>${s}</option>`).join("")}</select></td>
<td><select onchange="editSlot('${a.id}',1,this.value)"><option value="">Sem segundo treino</option>${slots.map(s=>`<option ${a.slots[1]===s?"selected":""}>${s}</option>`).join("")}</select></td>
<td><div class="athlete-actions"><button class="stats-btn" onclick="openStats('${a.id}')">Estatísticas</button><button class="danger" onclick="deleteAthlete('${a.id}')">Apagar</button></div></td>
</tr>`).join("")}
function photoHtml(a){return `<div class="avatar-wrap">${a.photo?`<img class="avatar" src="${a.photo}" onclick="openModalById('${a.id}')">`:`<div class="avatar-placeholder" onclick="choosePhoto('${a.id}')">${initials(a.name)}</div>`}<label class="photo-btn">+<input class="photo-input" type="file" accept="image/*" onchange="loadPhoto(event,'${a.id}')"></label></div>`}
function editAthlete(id,field,val){const a=state.athletes.find(x=>x.id==id);if(a){a[field]=val;save();updateRanking();renderKnockout()}}
function editSlot(id,idx,val){const a=state.athletes.find(x=>x.id==id);if(a){a.slots[idx]=val;a.slots=[...new Set(a.slots.filter(Boolean))];save();renderAll()}}
function renderScoreTable(){renderWeeks();const sl=document.getElementById("sessionSlot").value;document.getElementById("sessionTitle").textContent=`Semana ${currentWeek+1} - ${sl}`;const list=state.athletes.filter(a=>a.slots.includes(sl));document.getElementById("scoreBody").innerHTML=list.map((a,i)=>{const s=score(a,currentWeek,sl);return `<tr>
<td class="sticky-num">${i+1}</td>
<td class="sticky-player"><div class="player-cell">${photoHtml(a)}<strong>${esc(a.name)}</strong></div></td>
<td><input type="number" inputmode="numeric" value="${s.pd}" oninput="setScore('${a.id}','${sl}','pd',this.value,this)"></td>
<td><input type="number" inputmode="numeric" value="${s.pe}" oninput="setScore('${a.id}','${sl}','pe',this.value,this)"></td>
<td class="total-cell">${scoreBase(s)}</td>
<td><select onchange="setScore('${a.id}','${sl}','bonus',this.value,this)"><option value="0" ${s.bonus==0?"selected":""}>0</option><option value="5" ${s.bonus==5?"selected":""}>5</option><option value="7" ${s.bonus==7?"selected":""}>7</option></select></td>
<td class="final-cell">${scoreFinal(s)}</td>
</tr>`}).join("") || `<tr><td colspan="7">Nenhum atleta cadastrado nesse horário.</td></tr>`;updateRanking();renderKnockout()}
function setScore(id,sl,field,val,el){const a=state.athletes.find(x=>x.id==id);if(!a)return;const s=score(a,currentWeek,sl);s[field]=n(val);save();const tr=el.closest("tr");tr.querySelector(".total-cell").textContent=scoreBase(s);tr.querySelector(".final-cell").textContent=scoreFinal(s);updateRanking();renderKnockout()}
function clearCurrentSession(){const sl=document.getElementById("sessionSlot").value;if(!confirm(`Limpar pontuação de ${sl} na Semana ${currentWeek+1}?`))return;state.athletes.forEach(a=>{if(a.weeks[currentWeek][sl])a.weeks[currentWeek][sl]=emptyScore()});save();renderScoreTable()}
function updateRanking(){renderYearTotal();const r=ranked();document.getElementById("rankingList").innerHTML=r.map((a,i)=>`<div class="rank-row"><div class="rank-left">${a.photo?`<img src="${a.photo}">`:`<span class="rank-avatar">${initials(a.name)}</span>`}<span>${medal(i)} ${i+1}º - ${esc(a.name)}</span></div><strong>${a.total} pts</strong></div>`).join("");const c=r[0];document.getElementById("printMonth").textContent=document.getElementById("monthName").value;document.getElementById("printChampionName").textContent=c?c.name:"-";document.getElementById("printChampionPoints").textContent=c?`${c.total} pts`:"0 pts";document.getElementById("printChampionPhoto").src=c?.photo||placeholderSvg(c?.name||"");document.getElementById("printRankingBody").innerHTML=r.map((a,i)=>`<tr><td class="pos">${i+1}</td><td><img class="print-photo" src="${a.photo||placeholderSvg(a.name)}"></td><td class="print-name">${esc(a.name)}</td>${a.weekTotals.map(x=>`<td class="week-points">${x}</td>`).join("")}<td class="total-points">${a.total}</td></tr>`).join("")}
function medal(i){return i===0?"🥇":i===1?"🥈":i===2?"🥉":"⚽"}
function renderAgenda(){
  const grid=document.getElementById("agendaGrid");
  if(!grid)return;
  grid.innerHTML=slotData.map(slot=>{
    const list=state.athletes.filter(a=>a.slots.includes(slot.name));
    const usadas=list.length;
    const livres=Math.max(slot.vagas-usadas,0);
    const full=usadas>=slot.vagas;
    return `<div class="agenda-card ${full?'full':''}">
      <div class="agenda-card-header">
        <h3>${slot.name}</h3>
        <span class="vagas-badge">${usadas}/${slot.vagas} vagas</span>
      </div>
      <div class="agenda-list">
        ${list.length?list.map(a=>`<div class="agenda-athlete">
          ${a.photo?`<img src="${a.photo}">`:`<span class="agenda-avatar">${initials(a.name)}</span>`}
          <strong>${esc(a.name)}</strong>
        </div>`).join(""):`<div class="empty-agenda">Nenhum atleta neste horário.</div>`}
        ${livres>0?`<div class="empty-agenda">Disponíveis: ${livres}</div>`:`<div class="empty-agenda">Horário completo</div>`}
      </div>
    </div>`
  }).join("");
}


function topAfterWeek2(){
  return state.athletes.map(a=>({...a,seedPoints:weekTotal(a,0)+weekTotal(a,1),total:athleteTotal(a)}))
    .sort((a,b)=>b.seedPoints-a.seedPoints||a.name.localeCompare(b.name)).slice(0,8);
}
function koWinner(a,b,weekIndex){
  if(!a&&!b)return null; if(a&&!b)return a; if(!a&&b)return b;
  const pa=weekTotal(a,weekIndex), pb=weekTotal(b,weekIndex);
  if(pa>pb)return a; if(pb>pa)return b; return null;
}
function buildKnockout(){
  const seeds=topAfterWeek2();
  const q=[[seeds[0],seeds[7],"1º","8º"],[seeds[1],seeds[6],"2º","7º"],[seeds[2],seeds[5],"3º","6º"],[seeds[3],seeds[4],"4º","5º"]];
  const qW=q.map(m=>koWinner(m[0],m[1],2));
  const s=[[qW[0],qW[3],"Venc. Q1","Venc. Q4"],[qW[1],qW[2],"Venc. Q2","Venc. Q3"]];
  const sW=s.map(m=>koWinner(m[0],m[1],3));
  const f=[[sW[0],sW[1],"Venc. S1","Venc. S2"]];
  const champion=koWinner(f[0][0],f[0][1],4);
  return {seeds,q,qW,s,sW,f,champion};
}
function playerLine(a,weekIndex,label,winner){
  if(!a)return `<div class="match-player"><span class="seed">${label||"-"}</span><span>A definir</span><span class="match-score">-</span></div>`;
  const pts=weekIndex===null?weekTotal(a,0)+weekTotal(a,1):weekTotal(a,weekIndex);
  return `<div class="match-player ${winner&&winner.id===a.id?'winner':''}"><span class="seed">${label||""}</span><span>${esc(a.name)}</span><span class="match-score">${pts}</span></div>`;
}
function renderMatch(title,a,b,weekIndex,labelA,labelB,winner){
  return `<div class="match-card"><div class="match-title">${title}</div>${playerLine(a,weekIndex,labelA,winner)}${playerLine(b,weekIndex,labelB,winner)}</div>`;
}
function renderKnockout(){
  const el=document.getElementById("knockoutContent"); if(!el)return;
  const ko=buildKnockout();
  if(ko.seeds.length<8){el.innerHTML=`<div class="ko-info">Cadastre pelo menos 8 atletas e lance pontos nas Semanas 1 e 2 para montar o mata-mata.</div>`;renderKnockoutPrint();return;}
  el.innerHTML=`<div class="ko-info">Classificação: soma da Semana 1 + Semana 2. Confrontos: 1º x 8º, 2º x 7º, 3º x 6º, 4º x 5º.</div>
  <div class="bracket-grid">
  <div class="bracket-stage"><h3>Quartas - Semana 3</h3>${ko.q.map((m,i)=>renderMatch("Quartas "+(i+1),m[0],m[1],2,m[2],m[3],ko.qW[i])).join("")}</div>
  <div class="bracket-stage"><h3>Semifinais - Semana 4</h3>${ko.s.map((m,i)=>renderMatch("Semifinal "+(i+1),m[0],m[1],3,m[2],m[3],ko.sW[i])).join("")}</div>
  <div class="bracket-stage"><h3>Final - Semana 5</h3>${renderMatch("Final",ko.f[0][0],ko.f[0][1],4,ko.f[0][2],ko.f[0][3],ko.champion)}<div class="champion-card"><h3>🏆 Campeão Mata-Mata</h3><strong>${ko.champion?esc(ko.champion.name):"A definir"}</strong></div></div>
  </div>`;
  renderKnockoutPrint();
}
function koPrintMatch(title,a,b,weekIndex,labelA,labelB,winner){
  const row=(p,label)=>!p?`<div class="ko-print-row"><span>${label}</span><span>A definir</span><span class="ko-print-score">-</span></div>`:`<div class="ko-print-row ${winner&&winner.id===p.id?'winner':''}"><span>${label}</span><span>${esc(p.name)}</span><span class="ko-print-score">${weekTotal(p,weekIndex)}</span></div>`;
  return `<div class="ko-print-match"><strong>${title}</strong>${row(a,labelA)}${row(b,labelB)}</div>`;
}
function renderKnockoutPrint(){
  const el=document.getElementById("knockoutPrintContent"); if(!el)return;
  document.getElementById("koPrintMonth").textContent=document.getElementById("monthName").value;
  const ko=buildKnockout();
  if(ko.seeds.length<8){el.innerHTML=`<div class="ko-print-stage"><h2>Mata-Mata</h2><p>É necessário ter pelo menos 8 atletas classificados após a Semana 2.</p></div>`;return;}
  el.innerHTML=`<div class="ko-print-stage"><h2>Quartas - Semana 3</h2>${ko.q.map((m,i)=>koPrintMatch("Q"+(i+1),m[0],m[1],2,m[2],m[3],ko.qW[i])).join("")}</div>
  <div class="ko-print-stage"><h2>Semifinais - Semana 4</h2>${ko.s.map((m,i)=>koPrintMatch("S"+(i+1),m[0],m[1],3,m[2],m[3],ko.sW[i])).join("")}</div>
  <div class="ko-print-stage"><h2>Final - Semana 5</h2>${koPrintMatch("Final",ko.f[0][0],ko.f[0][1],4,ko.f[0][2],ko.f[0][3],ko.champion)}</div>
  <div class="ko-print-champion"><span>CAMPEÃO MATA-MATA</span><strong>${ko.champion?esc(ko.champion.name):"A definir"}</strong></div>`;
}
function printKnockout(){renderKnockoutPrint();document.body.classList.add("print-knockout");window.print();setTimeout(()=>document.body.classList.remove("print-knockout"),500)}


function currentMonthName(){return document.getElementById("monthName").value||"MAIO"}
function ensureYear(a){if(!a.yearTotals)a.yearTotals={};return a.yearTotals}
function saveMonthToYear(){
  const month=currentMonthName();
  if(!confirm(`Salvar pontuação de ${month} no Total Geral do Ano?`))return;
  state.athletes.forEach(a=>{ensureYear(a)[month]=athleteTotal(a)});
  save();renderYearTotal();
  alert(`Pontuação de ${month} salva no total anual!`);
}
function annualTotal(a){
  const y=ensureYear(a), current=currentMonthName();
  const saved=Object.values(y).reduce((s,v)=>s+n(v),0);
  return saved + (y[current]===undefined ? athleteTotal(a) : 0);
}
function currentMonthPoints(a){
  const y=ensureYear(a), current=currentMonthName();
  return y[current]!==undefined ? n(y[current]) : athleteTotal(a);
}
function rankedYear(){
  return state.athletes.map(a=>({...a,yearTotal:annualTotal(a),monthTotal:currentMonthPoints(a)})).sort((a,b)=>b.yearTotal-a.yearTotal||a.name.localeCompare(b.name));
}
function renderYearTotal(){
  const body=document.getElementById("yearBody");
  if(body)body.innerHTML=rankedYear().map((a,i)=>`<tr><td>${i+1}</td><td>${a.photo?`<img class="avatar" src="${a.photo}">`:`<span class="avatar-placeholder">${initials(a.name)}</span>`}</td><td><strong>${esc(a.name)}</strong></td><td class="year-current-cell">${a.monthTotal}</td><td class="year-total-cell">${a.yearTotal}</td></tr>`).join("");
  const print=document.getElementById("yearPrintBody");
  if(print)print.innerHTML=rankedYear().slice(0,20).map((a,i)=>`<tr><td class="year-pos">${i+1}</td><td>${a.photo?`<img src="${a.photo}">`:`<img src="${placeholderSvg(a.name)}">`}</td><td class="year-name">${esc(a.name)}</td><td class="year-month">${a.monthTotal}</td><td class="year-total">${a.yearTotal}</td></tr>`).join("");
}
function printYearTotal(){renderYearTotal();document.body.classList.add("print-year");window.print();setTimeout(()=>document.body.classList.remove("print-year"),500)}


function athletePerformance(a){
  const bySlot={};
  const byWeek=[0,0,0,0,0];
  let pd=0, pe=0, bonus=0, sessions=0, activeWeeks=0;
  let bestSession={label:"Sem dados", points:0};

  a.weeks.forEach((week,wIndex)=>{
    let weekHasScore=false;
    Object.entries(week).forEach(([slot,s])=>{
      const final=scoreFinal(s);
      const hasAny=n(s.pd)>0 || n(s.pe)>0 || n(s.bonus)>0;
      pd+=n(s.pd);
      pe+=n(s.pe);
      bonus+=n(s.bonus);
      byWeek[wIndex]+=final;
      bySlot[slot]=(bySlot[slot]||0)+final;
      if(hasAny){
        sessions++;
        weekHasScore=true;
      }
      if(final>bestSession.points){
        bestSession={label:`Semana ${wIndex+1} • ${slot}`, points:final};
      }
    });
    if(weekHasScore) activeWeeks++;
  });

  const technical=pd+pe;
  const total=pd+pe+bonus;
  const pdPct=technical?Math.round((pd/technical)*100):0;
  const pePct=technical?Math.round((pe/technical)*100):0;
  const constancia=Math.round((activeWeeks/5)*100);
  const bestSlot=Object.entries(bySlot).sort((a,b)=>b[1]-a[1])[0] || ["Sem horário",0];
  const bestWeek=byWeek.map((v,i)=>[`Semana ${i+1}`,v]).sort((a,b)=>b[1]-a[1])[0] || ["Sem semana",0];

  return {pd,pe,bonus,total,technical,pdPct,pePct,constancia,sessions,activeWeeks,bySlot,byWeek,bestSlot,bestWeek,bestSession};
}

function barRows(entries,max){
  if(!entries.length) return `<div class="performance-note">Ainda não há pontos lançados para este atleta.</div>`;
  return entries.map(([label,value])=>{
    const pct=max?Math.max(4,Math.round((value/max)*100)):0;
    return `<div class="bar-row">
      <div class="bar-label"><span>${label}</span><strong>${value} pts</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("");
}

function openStats(id){
  const a=state.athletes.find(x=>String(x.id)===String(id));
  if(!a)return;
  const st=athletePerformance(a);
  const slotEntries=Object.entries(st.bySlot).sort((a,b)=>b[1]-a[1]);
  const weekEntries=st.byWeek.map((v,i)=>[`Semana ${i+1}`,v]);
  const maxSlot=Math.max(...slotEntries.map(e=>e[1]),0);
  const maxWeek=Math.max(...weekEntries.map(e=>e[1]),0);
  const dominantLeg = st.pd>st.pe ? "Perna direita" : st.pe>st.pd ? "Perna esquerda" : "Equilibrado";

  document.getElementById("statsContent").innerHTML=`
    <div class="stats-header">
      ${a.photo?`<img src="${a.photo}">`:`<div class="stats-avatar">${initials(a.name)}</div>`}
      <div>
        <h2>${esc(a.name)}</h2>
        <div class="stats-subtitle">Horários: ${a.slots&&a.slots.length?a.slots.join(" + "):"Sem horário"}</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-box"><span>Total</span><strong>${st.total}</strong></div>
      <div class="stat-box"><span>P/D</span><strong>${st.pd}</strong></div>
      <div class="stat-box"><span>P/E</span><strong>${st.pe}</strong></div>
      <div class="stat-box"><span>Constância</span><strong>${st.constancia}%</strong></div>
    </div>

    <div class="leg-chart">
      <div class="leg-card">
        <h3>Perna direita P/D</h3>
        <div class="leg-percent">${st.pdPct}%</div>
        <div class="bar-track"><div class="bar-fill" style="width:${st.pdPct}%"></div></div>
        <p>${st.pd} acertos/pontos</p>
      </div>
      <div class="leg-card">
        <h3>Perna esquerda P/E</h3>
        <div class="leg-percent">${st.pePct}%</div>
        <div class="bar-track"><div class="bar-fill" style="width:${st.pePct}%"></div></div>
        <p>${st.pe} acertos/pontos</p>
      </div>
    </div>

    <div class="performance-note">
      Maior acerto: <strong>${dominantLeg}</strong>.<br>
      Melhor horário/treino: <strong>${st.bestSlot[0]}</strong> com <strong>${st.bestSlot[1]} pontos</strong>.<br>
      Melhor sessão: <strong>${st.bestSession.label}</strong> com <strong>${st.bestSession.points} pontos</strong>.<br>
      Constância: <strong>${st.activeWeeks} de 5 semanas</strong> com pontuação lançada.
    </div>

    <div class="bar-section">
      <h3>Levantamento estatístico P/D x P/E</h3>
      ${barRows([["Perna direita P/D",st.pd],["Perna esquerda P/E",st.pe]],Math.max(st.pd,st.pe))}
    </div>

    <div class="bar-section">
      <h3>Rendimento por horário</h3>
      ${barRows(slotEntries,maxSlot)}
    </div>

    <div class="bar-section">
      <h3>Rendimento por semana</h3>
      ${barRows(weekEntries,maxWeek)}
    </div>
  `;
  document.getElementById("statsModal").classList.add("open");
}

function closeStats(){
  document.getElementById("statsModal").classList.remove("open");
}

function renderAll(){renderWeeks();renderAthletes();renderAgenda();renderScoreTable();renderKnockout();updateRanking();renderKnockout()}
function exportCSV(){const rows=[["Atleta","Horários","Semana 1","Semana 2","Semana 3","Semana 4","Semana 5","Total"]];ranked().forEach(a=>rows.push([a.name,a.slots.join(" + "),...a.weekTotals,a.total]));const csv=rows.map(r=>r.map(c=>`"${String(c).replaceAll('"','""')}"`).join(";")).join("\n");download("\uFEFF"+csv,"ranking-primo-soccer.csv","text/csv")}
function download(content,name,type){const b=new Blob([content],{type});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u)}
function loadPhoto(e,id){const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>startCrop(id,reader.result);reader.readAsDataURL(f)}
function choosePhoto(id){document.querySelector(`input[onchange*="${id}"]`)?.click()}
function openModalById(id){const a=state.athletes.find(x=>x.id==id);if(a?.photo){document.getElementById("modalImage").src=a.photo;document.getElementById("photoModal").classList.add("open")}}
function closeModal(){document.getElementById("photoModal").classList.remove("open")}
function startCrop(id,src){cropState={playerId:id,src,x:0,y:0,scale:1,dragging:false,lastX:0,lastY:0};const img=document.getElementById("cropImage");img.src=src;img.onload=positionCropImage;document.getElementById("cropZoom").value=1;document.getElementById("cropModal").classList.add("open")}
function positionCropImage(){const img=document.getElementById("cropImage"),frame=280,ratio=img.naturalWidth/img.naturalHeight;let w,h;if(ratio>1){h=frame;w=frame*ratio}else{w=frame;h=frame/ratio}img.style.width=w+"px";img.style.height=h+"px";cropState.x=(frame-w)/2;cropState.y=(frame-h)/2;applyCrop()}
function applyCrop(){document.getElementById("cropImage").style.transform=`translate(${cropState.x}px,${cropState.y}px) scale(${cropState.scale})`}
const cf=document.getElementById("cropFrame");cf.addEventListener("pointerdown",e=>{cropState.dragging=true;cropState.lastX=e.clientX;cropState.lastY=e.clientY;cf.setPointerCapture(e.pointerId)});cf.addEventListener("pointermove",e=>{if(!cropState.dragging)return;cropState.x+=e.clientX-cropState.lastX;cropState.y+=e.clientY-cropState.lastY;cropState.lastX=e.clientX;cropState.lastY=e.clientY;applyCrop()});cf.addEventListener("pointerup",()=>cropState.dragging=false);document.getElementById("cropZoom").addEventListener("input",e=>{cropState.scale=Number(e.target.value);applyCrop()});
function cancelCrop(){document.getElementById("cropModal").classList.remove("open")}
function saveCrop(){const img=document.getElementById("cropImage"),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");canvas.width=400;canvas.height=400;ctx.fillStyle="#0b2443";ctx.fillRect(0,0,400,400);ctx.save();ctx.beginPath();ctx.arc(200,200,200,0,Math.PI*2);ctx.clip();const sc=400/280,w=parseFloat(img.style.width),h=parseFloat(img.style.height);ctx.drawImage(img,cropState.x*sc,cropState.y*sc,w*cropState.scale*sc,h*cropState.scale*sc);ctx.restore();const a=state.athletes.find(x=>x.id==cropState.playerId);if(a)a.photo=canvas.toDataURL("image/jpeg",.9);document.getElementById("cropModal").classList.remove("open");save();renderAll()}
function addDefaultNames(){if(state.athletes.length&& !confirm("Já existem atletas. Adicionar exemplos?"))return;for(let i=1;i<=32;i++){const a=newAthlete(`Jogador ${i}`);a.slots=[slots[(i-1)%slots.length]];state.athletes.push(a)}save();renderAll()}
function clearPoints(){if(confirm("Limpar todos os pontos?")){state.athletes.forEach(a=>a.weeks=Array.from({length:5},()=>({})));save();renderAll()}}
function resetAll(){if(confirm("Apagar tudo, inclusive atletas? Isso também será sincronizado online.")){state={athletes:[]};save();renderAll()}}
function placeholderSvg(name){const t=initials(name);return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#0b2443"/><text x="50%" y="56%" text-anchor="middle" font-size="34" font-family="Arial" fill="#7ee0ff" font-weight="700">${t}</text></svg>`)}`}
function loadCover(){const s=localStorage.getItem(COVER_KEY)||DEFAULT_COVER;document.getElementById("coverImage").src=s}
document.getElementById("coverInput").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{localStorage.setItem(COVER_KEY,r.result);loadCover()};r.readAsDataURL(f)});
function removeCover(){localStorage.removeItem(COVER_KEY);document.getElementById("coverImage").removeAttribute("src")}
document.getElementById("monthName").addEventListener("change",e=>{localStorage.setItem(MONTH_KEY,e.target.value);updateRanking();renderKnockout()});
function loadMonth(){const m=localStorage.getItem(MONTH_KEY);if(m)document.getElementById("monthName").value=m}
let lastTouchEnd=0;document.addEventListener("touchend",e=>{const now=Date.now();if(now-lastTouchEnd<=300)e.preventDefault();lastTouchEnd=now},{passive:false});

let isViewerMode=false;
function safeEncode(obj){return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))}
function safeDecode(str){return JSON.parse(decodeURIComponent(escape(atob(str))))}
function snapshotState(){
  return {version:1,month:document.getElementById("monthName").value,athletes:state.athletes.map(a=>({id:a.id,name:a.name,slots:a.slots,photo:"",weeks:a.weeks,yearTotals:a.yearTotals||{}}))};
}
function generateAthleteLink(){
  const link=location.origin+location.pathname+"?aluno=1";
  const el=document.getElementById("shareLink");
  if(el) el.value=link;
  const modal=document.getElementById("shareModal");
  if(modal) modal.classList.add("open");
}
async function copyShareLink(){
  const txt=document.getElementById("shareLink").value;
  try{await navigator.clipboard.writeText(txt);alert("Link copiado!")}
  catch(e){document.getElementById("shareLink").select();document.execCommand("copy");alert("Link copiado!")}
}
function closeShareModal(){document.getElementById("shareModal").classList.remove("open")}
function tryLoadViewerMode(){
  if(!location.hash.startsWith("#atletas="))return;
  try{
    const snap=safeDecode(location.hash.replace("#atletas=",""));
    if(!snap||!Array.isArray(snap.athletes))return;
    state={athletes:snap.athletes};
    if(snap.month)document.getElementById("monthName").value=snap.month;
    isViewerMode=true;
    document.body.classList.add("viewer-mode");
    const banner=document.createElement("div");
    banner.className="viewer-banner no-print";
    banner.textContent="Modo atletas: visualização da pontuação, ranking e mata-mata";
    document.querySelector(".main-tabs").after(banner);
    setPage("ranking");
  }catch(e){alert("Não foi possível abrir o link dos atletas.")}
}


/* Link curto do aluno: ?aluno=1 */
function isStudentLink(){
  const params=new URLSearchParams(location.search);
  return params.get("aluno")==="1" || location.hash.startsWith("#atletas=");
}

const oldTryLoadViewerMode = typeof tryLoadViewerMode === "function" ? tryLoadViewerMode : null;
tryLoadViewerMode = function(){
  if(location.hash.startsWith("#atletas=") && oldTryLoadViewerMode){
    oldTryLoadViewerMode();
  }
  if(new URLSearchParams(location.search).get("aluno")==="1"){
    isViewerMode=true;
    document.body.classList.add("viewer-mode");
    if(!document.querySelector(".viewer-banner")){
      const banner=document.createElement("div");
      banner.className="viewer-banner no-print";
      banner.textContent="Modo atletas: Ranking Pontuador, Mata-Mata e Ranking Anual";
      const tabs=document.querySelector(".main-tabs");
      if(tabs) tabs.after(banner);
    }
    setTimeout(()=>{ if(typeof enforceStudentViewerMode==="function") enforceStudentViewerMode(); }, 80);
    if(typeof loadCloudState==="function") loadCloudState();
    setPage("ranking");
  }
};

fillSelects();loadMonth();loadCover();tryLoadViewerMode();renderAll();


const APP_VERSION = "2.1.1";
const AUTO_UPDATE_MODAL = false;
let waitingWorker = null;
let manualUpdateCheck = false;

function semverDifferent(a,b) {
  return String(a || "").trim() !== String(b || "").trim();
}

function updateLastCheck() {
  const el = document.getElementById("lastUpdateCheck");
  if (el) el.textContent = new Date().toLocaleString("pt-BR");
}

function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js?v=2.1.1");
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            waitingWorker = newWorker;
            showUpdateAvailable(APP_VERSION);
          }
        });
      });

      if (reg.waiting) {
        waitingWorker = reg.waiting;
        showUpdateAvailable(APP_VERSION);
      }

      /* atualização automática silenciosa desativada para não travar aluno */
    } catch (e) {}
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

async function checkForUpdates(showIfSame=false) {
  manualUpdateCheck = !!showIfSame;
  updateLastCheck();
  try {
    const response = await fetch("./app-version.json?ts=" + Date.now(), { cache: "no-store" });
    const info = await response.json();
    if (info && info.version && semverDifferent(info.version, APP_VERSION)) {
      if (showIfSame && AUTO_UPDATE_MODAL) showUpdateAvailable(info.version); else if (showIfSame) alert("Existe uma nova versão disponível. Use Config. > Atualizar aplicativo.");
      return true;
    }
    if (showIfSame) alert("Você já está usando a versão mais recente: v" + APP_VERSION);
    return false;
  } catch (e) {
    if (showIfSame) alert("Não foi possível verificar atualização agora.");
    return false;
  }
}

function showUpdateAvailable(newVersion) {
  if (document.body.classList.contains("viewer-mode")) return;
  if (!AUTO_UPDATE_MODAL && !manualUpdateCheck) return;
  const installed = document.getElementById("installedVersionText");
  const newest = document.getElementById("newVersionText");
  if (installed) installed.textContent = APP_VERSION;
  if (newest) newest.textContent = newVersion || "nova";
  const modal = document.getElementById("updateModal");
  if (modal) modal.classList.add("open");
}

function closeUpdateModal() {
  const modal = document.getElementById("updateModal");
  if (modal) modal.classList.remove("open");
}

async function clearAppCache() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        if (reg.active) reg.active.postMessage({ type: "CLEAR_CACHE" });
      }
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    alert("Cache limpo. O app será recarregado.");
    window.location.reload(true);
  } catch (e) {
    alert("Não foi possível limpar tudo automaticamente. Abra pelo Safari e atualize a página.");
  }
}

function applyAppUpdate() {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    return;
  }
  manualAppUpdate();
}

async function manualAppUpdate() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.update().catch(() => null)));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
  } catch (e) {}
  window.location.href = window.location.pathname + "?v=" + Date.now();
}

function showInstallHelp() {
  const el = document.getElementById("installHelp");
  if (el) el.classList.toggle("hidden");
}

function initAppVersionUI() {
  const current = document.getElementById("currentVersion");
  const footer = document.getElementById("footerVersion");
  if (current) current.textContent = APP_VERSION;
  if (footer) footer.textContent = APP_VERSION;
  setTimeout(() => checkForUpdates(false), 1200);
}


try{initAppVersionUI();}catch(e){}



/* ===================== SUPABASE ONLINE SYNC ===================== */
let primoSupabase = null;
let cloudReady = false;
let cloudSaveTimer = null;
let cloudLoadedOnce = false;

function setSyncStatus(message, type="warn"){
  const el=document.getElementById("syncStatus");
  if(!el)return;
  el.textContent=message;
  el.classList.remove("sync-ok","sync-warn","sync-error");
  el.classList.add(type==="ok"?"sync-ok":type==="error"?"sync-error":"sync-warn");
}

function initSupabaseClient(){
  try{
    const cfg=window.PRIMO_SUPABASE_CONFIG;
    if(!cfg || !cfg.url || !cfg.anonKey || cfg.url.includes("SEU-PROJETO")){
      setSyncStatus("Supabase não configurado. Dados salvos apenas neste aparelho.", "warn");
      return;
    }
    if(!window.supabase){
      setSyncStatus("Biblioteca Supabase não carregou. Verifique internet.", "error");
      return;
    }
    primoSupabase=window.supabase.createClient(cfg.url,cfg.anonKey);
    cloudReady=true;
    setSyncStatus("Supabase conectado. Carregando dados online...", "warn");
    loadCloudState();
  }catch(e){
    console.error(e);
    setSyncStatus("Erro ao iniciar Supabase.", "error");
  }
}

async function loadCloudState(){
  if(!cloudReady || !primoSupabase)return;
  try{
    const appId=window.PRIMO_SUPABASE_CONFIG.appId || "primo_soccer_league_2026";
    const {data,error}=await primoSupabase
      .from("primo_app_state")
      .select("data,updated_at")
      .eq("app_id",appId)
      .maybeSingle();

    if(error) throw error;

    if(data && data.data && Array.isArray(data.data.athletes)){
      state=data.data;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      cloudLoadedOnce=true;
      setSyncStatus("Dados online carregados e sincronizados.", "ok");
      if(typeof renderAll==="function") renderAll();
    }else{
      setSyncStatus("Banco online vazio. Salvando estado atual...", "warn");
      await saveCloudStateNow();
    }
  }catch(e){
    console.error(e);
    setSyncStatus("Não foi possível carregar dados online. Confira se executou o SQL no Supabase.", "error");
  }
}

function scheduleCloudSave(){
  if(!cloudReady || !primoSupabase)return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer=setTimeout(saveCloudStateNow,700);
}

async function saveCloudStateNow(){
  if(!cloudReady || !primoSupabase)return;
  try{
    const appId=window.PRIMO_SUPABASE_CONFIG.appId || "primo_soccer_league_2026";
    const payload=JSON.parse(JSON.stringify(state || {athletes:[]}));
    const {error}=await primoSupabase
      .from("primo_app_state")
      .upsert({
        app_id: appId,
        data: payload,
        updated_at: new Date().toISOString()
      }, {onConflict:"app_id"});
    if(error) throw error;
    setSyncStatus("Dados salvos online.", "ok");
  }catch(e){
    console.error(e);
    setSyncStatus("Erro ao salvar online. Dados ficaram salvos neste aparelho.", "error");
  }
}

async function forceCloudSync(){
  await saveCloudStateNow();
  await loadCloudState();
}

/* ================================================================ */


try{initSupabaseClient();}catch(e){console.error(e)}

function closeUpdateForViewer(){
  if(document.body.classList.contains("viewer-mode")){
    const m=document.getElementById("updateModal");
    if(m)m.classList.remove("open");
  }
}
setInterval(closeUpdateForViewer,1000);



/* ================= ID FIXO + DISPUTA MENSAL ================= */
const SCHEMA_ID_FIXO = 10;
const MESES_PRIMO = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];

function gerarIdAtleta(){
  return "ATL-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2,6).toUpperCase();
}

function mesAtual(){
  const el=document.getElementById("monthName");
  return el ? el.value : (state.currentMonth || "MAIO");
}

function semanasVazias(){
  return Array.from({length:5},()=>({}));
}

function normalizarEstado(){
  if(!state || typeof state!=="object") state={};
  if(!Array.isArray(state.athletes)) state.athletes=[];
  if(!state.months) state.months={};
  state.schemaVersion=SCHEMA_ID_FIXO;
  state.currentMonth=mesAtual();

  state.athletes.forEach(a=>{
    if(!a.id) a.id=gerarIdAtleta();
    if(!a.identityId) a.identityId=String(a.id);
    if(!a.createdAt) a.createdAt=new Date().toISOString();
    if(a.active===undefined) a.active=true;
  });

  // Migração de dados antigos para mês atual
  const m=mesAtual();
  if(!state.months[m]) state.months[m]={participants:{}};
  state.athletes.forEach(a=>{
    const id=idAtleta(a);
    if((a.slots&&a.slots.length) || (a.weeks&&a.weeks.some(w=>Object.keys(w||{}).length))){
      if(!state.months[m].participants[id]){
        state.months[m].participants[id]={
          athleteId:id,
          slots:Array.isArray(a.slots)?[...a.slots]:[],
          weeks:Array.isArray(a.weeks)?JSON.parse(JSON.stringify(a.weeks)):semanasVazias()
        };
      }
    }
  });
}

function idAtleta(a){ return String(a.identityId || a.id); }

function mesObj(m=mesAtual()){
  normalizarEstadoBasico();
  if(!state.months[m]) state.months[m]={participants:{}};
  return state.months[m];
}

function normalizarEstadoBasico(){
  if(!state || typeof state!=="object") state={athletes:[],months:{}};
  if(!Array.isArray(state.athletes)) state.athletes=[];
  if(!state.months) state.months={};
}

function participante(id,m=mesAtual(),criar=true){
  const mo=mesObj(m);
  const aid=typeof id==="object"?idAtleta(id):String(id);
  if(!mo.participants[aid] && criar){
    mo.participants[aid]={athleteId:aid,slots:[],weeks:semanasVazias()};
  }
  return mo.participants[aid]||null;
}

function horariosAtletaMes(a,m=mesAtual()){
  const p=participante(a,m,false);
  return p ? (p.slots||[]) : [];
}

function semanasAtletaMes(a,m=mesAtual()){
  const p=participante(a,m,true);
  if(!Array.isArray(p.weeks)) p.weeks=semanasVazias();
  return p.weeks;
}

function setHorarioAtletaMes(a,idx,val,m=mesAtual()){
  const p=participante(a,m,true);
  p.slots[idx]=val;
  p.slots=[...new Set((p.slots||[]).filter(Boolean))];
}

function scoreMes(a,week,slot,m=mesAtual()){
  const weeks=semanasAtletaMes(a,m);
  if(!weeks[week]) weeks[week]={};
  if(!weeks[week][slot]) weeks[week][slot]=emptyScore();
  return weeks[week][slot];
}

function totalSemanaMes(a,w,m=mesAtual()){
  const weeks=semanasAtletaMes(a,m);
  return slots.reduce((sum,sl)=>sum+(weeks[w]&&weeks[w][sl]?scoreFinal(weeks[w][sl]):0),0);
}

function totalMesAtleta(a,m=mesAtual()){
  return [0,1,2,3,4].reduce((sum,w)=>sum+totalSemanaMes(a,w,m),0);
}

function totalAnualIdentidade(a){
  const id=idAtleta(a);
  return Object.keys(state.months||{}).reduce((sum,m)=>{
    const p=state.months[m]?.participants?.[id];
    if(!p)return sum;
    const weeks=Array.isArray(p.weeks)?p.weeks:semanasVazias();
    return sum + [0,1,2,3,4].reduce((s,w)=>s+slots.reduce((ss,sl)=>ss+(weeks[w]&&weeks[w][sl]?scoreFinal(weeks[w][sl]):0),0),0);
  },0);
}

function atletasAtivosMes(m=mesAtual()){
  const mo=mesObj(m);
  const ids=new Set(Object.entries(mo.participants||{}).filter(([id,p])=>p&&p.slots&&p.slots.length).map(([id])=>id));
  return state.athletes.filter(a=>ids.has(idAtleta(a)) && a.active!==false);
}

function save(){
  normalizarEstadoBasico();
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  if(typeof scheduleCloudSave==="function") scheduleCloudSave();
}

function cadastrarAtletaBanco(){
  normalizarEstadoBasico();
  const input=document.getElementById("cadastroNomeAtleta");
  const nome=(input?.value||"").trim();
  if(!nome)return alert("Digite o nome do atleta.");
  const novo={id:gerarIdAtleta(),identityId:"",name:nome,photo:"",active:true,createdAt:new Date().toISOString()};
  novo.identityId=novo.id;
  state.athletes.push(novo);
  if(input)input.value="";
  save();
  renderAll();
  setPage("cadastro");
}

function renderCadastro(){
  normalizarEstado();
  const body=document.getElementById("cadastroBody");
  if(!body)return;
  const ativos=new Set(atletasAtivosMes().map(a=>idAtleta(a)));
  body.innerHTML=state.athletes.filter(a=>a.active!==false).map((a,i)=>{
    const id=idAtleta(a);
    return `<tr>
      <td>${i+1}</td>
      <td>${photoHtml(a)}</td>
      <td><input value="${esc(a.name)}" oninput="editarNomeAtletaBanco('${id}',this.value)">${ativos.has(id)?`<br><span class="active-month-badge">Ativo em ${mesAtual()}</span>`:""}</td>
      <td><span class="id-badge">${id}</span></td>
      <td><strong>${totalAnualIdentidade(a)} pts</strong></td>
      <td><div class="athlete-actions">
        <button class="success" onclick="selecionarAtletaParaMes('${id}')">Selecionar no mês</button>
        <button class="stats-btn" onclick="openStats('${id}')">Estatísticas</button>
      </div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="6">Nenhum atleta cadastrado.</td></tr>`;
}

function editarNomeAtletaBanco(id,nome){
  const a=state.athletes.find(x=>idAtleta(x)===String(id));
  if(a){a.name=nome;save();renderSelectBanco();}
}

function renderSelectBanco(){
  const sel=document.getElementById("selectAtletaBanco");
  if(!sel)return;
  const ativos=new Set(atletasAtivosMes().map(a=>idAtleta(a)));
  sel.innerHTML=state.athletes.filter(a=>a.active!==false).map(a=>{
    const id=idAtleta(a);
    return `<option value="${id}">${esc(a.name)}${ativos.has(id)?" — já ativo":""}</option>`;
  }).join("") || `<option value="">Cadastre atletas primeiro</option>`;

  const h1=document.getElementById("selectHorario1");
  const h2=document.getElementById("selectHorario2");
  if(h1) h1.innerHTML=slots.map(s=>`<option>${s}</option>`).join("");
  if(h2) h2.innerHTML=`<option value="">Sem segundo treino</option>`+slots.map(s=>`<option>${s}</option>`).join("");
}

function adicionarAtletaNoMes(){
  normalizarEstado();
  const id=document.getElementById("selectAtletaBanco")?.value;
  if(!id)return alert("Selecione um atleta.");
  const a=state.athletes.find(x=>idAtleta(x)===String(id));
  if(!a)return alert("Atleta não encontrado.");
  const h1=document.getElementById("selectHorario1")?.value||"";
  const h2=document.getElementById("selectHorario2")?.value||"";
  if(!h1&&!h2)return alert("Escolha pelo menos um horário.");
  const p=participante(a,mesAtual(),true);
  p.slots=[h1,h2].filter(Boolean);
  if(!Array.isArray(p.weeks))p.weeks=semanasVazias();
  save();
  renderAll();
}

function selecionarAtletaParaMes(id){
  const a=state.athletes.find(x=>idAtleta(x)===String(id));
  if(!a)return;
  const p=participante(a,mesAtual(),true);
  if(!p.slots||!p.slots.length)p.slots=[slots[0]];
  save();
  setPage("athletes");
  renderAll();
}

function renderAtletasMes(){
  normalizarEstado();
  const body=document.getElementById("atletasMesBody");
  if(!body)return;
  const list=atletasAtivosMes();
  body.innerHTML=list.map((a,i)=>{
    const id=idAtleta(a);
    return `<tr>
      <td>${i+1}</td>
      <td>${photoHtml(a)}</td>
      <td><strong>${esc(a.name)}</strong><br><span class="id-badge">${id}</span></td>
      <td><select onchange="editarHorarioMes('${id}',0,this.value)"><option value="">Fora do mês</option>${slots.map(s=>`<option ${horariosAtletaMes(a)[0]===s?"selected":""}>${s}</option>`).join("")}</select></td>
      <td><select onchange="editarHorarioMes('${id}',1,this.value)"><option value="">Sem segundo treino</option>${slots.map(s=>`<option ${horariosAtletaMes(a)[1]===s?"selected":""}>${s}</option>`).join("")}</select></td>
      <td><strong>${totalMesAtleta(a)} pts</strong></td>
      <td><div class="athlete-actions">
        <button class="stats-btn" onclick="openStats('${id}')">Estatísticas</button>
        <button class="danger" onclick="removerAtletaDoMes('${id}')">Remover do mês</button>
      </div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="7">Nenhum atleta selecionado para ${mesAtual()}.</td></tr>`;
}

function editarHorarioMes(id,idx,val){
  const a=state.athletes.find(x=>idAtleta(x)===String(id));
  if(a){setHorarioAtletaMes(a,idx,val);save();renderAll();}
}

function removerAtletaDoMes(id){
  if(!confirm("Remover atleta apenas deste mês? Os pontos já lançados e meses anteriores serão preservados."))return;
  const p=participante(id,mesAtual(),false);
  if(p)p.slots=[];
  save();
  renderAll();
}

function copiarAgendaMesAnterior(){
  const idx=MESES_PRIMO.indexOf(mesAtual());
  if(idx<=0)return alert("Não existe mês anterior para copiar.");
  const prev=MESES_PRIMO[idx-1], atual=mesAtual();
  const prevObj=mesObj(prev), atualObj=mesObj(atual);
  Object.entries(prevObj.participants||{}).forEach(([id,p])=>{
    if(!atualObj.participants[id])atualObj.participants[id]={athleteId:id,slots:[...(p.slots||[])],weeks:semanasVazias()};
    else if(!(atualObj.participants[id].slots||[]).length)atualObj.participants[id].slots=[...(p.slots||[])];
  });
  save();renderAll();alert("Agenda copiada. Pontos antigos continuam salvos no mês anterior.");
}

function limparAgendaMesAtual(){
  if(!confirm("Limpar a agenda do mês atual? Os pontos já lançados continuarão salvos por atleta, mas eles sairão da disputa ativa do mês."))return;
  const mo=mesObj(mesAtual());
  Object.values(mo.participants||{}).forEach(p=>p.slots=[]);
  save();renderAll();
}

/* Overrides centrais */
function ranked(){
  return atletasAtivosMes().map(a=>({...a,total:totalMesAtleta(a),weekTotals:[0,1,2,3,4].map(i=>totalSemanaMes(a,i))})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
}

function rankedYear(){
  return state.athletes.filter(a=>a.active!==false).map(a=>({...a,yearTotal:totalAnualIdentidade(a),monthTotal:totalMesAtleta(a)})).sort((a,b)=>b.yearTotal-a.yearTotal||a.name.localeCompare(b.name));
}

function topAfterWeek2(){
  return atletasAtivosMes().map(a=>({...a,seedPoints:totalSemanaMes(a,0)+totalSemanaMes(a,1),total:totalMesAtleta(a)})).sort((a,b)=>b.seedPoints-a.seedPoints||a.name.localeCompare(b.name)).slice(0,8);
}

function koWinner(a,b,weekIndex){
  if(!a&&!b)return null;if(a&&!b)return a;if(!a&&b)return b;
  const pa=totalSemanaMes(a,weekIndex),pb=totalSemanaMes(b,weekIndex);
  if(pa>pb)return a;if(pb>pa)return b;return null;
}

function renderScoreTable(){
  renderWeeks();
  const sl=document.getElementById("sessionSlot").value;
  document.getElementById("sessionTitle").textContent=`${mesAtual()} • Semana ${currentWeek+1} • ${sl}`;
  const list=atletasAtivosMes().filter(a=>horariosAtletaMes(a).includes(sl));
  document.getElementById("scoreBody").innerHTML=list.map((a,i)=>{
    const s=scoreMes(a,currentWeek,sl);
    return `<tr>
<td class="sticky-num">${i+1}</td>
<td class="sticky-player"><div class="player-cell">${photoHtml(a)}<strong>${esc(a.name)}</strong></div></td>
<td><input type="number" inputmode="numeric" value="${s.pd}" oninput="setScore('${idAtleta(a)}','${sl}','pd',this.value,this)"></td>
<td><input type="number" inputmode="numeric" value="${s.pe}" oninput="setScore('${idAtleta(a)}','${sl}','pe',this.value,this)"></td>
<td class="total-cell">${scoreBase(s)}</td>
<td><select onchange="setScore('${idAtleta(a)}','${sl}','bonus',this.value,this)"><option value="0" ${s.bonus==0?"selected":""}>0</option><option value="5" ${s.bonus==5?"selected":""}>5</option><option value="7" ${s.bonus==7?"selected":""}>7</option></select></td>
<td class="final-cell">${scoreFinal(s)}</td>
</tr>`;
  }).join("") || `<tr><td colspan="7">Nenhum atleta neste horário em ${mesAtual()}.</td></tr>`;
  updateRanking();
}

function setScore(id,sl,field,val,el){
  const a=state.athletes.find(x=>idAtleta(x)===String(id));
  if(!a)return;
  const s=scoreMes(a,currentWeek,sl);
  s[field]=n(val);
  save();
  const tr=el.closest("tr");
  tr.querySelector(".total-cell").textContent=scoreBase(s);
  tr.querySelector(".final-cell").textContent=scoreFinal(s);
  updateRanking();
  if(typeof renderKnockout==="function")renderKnockout();
  if(typeof renderYearTotal==="function")renderYearTotal();
}

function renderAgenda(){
  const grid=document.getElementById("agendaGrid");
  if(!grid)return;
  grid.innerHTML=slotData.map(slot=>{
    const list=atletasAtivosMes().filter(a=>horariosAtletaMes(a).includes(slot.name));
    const usadas=list.length,livres=Math.max(slot.vagas-usadas,0),full=usadas>=slot.vagas;
    return `<div class="agenda-card ${full?'full':''}">
      <div class="agenda-card-header"><h3>${slot.name}</h3><span class="vagas-badge">${usadas}/${slot.vagas} vagas</span></div>
      <div class="agenda-list">
        ${list.length?list.map(a=>`<div class="agenda-athlete">${a.photo?`<img src="${a.photo}">`:`<span class="agenda-avatar">${initials(a.name)}</span>`}<strong>${esc(a.name)}</strong></div>`).join(""):`<div class="empty-agenda">Nenhum atleta neste horário.</div>`}
        ${livres>0?`<div class="empty-agenda">Disponíveis: ${livres}</div>`:`<div class="empty-agenda">Horário completo</div>`}
      </div>
    </div>`;
  }).join("");
}

function clearCurrentSession(){
  const sl=document.getElementById("sessionSlot").value;
  if(!confirm(`Limpar pontuação de ${sl} em ${mesAtual()} • Semana ${currentWeek+1}?`))return;
  atletasAtivosMes().forEach(a=>{const weeks=semanasAtletaMes(a);if(weeks[currentWeek]&&weeks[currentWeek][sl])weeks[currentWeek][sl]=emptyScore();});
  save();renderScoreTable();
}

function renderAthletes(){renderSelectBanco();renderAtletasMes();}

function renderAll(){
  normalizarEstado();
  renderWeeks();
  renderCadastro();
  renderSelectBanco();
  renderAtletasMes();
  renderAgenda();
  renderScoreTable();
  if(typeof renderKnockout==="function")renderKnockout();
  if(typeof renderYearTotal==="function")renderYearTotal();
  updateRanking();
}

function setPage(p){
  if(document.body.classList.contains("viewer-mode")){
    const allowed=["ranking","knockout","year"];
    if(!allowed.includes(p))p="ranking";
  }
  ["score","cadastro","athletes","agenda","knockout","year","ranking","config"].forEach(x=>{
    const page=document.getElementById("page"+cap(x));
    const tab=document.getElementById("tab"+(x==="cadastro"?"Cadastro":cap(x)));
    if(page)page.classList.toggle("hidden",x!==p);
    if(tab)tab.classList.toggle("active",x===p);
  });
  if(p==="cadastro")renderCadastro();
  if(p==="athletes"){renderSelectBanco();renderAtletasMes();}
}

document.getElementById("monthName")?.addEventListener("change",e=>{
  state.currentMonth=e.target.value;
  localStorage.setItem(MONTH_KEY,e.target.value);
  normalizarEstado();
  save();
  renderAll();
});

try{renderAll();}catch(e){console.error(e)}
/* ============================================================ */
