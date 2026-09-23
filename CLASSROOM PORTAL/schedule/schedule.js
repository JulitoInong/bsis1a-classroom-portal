const scheduleMenuBtn=document.getElementById("scheduleMenuBtn");
const scheduleNav=document.getElementById("scheduleNav");
const scheduleNavBackdrop=document.getElementById("scheduleNavBackdrop");

function setScheduleNav(open){
  document.body.classList.toggle("schedule-nav-open",open);
  document.body.style.overflow=open?"hidden":"";
  scheduleMenuBtn?.setAttribute("aria-expanded",String(open));
  scheduleMenuBtn?.setAttribute("aria-label",open?"Close schedule navigation":"Open schedule navigation");
  scheduleNav?.setAttribute("aria-hidden",String(!open));
  scheduleNav?.toggleAttribute("inert",!open);
  scheduleNavBackdrop?.setAttribute("aria-hidden",String(!open));
}
scheduleMenuBtn?.addEventListener("click",()=>setScheduleNav(!document.body.classList.contains("schedule-nav-open")));
scheduleNavBackdrop?.addEventListener("click",()=>setScheduleNav(false));
scheduleNav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>setScheduleNav(false)));
document.addEventListener("keydown",e=>{if(e.key==="Escape")setScheduleNav(false)});
window.addEventListener("resize",()=>{if(window.innerWidth>960)setScheduleNav(false)});

const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const modeLabels={regular:"Regular / Original",f2f:"Current F2F",online:"Online Class",asynchronous:"Asynchronous"};
const weekdayIndex=new Date().getDay();
const todayDay=weekdayIndex===0?7:weekdayIndex;

function timeLabel(value){
  if(!value)return "—";
  const [h,m]=value.slice(0,5).split(":").map(Number);
  const d=new Date(); d.setHours(h,m,0,0);
  return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(d);
}
function rangeLabel(item){return `${timeLabel(item.start_time)} – ${timeLabel(item.end_time)}`}
function modeLabel(mode){return modeLabels[mode]||"Schedule"}

function renderToday(items){
  const el=document.getElementById("todaySchedule");
  document.getElementById("todayLabel").textContent=days[todayDay-1];
  const todays=items.filter(x=>x.day_of_week===todayDay).sort((a,b)=>(a.start_time||"").localeCompare(b.start_time||""));
  el.innerHTML="";
  if(!todays.length){
    const note=document.createElement("div");
    note.className="schedule-empty";
    note.textContent=todayDay===2
      ? "Tuesday is the current F2F day in the supplied setup. No other Tuesday schedule was supplied."
      : ([1,3,4,5].includes(todayDay)
        ? "Online day. The source document does not provide specific subject/time entries."
        : "No published classes are scheduled for today.");
    el.appendChild(note);
    return;
  }
  todays.forEach(item=>{
    const row=document.createElement("div");row.className="today-item";
    const time=document.createElement("div");time.className="time-range";time.textContent=rangeLabel(item);
    const copy=document.createElement("div");
    const mode=document.createElement("span");mode.className="mode-chip";mode.textContent=modeLabel(item.class_mode);
    const strong=document.createElement("strong");strong.textContent=item.subject;
    const small=document.createElement("small");small.textContent=[item.instructor,item.room].filter(Boolean).join(" • ")||"";
    copy.append(mode,strong,small);
    const room=document.createElement("span");room.className="room-chip";room.textContent=item.room||"Online";
    row.append(time,copy,room);
    el.appendChild(row);
  });
}

function renderModeGrid(items,mode,targetId,countId){
  const grid=document.getElementById(targetId);
  const count=document.getElementById(countId);
  const filtered=items.filter(x=>(x.class_mode||"regular")===mode);
  count.textContent=`${filtered.length} ${filtered.length===1?"class":"classes"}`;
  grid.innerHTML="";

  const daysWithEntries=[1,2,3,4,5,6,7].filter(day=>filtered.some(x=>x.day_of_week===day));
  if(!daysWithEntries.length){
    grid.innerHTML='<div class="schedule-empty">No published schedule entries for this view.</div>';
    return;
  }

  daysWithEntries.forEach(day=>{
    const col=document.createElement("section");
    col.className=`day-column${day===todayDay?" today":""}`;
    const head=document.createElement("div");head.className="day-head";
    const dayName=document.createElement("strong");dayName.textContent=days[day-1];
    const today=document.createElement("small");today.textContent=day===todayDay?"TODAY":"";
    head.append(dayName,today);

    const list=document.createElement("div");list.className="class-list";
    filtered.filter(x=>x.day_of_week===day).sort((a,b)=>(a.start_time||"").localeCompare(b.start_time||"")).forEach(item=>{
      const card=document.createElement("article");card.className="class-item";
      const time=document.createElement("div");time.className="time";time.textContent=rangeLabel(item);
      const subject=document.createElement("strong");subject.textContent=item.subject;
      const meta=document.createElement("small");meta.textContent=[item.instructor,item.room].filter(Boolean).join(" • ")||"";
      const modeText=document.createElement("div");modeText.className="mode";modeText.textContent=modeLabel(item.class_mode);
      card.append(time,subject,meta,modeText);
      list.appendChild(card);
    });
    col.append(head,list);
    grid.appendChild(col);
  });
}

function renderOnlineDays(){
  const grid=document.getElementById("onlineDaysGrid");
  const daysText=[
    ["Monday","Online class day"],
    ["Wednesday","Online class day"],
    ["Thursday","Online class day"],
    ["Friday","Online class day"]
  ];
  grid.innerHTML="";
  daysText.forEach(([day,note])=>{
    const card=document.createElement("article");
    card.className="online-day-card";
    card.innerHTML=`<strong>${day}</strong><span>${note}</span><small>Specific subject and time were not supplied in the source document.</small>`;
    grid.appendChild(card);
  });
}

function setMode(mode){
  document.querySelectorAll(".schedule-view-tab").forEach(tab=>{
    tab.classList.toggle("active",tab.dataset.mode===mode);
  });
  document.querySelectorAll(".schedule-mode-section").forEach(section=>{
    section.classList.toggle("active",section.dataset.modeSection===mode);
  });
}
document.querySelectorAll(".schedule-view-tab").forEach(tab=>tab.addEventListener("click",()=>{
  const mode=tab.dataset.mode;
  setMode(mode);
  document.getElementById(tab.dataset.target)?.scrollIntoView({behavior:"smooth",block:"start"});
}));

async function initSchedule(){
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){window.location.replace("../login/index.html");return}

  const {data:student}=await supabaseClient
    .from("students")
    .select("id")
    .eq("auth_user_id",session.user.id)
    .maybeSingle();

  if(!student){window.location.replace("../registrar/index.html");return}

  const {data,error}=await supabaseClient
    .from("class_schedule")
    .select("id,class_mode,day_of_week,start_time,end_time,subject,instructor,room,notes")
    .eq("published",true)
    .order("day_of_week",{ascending:true})
    .order("start_time",{ascending:true});

  if(error){
    console.error("Schedule:",error);
    ["regularGrid","f2fGrid"].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.innerHTML='<div class="schedule-error">Unable to load the schedule right now.</div>';
    });
    return;
  }

  const items=data||[];
  document.getElementById("scheduleStatusTitle").textContent=items.length?"Live schedule":"Schedule ready";
  renderToday(items);
  renderModeGrid(items,"regular","regularGrid","regularCount");
  renderModeGrid(items,"f2f","f2fGrid","f2fCount");
  renderOnlineDays();
  await BSISAdmin.apply();
}
initSchedule();
