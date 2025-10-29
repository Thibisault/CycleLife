/* PWA Cycles 29-6-29-6-9 — HTML/CSS/JS vanilla */
const $ = (s)=>document.querySelector(s);
const LS_KEY="pwa-cycles-config-v1";
const DEFAULTS={durations:{work:"29:00",sport:"06:00",break:"09:00"},
  subs:[{name:"Exo 1",dur:"00:50"},{name:"Exo 2",dur:"00:50"},{name:"Exo 3",dur:"00:50"},
        {name:"Exo 4",dur:"00:50"},{name:"Exo 5",dur:"00:50"},{name:"Exo 6",dur:"00:50"}],
  volume:0.6,mute:false};

let config=loadConfig();
function toSec(mmss){const p=String(mmss||"").split(":");if(p.length<2)return parseInt(p[0]||"0",10);
  return parseInt(p[0]||"0",10)*60+parseInt(p[1]||"0",10);}
function toMMSS(sec){sec=Math.max(0,Math.round(sec));const m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");}
function saveConfig(){localStorage.setItem(LS_KEY,JSON.stringify(config));}
function loadConfig(){try{const raw=localStorage.getItem(LS_KEY);if(!raw)return structuredClone(DEFAULTS);
  const p=JSON.parse(raw);return Object.assign(structuredClone(DEFAULTS),p);}catch{return structuredClone(DEFAULTS);}}
function norm(s){return toMMSS(toSec(s));}

const Phase={WORK:"Travail",SPORT:"Sport + Étirement",BREAK:"Pause"};
const cycle=[Phase.WORK,Phase.SPORT,Phase.WORK,Phase.SPORT,Phase.BREAK];
let phaseIndex=0,running=false,paused=false,currentEndTime=null,remaining=0,intervalId=null;
let sportSubs=[],currentSubIndex=-1,subRemaining=0;
const timeDisplay=$("#timeDisplay"),subInfo=$("#subInfo"),bar=$("#bar"),phaseBadge=$("#phaseBadge"),
      timeline=$("#timeline"),nextPhaseEl=$("#nextPhase"),etaEl=$("#eta");

$("#startBtn").addEventListener("click",start);
$("#pauseBtn").addEventListener("click",()=>{if(!running)return;paused=!paused; if(paused){sound("break");}else{sound("work");}});
$("#stopBtn").addEventListener("click",stopAll);
$("#nextBtn").addEventListener("click",()=>{phaseIndex=(phaseIndex+1)%cycle.length;initPhase(phaseIndex,true)});
$("#prevBtn").addEventListener("click",()=>{phaseIndex=(phaseIndex-1+cycle.length)%cycle.length;initPhase(phaseIndex,true)});

$("#workInput").value=config.durations.work; $("#sportInput").value=config.durations.sport; $("#breakInput").value=config.durations.break;
$("#volume").value=config.volume; $("#mute").checked=!!config.mute;
$("#workInput").addEventListener("change",(e)=>{config.durations.work=norm(e.target.value);saveConfig();refreshUI();});
$("#sportInput").addEventListener("change",(e)=>{config.durations.sport=norm(e.target.value);saveConfig();refreshUI();});
$("#breakInput").addEventListener("change",(e)=>{config.durations.break=norm(e.target.value);saveConfig();refreshUI();});
$("#volume").addEventListener("input",(e)=>{config.volume=parseFloat(e.target.value||"0.6");saveConfig();});
$("#mute").addEventListener("change",(e)=>{config.mute=!!e.target.checked;saveConfig();});

$("#notifBtn").addEventListener("click",async()=>{try{const res=await Notification.requestPermission();alert("Notifications: "+res);}catch{alert("Notifications non supportées");}});
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",(e)=>{e.preventDefault();deferredPrompt=e;$("#installBtn").disabled=false;});
$("#installBtn").addEventListener("click",async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installBtn").disabled=true;});

function renderSubs(){
  const tb=$("#subTable"); tb.innerHTML="";
  sportSubs=config.subs.map(s=>({name:s.name,durSec:toSec(s.dur)}));
  const total=toSec(config.durations.sport);
  const acc=sportSubs.reduce((a,b)=>a+b.durSec,0);
  if(acc<total){sportSubs.push({name:"Récup",durSec:total-acc});}
  else if(acc>total){let over=acc-total;for(let i=sportSubs.length-1;i>=0&&over>0;i--){const cut=Math.min(sportSubs[i].durSec,over);sportSubs[i].durSec-=cut;over-=cut; if(sportSubs[i].durSec<=0)sportSubs.splice(i,1);}}
  config.subs=config.subs.filter(s=>toSec(s.dur)>0); saveConfig();

  config.subs.forEach((s,idx)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${idx+1}</td>
      <td><input type="text" value="${s.name}" data-idx="${idx}" data-k="name"></td>
      <td><input type="text" value="${s.dur}" data-idx="${idx}" data-k="dur" style="width:90px"></td>
      <td>
        <button class="btn small" data-act="up" data-idx="${idx}">↑</button>
        <button class="btn small" data-act="down" data-idx="${idx}">↓</button>
      </td>
      <td><button class="btn small" data-act="del" data-idx="${idx}">✕</button></td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll("input").forEach(inp=>{
    inp.addEventListener("change",(e)=>{
      const i=parseInt(e.target.dataset.idx,10),k=e.target.dataset.k;
      if(k==="name")config.subs[i].name=e.target.value;
      if(k==="dur")config.subs[i].dur=norm(e.target.value);
      saveConfig(); renderSubs();
    });
  });
  tb.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      const i=parseInt(e.target.dataset.idx,10),act=e.target.dataset.act;
      if(act==="up"&&i>0){const t=config.subs[i];config.subs[i]=config.subs[i-1];config.subs[i-1]=t;}
      if(act==="down"&&i<config.subs.length-1){const t=config.subs[i];config.subs[i]=config.subs[i+1];config.subs[i+1]=t;}
      if(act==="del"){config.subs.splice(i,1);}
      saveConfig(); renderSubs();
    });
  });
}
$("#addSub").addEventListener("click",()=>{config.subs.push({name:"Exo "+(config.subs.length+1),dur:"00:30"});saveConfig();renderSubs();});
$("#resetBtn").addEventListener("click",()=>{
  if(confirm("Restaurer valeurs par défaut ?")){
    config=structuredClone(DEFAULTS);
    $("#workInput").value=config.durations.work; $("#sportInput").value=config.durations.sport; $("#breakInput").value=config.durations.break;
    $("#volume").value=config.volume; $("#mute").checked=!!config.mute;
    saveConfig(); renderSubs(); refreshUI();
  }
});
$("#autoFillBtn").addEventListener("click",()=>{
  const n=Math.max(1,parseInt($("#autoCount").value||"6",10));
  const each=norm($("#autoEach").value||"00:50");
  config.subs=[]; for(let i=0;i<n;i++) config.subs.push({name:"Exo "+(i+1), dur:each});
  saveConfig(); renderSubs();
});

