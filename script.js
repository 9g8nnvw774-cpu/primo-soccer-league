const SUPABASE_URL="https://edsryflpvspwtcaahvhy.supabase.co";
const SUPABASE_KEY="sb_publishable_gtql54XF2okza9t0uZH6Yg_28oX6YNz";
const APP_ID="primo_soccer_league_2026";
const STORAGE_KEY="primo_league_state_v31";
const MONTHS=["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
const slotData=[{name:"Segunda 19:30",vagas:8},{name:"Terça 11:30",vagas:6},{name:"Terça 18:30",vagas:6},{name:"Terça 19:30",vagas:8},{name:"Quarta 19:30",vagas:8},{name:"Quinta 11:30",vagas:6},{name:"Quinta 18:30",vagas:6},{name:"Quinta 19:30",vagas:8}];
const slots=slotData.map(s=>s.name);
let state=loadLocal(), currentWeek=1, supa=null, saveTimer=null; let photoUploadInProgress=false;
function defaultState(){return {athletes:[],months:{},currentMonth:"MAIO",schemaVersion:31}}
function loadLocal(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||defaultState()}catch(e){return defaultState()}}
function n(v){const x=Number(v);return Number.isFinite(x)?x:0}
function esc(t){return String(t??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function initials(name){return String(name||"A").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"A"}
function uid(){return "ATL-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,6).toUpperCase()}
function month(){const el=document.getElementById("monthName");return state.currentMonth || (el&&el.value) || "MAIO"}
function norm(){if(!state||typeof state!=="object")state=defaultState();if(!Array.isArray(state.athletes))state.athletes=[];if(!state.months)state.months={};if(!state.currentMonth)state.currentMonth="MAIO";state.schemaVersion=31;state.athletes.forEach(a=>{if(!a.id)a.id=uid();if(!a.identityId)a.identityId=a.id;if(a.active===undefined)a.active=true});if(!state.months[month()])state.months[month()]={participants:{}}}
function monthObj(m=state.currentMonth||month()){norm();if(!state.months[m])state.months[m]={participants:{}};return state.months[m]}
function idOf(a){return String(a.identityId||a.id)}
function participant(aOrId,m=month(),create=true){const id=typeof aOrId==="object"?idOf(aOrId):String(aOrId);const mo=monthObj(m);if(!mo.participants[id]&&create)mo.participants[id]={athleteId:id,slots:[],weeks:Array.from({length:5},()=>({}))};return mo.participants[id]||null}
function slotsOf(a,m=month()){const p=participant(a,m,false);return p&&Array.isArray(p.slots)?p.slots:[]}
function weeksOf(a,m=month()){const p=participant(a,m,true);if(!Array.isArray(p.weeks))p.weeks=Array.from({length:5},()=>({}));return p.weeks}
function emptyScore(){return {pd:0,pe:0,bonus:0}}
function scoreBase(s){return n(s.pd)+n(s.pe)}
function scoreFinal(s){return scoreBase(s)+n(s.bonus)}
function getScore(a,w,sl,m=month()){const weeks=weeksOf(a,m);if(!weeks[w])weeks[w]={};if(!weeks[w][sl])weeks[w][sl]=emptyScore();return weeks[w][sl]}
function weekTotal(a,w,m=month()){const weeks=weeksOf(a,m);return slots.reduce((sum,sl)=>sum+(weeks[w]?.[sl]?scoreFinal(weeks[w][sl]):0),0)}
function monthTotal(a,m=month()){return [0,1,2,3,4].reduce((sum,w)=>sum+weekTotal(a,w,m),0)}
function monthTotalById(id,m){const a=state.athletes.find(x=>idOf(x)===id);return a?monthTotal(a,m):0}
function yearTotal(a){const id=idOf(a);return Object.keys(state.months||{}).reduce((sum,m)=>{const p=state.months[m]?.participants?.[id];if(!p)return sum;return sum+[0,1,2,3,4].reduce((s,w)=>s+slots.reduce((ss,sl)=>ss+(p.weeks?.[w]?.[sl]?scoreFinal(p.weeks[w][sl]):0),0),0)},0)}
function activeAthletes(m=month()){const ids=new Set(Object.entries(monthObj(m).participants||{}).filter(([id,p])=>p?.slots?.length).map(([id])=>id));return state.athletes.filter(a=>a.active!==false&&ids.has(idOf(a)))}
function ranked(){return activeAthletes().map(a=>({...a,total:monthTotal(a),weekTotals:[0,1,2,3,4].map(i=>weekTotal(a,i))})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name))}
function rankedYear(){return state.athletes.filter(a=>a.active!==false).map(a=>({...a,year:yearTotal(a),current:monthTotal(a)})).sort((a,b)=>b.year-a.year||a.name.localeCompare(b.name))}
function saveLocal(){norm();localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function scheduleSave(){saveLocal();clearTimeout(saveTimer);saveTimer=setTimeout(saveCloud,600)}
function setSync(msg,type="warn"){const el=document.getElementById("syncStatus");if(el){el.textContent=msg;el.style.color=type==="ok"?"#8ff0b3":type==="error"?"#ff8b8b":"#ffe082"}}
async function initCloud(){try{supa=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);await loadCloud()}catch(e){setSync("Erro Supabase: "+e.message,"error")}}
async function loadCloud(){try{ if(photoUploadInProgress)return;const {data,error}=await supa.from("primo_app_state").select("data").eq("app_id",APP_ID).maybeSingle();if(error)throw error;if(data?.data){state=data.data;norm();saveLocal();setSync("Dados online carregados.","ok")}else await saveCloud();renderAll()}catch(e){setSync("Erro ao carregar online. Execute o SQL.","error");console.error(e)}}
async function saveCloud(){if(!supa)return;try{norm();const {error}=await supa.from("primo_app_state").upsert({app_id:APP_ID,data:state,updated_at:new Date().toISOString()},{onConflict:"app_id"});if(error)throw error;setSync("Dados salvos online.","ok"); if(!document.activeElement || !["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)) renderAll()}catch(e){setSync("Erro ao salvar online.","error");console.error(e)}}
function cap(p){return {dashboard:"Dashboard",cadastro:"Cadastro",atletas:"Atletas",agenda:"Agenda",treinos:"Treinos",ranking:"Ranking",knockout:"Knockout",year:"Year",print:"Print",config:"Config"}[p]}
function setPage(p){if(document.body.classList.contains("student-mode")&&!["ranking","knockout","year"].includes(p))p="ranking";["dashboard","cadastro","atletas","agenda","treinos","ranking","knockout","year","print","config"].forEach(x=>{document.getElementById("page"+cap(x))?.classList.toggle("hidden",x!==p);document.getElementById("tab"+cap(x))?.classList.toggle("active",x===p)});renderAll()}
function renderAll(){norm();renderMonths();renderSlotSelects();renderWeeks();renderDashboard();renderCadastro();renderBankSelect();renderCopyMonthSelect();renderMonthAthletes();renderScore();renderAgenda();renderRanking();renderYear();renderKnockout();document.querySelectorAll(".current-month-label").forEach(e=>e.textContent=month())}
function renderMonths(){
  const sel=document.getElementById("monthName");
  if(!state.currentMonth) state.currentMonth="MAIO";
  if(sel && !sel.dataset.ready){
    sel.innerHTML=MONTHS.map(m=>`<option value="${m}">${m}</option>`).join("");
    sel.dataset.ready="1";
    sel.onchange=()=>{
      state.currentMonth=sel.value;
      const hero=document.getElementById("heroMonth");
      if(hero) hero.textContent=state.currentMonth;
      norm();
      scheduleSave();
      renderAll();
    };
  }
  if(sel && sel.value!==state.currentMonth){
    sel.value=state.currentMonth;
  }
  const hero=document.getElementById("heroMonth");
  if(hero) hero.textContent=state.currentMonth;
}
function renderSlotSelects(){
  const keep1=document.getElementById("slot1Select")?.value || "";
  const keep2=document.getElementById("slot2Select")?.value || "";
  const keepSession=document.getElementById("sessionSlot")?.value || "";

  ["sessionSlot","slot1Select"].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const current = id==="sessionSlot" ? keepSession : keep1;
    el.innerHTML=slots.map(s=>`<option value="${s}">${s}</option>`).join("");
    if(current && [...el.options].some(o=>o.value===current)) el.value=current;
  });

  const s2=document.getElementById("slot2Select");
  if(s2){
    s2.innerHTML='<option value="">Sem segundo treino</option>'+slots.map(s=>`<option value="${s}">${s}</option>`).join("");
    if(keep2 && [...s2.options].some(o=>o.value===keep2)) s2.value=keep2;
  }
}
function renderWeeks(){const el=document.getElementById("weekTabs");if(el)el.innerHTML=[0,1,2,3,4].map(i=>`<button class="${i===currentWeek?"active":""}" onclick="currentWeek=${i};renderAll()">SEMANA ${i+1}</button>`).join("")}
function photoHtml(a){return `<label class="photo-label">${a.photo?`<img src="${a.photo}" class="avatar">`:`<span class="avatar-placeholder">${initials(a.name)}</span>`}<input class="photo-input" type="file" accept="image/*" onchange="loadPhoto(event,'${idOf(a)}')"></label>`}
function loadPhoto(e,id){ photoUploadInProgress=true;
  const f=e.target.files && e.target.files[0];
  if(!f)return;

  const reader=new FileReader();
  reader.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const maxSize=420;
      let w=img.width, h=img.height;
      if(w>h && w>maxSize){ h=Math.round(h*maxSize/w); w=maxSize; }
      else if(h>=w && h>maxSize){ w=Math.round(w*maxSize/h); h=maxSize; }

      const canvas=document.createElement("canvas");
      canvas.width=w;
      canvas.height=h;
      const ctx=canvas.getContext("2d");
      ctx.drawImage(img,0,0,w,h);

      const compressed=canvas.toDataURL("image/jpeg",0.82);
      const a=state.athletes.find(x=>idOf(x)===String(id));

      if(a){
        a.photo=compressed;
        saveLocal();

        clearTimeout(saveTimer);
        saveTimer=setTimeout(async()=>{
          await saveCloud();
          renderAll();
        },500);

        renderAll();
        photoUploadInProgress=false; setSync("Foto do atleta salva.", "ok");
      }
    };
    img.src=reader.result;
  };
  reader.readAsDataURL(f);
}

function createAthlete(){const name=document.getElementById("athleteNameInput").value.trim();const age=document.getElementById("athleteAgeInput").value.trim();if(!name)return alert("Digite o nome do atleta.");const a={id:uid(),identityId:"",name,age,photo:"",active:true,createdAt:new Date().toISOString()};a.identityId=a.id;state.athletes.push(a);document.getElementById("athleteNameInput").value="";document.getElementById("athleteAgeInput").value="";scheduleSave();renderAll();alert("Atleta cadastrado!")}
function renderCadastro(){const body=document.getElementById("athleteBankBody");if(!body)return;body.innerHTML=state.athletes.filter(a=>a.active!==false).map((a,i)=>`<tr><td>${i+1}</td><td>${photoHtml(a)}</td><td><input value="${esc(a.name)}" oninput="editAthlete('${idOf(a)}','name',this.value)"></td><td><input value="${esc(a.age||'')}" oninput="editAthlete('${idOf(a)}','age',this.value)"></td><td><span class="id-badge">${idOf(a)}</span></td><td><strong>${yearTotal(a)}</strong></td><td><div class="actions"><button class="success" onclick="quickAdd('${idOf(a)}')">Selecionar</button><button class="stats-btn" onclick="openStats('${idOf(a)}')">Stats</button><button class="delete-btn" onclick="deleteAthleteFull('${idOf(a)}')">Excluir</button></div></td></tr>`).join("")||'<tr><td colspan="7">Nenhum atleta cadastrado.</td></tr>'}
function editAthlete(id,field,value){const a=state.athletes.find(x=>idOf(x)===id);if(a){a[field]=value;scheduleSave();renderBankSelect()}}
function renderBankSelect(){
  const sel=document.getElementById("bankSelect");
  if(!sel)return;
  const previous=sel.value;
  const active=new Set(activeAthletes().map(a=>idOf(a)));
  sel.innerHTML=state.athletes
    .filter(a=>a.active!==false)
    .map(a=>`<option value="${idOf(a)}">${esc(a.name)}${active.has(idOf(a))?" — ativo":""}</option>`)
    .join("")||'<option value="">Cadastre atletas</option>';
  if(previous && [...sel.options].some(o=>o.value===previous)){
    sel.value=previous;
  }
}
function addAthleteToMonth(){const id=document.getElementById("bankSelect").value;if(!id)return alert("Selecione um atleta.");const s1=document.getElementById("slot1Select").value;const s2=document.getElementById("slot2Select").value;const p=participant(id);p.slots=[s1,s2].filter(Boolean);if(!Array.isArray(p.weeks))p.weeks=Array.from({length:5},()=>({}));scheduleSave();renderAll();alert("Atleta adicionado ao mês.")}
function quickAdd(id){const p=participant(id);if(!p.slots.length)p.slots=[slots[0]];scheduleSave();setPage("atletas")}
function renderMonthAthletes(){const body=document.getElementById("monthAthletesBody");if(!body)return;const list=activeAthletes();body.innerHTML=list.map((a,i)=>`<tr><td>${i+1}</td><td>${photoHtml(a)}</td><td><strong>${esc(a.name)}</strong><br><span class="id-badge">${idOf(a)}</span></td><td><select onchange="editSlot('${idOf(a)}',0,this.value)"><option value="">Fora do mês</option>${slots.map(s=>`<option value="${s}" ${slotsOf(a)[0]===s?"selected":""}>${s}</option>`).join("")}</select></td><td><select onchange="editSlot('${idOf(a)}',1,this.value)"><option value="">Sem segundo treino</option>${slots.map(s=>`<option value="${s}" ${slotsOf(a)[1]===s?"selected":""}>${s}</option>`).join("")}</select></td><td><strong>${monthTotal(a)}</strong></td><td><div class="actions"><button class="stats-btn" onclick="openStats('${idOf(a)}')">Stats</button><button class="danger" onclick="removeFromMonth('${idOf(a)}')">Remover</button></div></td></tr>`).join("")||`<tr><td colspan="7">Nenhum atleta ativo em ${month()}.</td></tr>`}
function editSlot(id,idx,val){const p=participant(id);p.slots[idx]=val;p.slots=[...new Set(p.slots.filter(Boolean))];scheduleSave();renderAll()}
function removeFromMonth(id){if(!confirm("Remover apenas deste mês? Os pontos permanecem salvos."))return;const p=participant(id,month(),false);if(p)p.slots=[];scheduleSave();renderAll()}

function renderCopyMonthSelect(){
  const sel=document.getElementById("copyFromMonthSelect");
  if(!sel)return;
  const current=month();
  const available=MONTHS.filter(m=>{
    if(m===current)return false;
    const participants=state.months?.[m]?.participants || {};
    return Object.values(participants).some(p=>p && Array.isArray(p.slots) && p.slots.length);
  });

  sel.innerHTML=available.length
    ? available.map(m=>`<option value="${m}">${m}</option>`).join("")
    : '<option value="">Nenhum mês com agenda</option>';
}

function copyMonthAgenda(){
  norm();
  const sel=document.getElementById("copyFromMonthSelect");
  const sourceMonth=sel ? sel.value : "";
  const targetMonth=month();

  if(!sourceMonth){
    alert("Nenhum mês anterior com atletas na agenda foi encontrado.");
    return;
  }

  if(sourceMonth===targetMonth){
    alert("Escolha um mês diferente do mês atual.");
    return;
  }

  const source=monthObj(sourceMonth);
  const target=monthObj(targetMonth);

  const entries=Object.entries(source.participants||{})
    .filter(([id,p])=>p && Array.isArray(p.slots) && p.slots.length);

  if(!entries.length){
    alert("Esse mês não possui atletas com horários para copiar.");
    return;
  }

  if(!confirm(`Copiar ${entries.length} atleta(s) e horários de ${sourceMonth} para ${targetMonth}? O novo mês começará com pontuação zerada.`)){
    return;
  }

  // Preserva pontos já existentes do mês atual se o atleta já tiver pontuação,
  // mas atualiza horários. Para novos atletas no mês, cria semanas zeradas.
  entries.forEach(([id,p])=>{
    if(!target.participants[id]){
      target.participants[id]={
        athleteId:id,
        slots:[...(p.slots||[])],
        weeks:Array.from({length:5},()=>({}))
      };
    }else{
      target.participants[id].slots=[...(p.slots||[])];
      if(!Array.isArray(target.participants[id].weeks)){
        target.participants[id].weeks=Array.from({length:5},()=>({}));
      }
    }
  });

  scheduleSave();
  renderAll();
  alert(`Agenda de ${sourceMonth} copiada para ${targetMonth}. Pontuação do novo mês ficou zerada para novos atletas.`);
}

// Mantém compatibilidade com o botão antigo, caso ainda exista em cache.
function copyPreviousMonth(){
  renderCopyMonthSelect();
  const sel=document.getElementById("copyFromMonthSelect");
  if(sel && sel.value){
    copyMonthAgenda();
    return;
  }

  const currentIndex=MONTHS.indexOf(month());
  if(currentIndex<=0){
    alert("Não há mês anterior para copiar.");
    return;
  }

  const previousMonth=MONTHS[currentIndex-1];
  const targetMonth=month();
  const source=monthObj(previousMonth);
  const target=monthObj(targetMonth);

  const entries=Object.entries(source.participants||{}).filter(([id,p])=>p && Array.isArray(p.slots) && p.slots.length);
  if(!entries.length){
    alert("O mês anterior não possui atletas na agenda para copiar.");
    return;
  }

  entries.forEach(([id,p])=>{
    target.participants[id]={
      athleteId:id,
      slots:[...(p.slots||[])],
      weeks:Array.from({length:5},()=>({}))
    };
  });

  scheduleSave();
  renderAll();
  alert("Agenda copiada com sucesso.");
}

function clearMonthSchedule(){if(!confirm("Limpar agenda do mês? Pontos ficam salvos."))return;Object.values(monthObj().participants||{}).forEach(p=>p.slots=[]);scheduleSave();renderAll()}
function renderScore(){const sl=document.getElementById("sessionSlot")?.value||slots[0];const title=document.getElementById("sessionTitle");if(title)title.textContent=`PONTUAÇÃO - ETAPA: ${month()} • SEMANA ${currentWeek+1} • ${sl}`;const body=document.getElementById("scoreBody");if(!body)return;const list=activeAthletes().filter(a=>slotsOf(a).includes(sl));body.innerHTML=list.map((a,i)=>{const s=getScore(a,currentWeek,sl);return `<tr><td>${i+1}</td><td class="sticky-athlete"><div class="player-cell">${photoHtml(a)}<strong>${esc(a.name)}</strong></div></td><td><input type="number" inputmode="numeric" value="${s.pd}" class="score-input" oninput="setScoreLive('${idOf(a)}','${sl}','pd',this.value,this)"></td><td><input type="number" inputmode="numeric" value="${s.pe}" class="score-input" oninput="setScoreLive('${idOf(a)}','${sl}','pe',this.value,this)"></td><td><select class="bonus-select" onchange="setScoreLive('${idOf(a)}','${sl}','bonus',this.value,this)"><option value="0" ${s.bonus==0?"selected":""}>0</option><option value="5" ${s.bonus==5?"selected":""}>5</option><option value="7" ${s.bonus==7?"selected":""}>7</option></select></td><td class="final-cell"><strong>${scoreFinal(s)}</strong></td></tr>`}).join("")||'<tr><td colspan="6">Nenhum atleta neste horário.</td></tr>';const best=list.map(a=>({name:a.name,pts:weekTotal(a,currentWeek)})).sort((a,b)=>b.pts-a.pts)[0];const box=document.getElementById("bestWeekBox");if(box)box.innerHTML=best?`MELHOR DA SEMANA: <strong>${esc(best.name)}</strong> • ${best.pts} PTS`:""}

function setScoreLive(id,sl,field,val,el){
  const a=state.athletes.find(x=>idOf(x)===id);
  if(!a)return;
  const s=getScore(a,currentWeek,sl);
  s[field]=n(val);
  saveLocal();
  clearTimeout(saveTimer);
  saveTimer=setTimeout(saveCloud,700);
  const tr=el.closest("tr");
  if(tr){
    const totalCell=tr.querySelector(".final-cell strong") || tr.querySelector(".final-cell");
    if(totalCell) totalCell.textContent=scoreFinal(s);
  }
  // Atualiza ranking e totais sem reconstruir a tabela de digitação
  renderRanking();
  renderYear();
  renderKnockout();
  renderDashboard();
}

function setScore(id,sl,field,val,el){const a=state.athletes.find(x=>idOf(x)===id);if(!a)return;const s=getScore(a,currentWeek,sl);s[field]=n(val);scheduleSave();renderScore();renderRanking();renderYear();renderKnockout();renderDashboard()}
function clearCurrentSession(){const sl=document.getElementById("sessionSlot").value;if(!confirm("Limpar este horário?"))return;activeAthletes().forEach(a=>{const w=weeksOf(a);if(w[currentWeek]?.[sl])w[currentWeek][sl]=emptyScore()});scheduleSave();renderAll()}
function renderAgenda(){const grid=document.getElementById("agendaGrid");if(!grid)return;grid.innerHTML=slotData.map(slot=>{const list=activeAthletes().filter(a=>slotsOf(a).includes(slot.name));return `<div class="agenda-card"><div class="agenda-head"><strong>${slot.name}</strong><span class="badge">${list.length}/${slot.vagas}</span></div><div class="agenda-list">${list.map(a=>`<div class="agenda-athlete"><span>${esc(a.name)}</span><strong>${monthTotal(a)} pts</strong></div>`).join("")||"<div>Nenhum atleta</div>"}</div></div>`}).join("")}
function renderRanking(){const el=document.getElementById("rankingList");if(!el)return;el.innerHTML=ranked().map((a,i)=>`<div class="rank-row"><div class="rank-left"><span>${i===0?"🥇":i===1?"🥈":i===2?"🥉":"⚽"}</span><span class="rank-photo">${a.photo?`<img src="${a.photo}" class="avatar">`:`<span class="avatar-placeholder">${initials(a.name)}</span>`}</span><span>${i+1}º - ${esc(a.name)}</span></div><strong>${a.total} pts</strong></div>`).join("")||"<div>Nenhum atleta ativo.</div>"}
function renderYear(){const body=document.getElementById("yearBody");if(!body)return;body.innerHTML=rankedYear().map((a,i)=>`<tr><td>${i+1}</td><td>${esc(a.name)}</td>${MONTHS.map(m=>`<td>${monthTotalById(idOf(a),m)||"-"}</td>`).join("")}<td><strong>${a.year}</strong></td></tr>`).join("")}

function koState(){
  const mo=monthObj();
  if(!mo.knockout) mo.knockout={startWeek:2,seeds:["","","","","","","",""]};
  if(!Array.isArray(mo.knockout.seeds)) mo.knockout.seeds=["","","","","","","",""];
  if(mo.knockout.startWeek===undefined) mo.knockout.startWeek=2;
  return mo.knockout;
}

function setKnockoutStartWeek(value){
  koState().startWeek=Number(value);
  scheduleSave();
  renderKnockout();
}

function pointsUntilWeek(a,lastWeekIndex){
  let total=0;
  for(let w=0; w<=lastWeekIndex; w++) total+=weekTotal(a,w);
  return total;
}

function rankedForKnockout(){
  return activeAthletes()
    .map(a=>({...a,seedPoints:pointsUntilWeek(a,1)}))
    .sort((a,b)=>b.seedPoints-a.seedPoints||a.name.localeCompare(b.name));
}

function renderKnockoutSelectors(){
  const box=document.getElementById("knockoutSelectors");
  if(!box)return;
  const ko=koState();
  const start=document.getElementById("koStartWeek");
  if(start) start.value=String(ko.startWeek);

  const athletes=activeAthletes();
  const options='<option value="">Selecionar atleta</option>'+athletes
    .map(a=>`<option value="${idOf(a)}">${esc(a.name)} • ${pointsUntilWeek(a,1)} pts até S2</option>`)
    .join("");

  box.innerHTML=Array.from({length:8},(_,i)=>`
    <div class="ko-seed">
      <label>${i+1}º classificado</label>
      <select id="koSeed${i}" onchange="setKnockoutSeed(${i},this.value)">
        ${options}
      </select>
    </div>
  `).join("");

  ko.seeds.forEach((id,i)=>{
    const sel=document.getElementById("koSeed"+i);
    if(sel && id && [...sel.options].some(o=>o.value===id)) sel.value=id;
  });
}

function setKnockoutSeed(index,id){
  koState().seeds[index]=id;
  scheduleSave();
  renderKnockout();
}

function fillKnockoutFromWeek2(){
  const top=rankedForKnockout().slice(0,8);
  if(top.length<8){
    alert("Você precisa ter pelo menos 8 atletas ativos no mês para preencher automaticamente.");
    return;
  }
  koState().seeds=top.map(a=>idOf(a));
  scheduleSave();
  renderKnockout();
  alert("Classificados preenchidos pelos 8 melhores até a Semana 2.");
}

function saveKnockoutManual(){
  const ko=koState();
  for(let i=0;i<8;i++){
    const sel=document.getElementById("koSeed"+i);
    ko.seeds[i]=sel?sel.value:"";
  }
  const ids=ko.seeds.filter(Boolean);
  if(ids.length<8){
    alert("Selecione os 8 classificados para gerar os confrontos.");
    return;
  }
  if(new Set(ids).size!==ids.length){
    alert("Existe atleta repetido nos classificados. Escolha 8 atletas diferentes.");
    return;
  }
  scheduleSave();
  renderKnockout();
  alert("Classificados salvos e confrontos gerados.");
}

function clearKnockoutManual(){
  if(!confirm("Limpar os classificados do mata-mata deste mês?"))return;
  koState().seeds=["","","","","","","",""];
  scheduleSave();
  renderKnockout();
}

function athleteByIdSafe(id){
  return state.athletes.find(a=>idOf(a)===id);
}

function matchWinnerByWeek(a,b,weekIndex){
  if(!a&&!b)return null;
  if(a&&!b)return a;
  if(!a&&b)return b;
  const pa=weekTotal(a,weekIndex), pb=weekTotal(b,weekIndex);
  if(pa>pb)return a;
  if(pb>pa)return b;
  return null;
}

function renderMatch(title,a,b,weekIndex){
  const pa=a?weekTotal(a,weekIndex):0;
  const pb=b?weekTotal(b,weekIndex):0;
  const winner=matchWinnerByWeek(a,b,weekIndex);
  return `<div class="match">
    <h3>${title}</h3>
    <div class="match-line"><span>${a?esc(a.name):"-"}</span><strong>${a?pa:"-"}</strong></div>
    <div class="match-line"><span>${b?esc(b.name):"-"}</span><strong>${b?pb:"-"}</strong></div>
    <div class="match-line"><span>Vencedor</span><strong>${winner?esc(winner.name):"Empate/aguardando"}</strong></div>
  </div>`;
}

function renderKnockout(){
  if(!document.body.classList.contains("student-mode")) renderKnockoutSelectors();
  if(document.body.classList.contains("student-mode")){const s=document.getElementById("knockoutSelectors"); if(s) s.innerHTML="";}
  const el=document.getElementById("knockoutContent");
  if(!el)return;

  const ko=koState();
  const ids=ko.seeds;
  const players=ids.map(id=>id?athleteByIdSafe(id):null);
  const filled=players.filter(Boolean).length;

  if(filled<8){
    el.innerHTML='<div class="card">Selecione os 8 classificados ou clique em “Classificar 8 melhores até Semana 2”.</div>';
    return;
  }

  // Confrontos:
  // 1º x 8º, 2º x 7º, 3º x 6º, 4º x 5º.
  const start=Number(ko.startWeek||2);
  const qfWeek=start;
  const semiWeek=Math.min(start+1,4);
  const finalWeek=Math.min(start+2,4);

  const qf=[
    [players[0],players[7],"1º x 8º"],
    [players[1],players[6],"2º x 7º"],
    [players[2],players[5],"3º x 6º"],
    [players[3],players[4],"4º x 5º"]
  ];

  const semi1A=matchWinnerByWeek(qf[0][0],qf[0][1],qfWeek);
  const semi1B=matchWinnerByWeek(qf[1][0],qf[1][1],qfWeek);
  const semi2A=matchWinnerByWeek(qf[2][0],qf[2][1],qfWeek);
  const semi2B=matchWinnerByWeek(qf[3][0],qf[3][1],qfWeek);

  const finalA=matchWinnerByWeek(semi1A,semi1B,semiWeek);
  const finalB=matchWinnerByWeek(semi2A,semi2B,semiWeek);

  el.innerHTML=
    `<div class="card"><div class="ko-stage-label">Quartas de finais • Semana ${qfWeek+1}</div></div>`+
    qf.map((g,i)=>renderMatch(`Quartas ${i+1} • ${g[2]}`,g[0],g[1],qfWeek)).join("")+
    `<div class="card"><div class="ko-stage-label">Semifinais • Semana ${semiWeek+1}</div></div>`+
    renderMatch("Semi 1",semi1A,semi1B,semiWeek)+
    renderMatch("Semi 2",semi2A,semi2B,semiWeek)+
    `<div class="card"><div class="ko-stage-label">Final • Semana ${finalWeek+1}</div></div>`+
    renderMatch("Final",finalA,finalB,finalWeek);
}
function renderDashboard(){const a=document.getElementById("dashActive");if(!a)return;a.textContent=activeAthletes().length;document.getElementById("dashBank").textContent=state.athletes.filter(x=>x.active!==false).length;document.getElementById("dashMonthPoints").textContent=activeAthletes().reduce((s,x)=>s+monthTotal(x),0);const b=ranked()[0];document.getElementById("dashBest").innerHTML=b?`🥇 <strong>${esc(b.name)}</strong> • ${b.total} pts`:"-"}
function openStats(id){const a=state.athletes.find(x=>idOf(x)===id);if(!a)return;let pd=0,pe=0,tot=0,meses=0;Object.keys(state.months||{}).forEach(m=>{const p=state.months[m]?.participants?.[id];if(!p)return;let mt=0;(p.weeks||[]).forEach(w=>Object.values(w||{}).forEach(s=>{pd+=n(s.pd);pe+=n(s.pe);mt+=scoreFinal(s)}));if(mt>0)meses++;tot+=mt});const tech=pd+pe,pdp=tech?Math.round(pd/tech*100):0,pep=tech?100-pdp:0;document.getElementById("statsContent").innerHTML=`<h2>${esc(a.name)}</h2><div class="grid3"><div class="card"><span>Total</span><strong>${tot}</strong></div><div class="card"><span>P/D</span><strong>${pd}</strong></div><div class="card"><span>P/E</span><strong>${pe}</strong></div></div><h3>Perna direita ${pdp}%</h3><div class="bar-track"><div class="bar-fill" style="width:${pdp}%"></div></div><h3>Perna esquerda ${pep}%</h3><div class="bar-track"><div class="bar-fill" style="width:${pep}%"></div></div><p>Meses com pontuação: <strong>${meses}</strong></p>`;document.getElementById("statsModal").classList.add("open")}
function closeStats(){document.getElementById("statsModal").classList.remove("open")}
function generateAthleteLink(){document.getElementById("shareLink").value=location.origin+location.pathname+"?aluno=1";document.getElementById("shareModal").classList.add("open")}
function closeShareModal(){document.getElementById("shareModal").classList.remove("open")}
async function copyShareLink(){await navigator.clipboard.writeText(document.getElementById("shareLink").value);alert("Link copiado!")}
function printRanking(){preparePrint("ranking");window.print()}function printYear(){preparePrint("year");window.print()}function printKnockout(){preparePrint("ko");window.print()}
function preparePrint(type){let html='<div class="print-card"><div class="print-title"><div class="print-logo"><img src="logo-primo-soccer.png"></div><div><h2>PRIMO SOCCER LEAGUE 2026</h2><h1>'+(type==="year"?"TOTAL GERAL DO ANO":type==="ko"?"CHAVEAMENTO MATA-MATA":"PONTUAÇÃO - ETAPA: "+month())+'</h1></div></div>';if(type==="year"){html+='<table><tr><th>POS</th><th>ATLETA</th><th>TOTAL</th></tr>'+rankedYear().map((a,i)=>`<tr><td>${i+1}</td><td>${esc(a.name)}</td><td>${a.year}</td></tr>`).join("")+'</table>'}else if(type==="ko"){html+=document.getElementById("knockoutContent").innerHTML}else{html+='<table><tr><th>POS</th><th>ATLETA</th><th>PTS</th></tr>'+ranked().map((a,i)=>`<tr><td>${i+1}</td><td>${esc(a.name)}</td><td>${a.total}</td></tr>`).join("")+'</table>'}html+='</div>';document.getElementById("printContent").innerHTML=html}
function exportCSV(){const rows=[["Atleta","ID","Mês","Total Mês","Total Ano"],...ranked().map(a=>[a.name,idOf(a),month(),a.total,yearTotal(a)])];download("\\uFEFF"+rows.map(r=>r.map(c=>`"${String(c).replaceAll('"','""')}"`).join(";")).join("\\n"),"ranking.csv","text/csv")}
function download(c,nm,type){const b=new Blob([c],{type}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=nm;a.click();URL.revokeObjectURL(u)}
async function forceSync(){await saveCloud();await loadCloud()}function reloadOnline(){localStorage.removeItem(STORAGE_KEY);loadCloud()}

function deleteAthleteFull(id){
  const a=state.athletes.find(x=>idOf(x)===id);
  if(!a)return;
  const msg="Excluir este atleta do banco? Isso remove o atleta e todos os pontos dele de todos os meses. Para remover apenas da disputa do mês, use Remover na aba Atletas.";
  if(!confirm(msg))return;
  state.athletes=state.athletes.filter(x=>idOf(x)!==id);
  Object.values(state.months||{}).forEach(m=>{
    if(m.participants && m.participants[id]) delete m.participants[id];
  });
  scheduleSave();
  renderAll();
}

function setupStudent(){if(new URLSearchParams(location.search).get("aluno")==="1"){document.body.classList.add("student-mode");document.getElementById("studentBanner").classList.remove("hidden");setPage("ranking")}}
renderAll();setupStudent();initCloud();



function shouldSkipAutoRender(){
  const el=document.activeElement;
  return el && ["INPUT","SELECT","TEXTAREA"].includes(el.tagName);
}

function refreshFromState(){
  if(shouldSkipAutoRender())return; try{ renderAll(); }catch(e){ console.error(e); }
}
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden){ refreshFromState(); if(supa) loadCloud(); }
});
window.addEventListener("focus",()=>{ if(!document.activeElement || !["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)) refreshFromState(); });
setInterval(()=>{ if(!document.activeElement || !["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)) refreshFromState(); },2500);