function getPhaseDurSec(p){if(p===Phase.WORK)return toSec(config.durations.work);
  if(p===Phase.SPORT)return toSec(config.durations.sport);
  if(p===Phase.BREAK)return toSec(config.durations.break); return 0;}
function setBadge(p){
  const cls=p===Phase.WORK?"work":p===Phase.SPORT?"sport":"break";
  phaseBadge.className="phase-badge "+cls; phaseBadge.textContent=p;
}
function renderTimeline(){
  timeline.innerHTML="";
  cycle.forEach((p,i)=>{
    const chip=document.createElement("div");
    chip.className="chip "+(p===Phase.WORK?"work":p===Phase.SPORT?"sport":"break");
    chip.textContent=p;
    if(i===phaseIndex) chip.classList.add("active");
    timeline.appendChild(chip);
  });
}
function updateNextPhaseETA(){
  const next=(phaseIndex+1)%cycle.length;
  const p=cycle[next]; $("#nextPhase").textContent="Prochaine phase : "+p;
  if(currentEndTime){
    const d=new Date(currentEndTime);
    $("#eta").textContent="Fin ~ "+d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
  }else $("#eta").textContent="Fin ~ —:—";
}

// Audio & vibration
const AudioCtx=window.AudioContext||window.webkitAudioContext; let audioCtx=null;
function ctx(){ if(!audioCtx) audioCtx=new AudioCtx(); if(audioCtx.state==="suspended") audioCtx.resume(); return audioCtx; }
function beep(freq=880,dur=0.18,type="sine",gain=0.2){
  if(config.mute) return;
  const c=ctx(); const o=c.createOscillator(); const g=c.createGain();
  o.type=type; o.frequency.value=freq; g.gain.value=(config.volume??0.6)*gain;
  o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime+dur);
}
function sound(ev){
  switch(ev){
    case "work": beep(880,.16,"square",.25); setTimeout(()=>beep(1320,.12,"square",.2),140); break;
    case "sport": beep(440,.18,"sine",.25); setTimeout(()=>beep(660,.16,"sine",.2),160); break;
    case "break": beep(600,.22,"triangle",.25); setTimeout(()=>beep(400,.22,"triangle",.25),240); break;
    case "sub": beep(1200,.10,"square",.2); break;
    case "end": beep(330,.18,"sawtooth",.22); setTimeout(()=>beep(220,.24,"sawtooth",.22),200); break;
  }
}
function vib(ev){
  if(!("vibrate" in navigator)) return;
  switch(ev){
    case "work": navigator.vibrate([40,40,40]); break;
    case "sport": navigator.vibrate([120,60,120]); break;
    case "break": navigator.vibrate([200,40,200]); break;
    case "sub": navigator.vibrate([60]); break;
    case "end": navigator.vibrate([250,100,250]); break;
  }
}
function notify(title, body){
  try{ if(Notification.permission==="granted") new Notification(title,{body}); }catch{}
}

// Wake Lock
let wakeLock=null;
async function lockScreen(){ try{ if('wakeLock' in navigator){ wakeLock=await navigator.wakeLock.request('screen'); } }catch{} }

function start(){
  if(running) return;
  running=true; paused=false; initPhase(phaseIndex,true); lockScreen();
}
function stopAll(){
  running=false; paused=false; clearInterval(intervalId); intervalId=null;
  phaseIndex=0; currentSubIndex=-1; remaining=0; subRemaining=0; currentEndTime=null;
  $("#timeDisplay").textContent="00:00"; $("#subInfo").textContent="Prêt"; $("#bar").style.width="0%";
  setBadge("—"); renderTimeline(); updateNextPhaseETA();
}

function initPhase(idx, playSound=false){
  clearInterval(intervalId);
  const p=cycle[idx]; setBadge(p);
  const dur=getPhaseDurSec(p); remaining=dur; currentEndTime=Date.now()+dur*1000;
  renderTimeline(); updateNextPhaseETA();

  if(p===Phase.SPORT){
    renderSubs();
    currentSubIndex=0; subRemaining= (sportSubs[0]?.durSec ?? dur);
    $("#subInfo").textContent= sportSubs[0]? `${sportSubs[0].name} — ${toMMSS(subRemaining)}` : "Sport";
    if(playSound){ sound("sport"); vib("sport"); notify("Début SPORT", "Phase Sport + Étirement"); }
  } else if(p===Phase.WORK){
    currentSubIndex=-1; $("#subInfo").textContent="Travail concentré";
    if(playSound){ sound("work"); vib("work"); notify("Début TRAVAIL", "Phase Travail"); }
  } else {
    currentSubIndex=-1; $("#subInfo").textContent="Pause récupération";
    if(playSound){ sound("break"); vib("break"); notify("Début PAUSE", "Phase Pause"); }
  }
  intervalId=setInterval(tick,100);
}

function tick(){
  if(!running || paused) return;
  const now=Date.now();
  remaining=Math.max(0, Math.round((currentEndTime-now)/1000));
  $("#timeDisplay").textContent=toMMSS(remaining);
  const p=cycle[phaseIndex]; const dur=getPhaseDurSec(p);
  const prog=dur>0?(1-remaining/dur)*100:0; $("#bar").style.width=prog+"%";

  if(p===Phase.SPORT && sportSubs.length){
    subRemaining=Math.max(0, subRemaining-0.1);
    if(subRemaining<=0.05){
      currentSubIndex++;
      if(currentSubIndex<sportSubs.length){
        subRemaining=sportSubs[currentSubIndex].durSec;
        $("#subInfo").textContent=`${sportSubs[currentSubIndex].name} — ${toMMSS(subRemaining)}`;
        sound("sub"); vib("sub"); notify("Changement d'exercice", sportSubs[currentSubIndex].name);
      } else {
        $("#subInfo").textContent="Fin Sport";
      }
    } else {
      if(currentSubIndex>=0 && currentSubIndex<sportSubs.length){
        $("#subInfo").textContent=`${sportSubs[currentSubIndex].name} — ${toMMSS(Math.ceil(subRemaining))}`;
      }
    }
  }

  if(remaining<=0){
    if(phaseIndex===cycle.length-1){ sound("end"); vib("end"); notify("Fin du cycle", "Redémarrage…"); }
    phaseIndex=(phaseIndex+1)%cycle.length;
    initPhase(phaseIndex,true);
  }
}

function refreshUI(){
  $("#workInput").value=config.durations.work;
  $("#sportInput").value=config.durations.sport;
  $("#breakInput").value=config.durations.break;
  renderTimeline(); updateNextPhaseETA();
}

renderSubs(); refreshUI();

// Inputs bindings after render
$("#notifBtn"); // already bound
// Register SW
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('sw.js').catch(console.warn); });
}
