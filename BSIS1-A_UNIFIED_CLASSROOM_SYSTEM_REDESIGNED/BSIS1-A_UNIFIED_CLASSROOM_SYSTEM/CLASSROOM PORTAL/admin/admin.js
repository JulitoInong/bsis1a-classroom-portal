const $ = (id) => document.getElementById(id);

const totalStudents = $("totalStudents");
const totalAnnouncements = $("totalAnnouncements");
const totalClassInfo = $("totalClassInfo");
const adminStudentList = $("adminStudentList");
const searchInput = $("searchInput");
const filterSelect = $("filterSelect");
const sortSelect = $("sortSelect");
const resultCount = $("resultCount");
const refreshBtn = $("refreshBtn");
const exportBtn = $("exportBtn");
const announcementList = $("announcementList");
const classInfoList = $("classInfoList");

let allStudents = [];
let lastFilteredStudents = [];
let activeStudent = null;
let contentMode = null;
let editingContentId = null;
let activeOfficerId = null;
let activeScheduleId = null;
const officerList = $("officerList");

function showListMessage(el, text) {
  el.innerHTML = "";
  const item = document.createElement("div");
  item.className = "no-results";
  item.textContent = text;
  el.appendChild(item);
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {month:"short",day:"2-digit",year:"numeric"})
    .format(new Date(`${value}T00:00:00`));
}

function formatSubmittedAt(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {month:"short",day:"2-digit",year:"numeric",hour:"numeric",minute:"2-digit"})
    .format(new Date(value));
}

function initials(name) {
  return String(name || "Student").trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join("") || "S";
}

function cacheBust(url) {
  return url ? `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}` : "";
}

async function loadStudents() {
  const {data,error} = await supabaseClient.from("students")
    .select("id, student_no, full_name, birthday, gmail, avatar_url, created_at")
    .order("created_at",{ascending:false});
  if (error) { console.error(error); showListMessage(adminStudentList,"Unable to load student records."); return []; }
  return data || [];
}

function matchesSearch(s, term) {
  term = term.trim().toLowerCase();
  if (!term) return true;
  return [s.student_no,s.full_name,s.gmail].some(v=>String(v||"").toLowerCase().includes(term));
}

function sortStudents(items) {
  const mode = sortSelect.value;
  const out = [...items];
  if (mode === "name") return out.sort((a,b)=>String(a.full_name||"").localeCompare(String(b.full_name||""),undefined,{sensitivity:"base"}));
  if (mode === "student_no") return out.sort((a,b)=>String(a.student_no||"").localeCompare(String(b.student_no||""),undefined,{numeric:true}));
  return out.sort((a,b)=>{
    const at = new Date(a.created_at||0).getTime(), bt = new Date(b.created_at||0).getTime();
    return mode === "oldest" ? at-bt : bt-at;
  });
}

function applyStudentFilter(items) {
  const mode = filterSelect.value;
  if (mode === "with_pfp") return items.filter(s=>!!s.avatar_url);
  if (mode === "without_pfp") return items.filter(s=>!s.avatar_url);
  return items;
}

async function renderStudents() {
  allStudents = await loadStudents();
  let filtered = allStudents.filter(s=>matchesSearch(s,searchInput.value));
  filtered = applyStudentFilter(filtered);
  filtered = sortStudents(filtered);
  lastFilteredStudents = filtered;
  totalStudents.textContent = allStudents.length;
  resultCount.textContent = `${filtered.length} ${filtered.length===1?"record":"records"}`;
  adminStudentList.innerHTML = "";

  if (!filtered.length) {
    showListMessage(adminStudentList, allStudents.length ? "No matching student found." : "No student submissions yet.");
    return;
  }

  filtered.forEach((student,index)=>{
    const row = document.createElement("article");
    row.className = "admin-student";

    const number = document.createElement("div");
    number.className = "admin-number";
    number.textContent = String(index+1).padStart(2,"0");

    const identity = document.createElement("div");
    identity.className = "admin-identity";

    const avatarWrap = document.createElement("div");
    avatarWrap.className = "admin-avatar-wrap";
    const avatar = document.createElement("img");
    avatar.className = "admin-avatar";
    avatar.alt = `${student.full_name||"Student"} profile photo`;
    const fallback = document.createElement("span");
    fallback.className = "admin-avatar-fallback";
    fallback.textContent = initials(student.full_name);
    if (student.avatar_url) {
      avatar.src = cacheBust(student.avatar_url);
      avatar.onerror = ()=>{avatar.style.display="none";fallback.style.display="grid";};
    } else { avatar.style.display="none"; fallback.style.display="grid"; }
    avatarWrap.append(avatar,fallback);

    const identityText = document.createElement("div");
    const name = document.createElement("div");
    name.className="admin-name"; name.textContent=student.full_name||"—";
    const no = document.createElement("div");
    no.className="admin-meta strong-meta"; no.textContent=`Student No. ${student.student_no||"—"}`;
    identityText.append(name,no);
    identity.append(avatarWrap,identityText);

    const details = document.createElement("div");
    details.className="admin-details";
    ["Birthday: "+formatDate(student.birthday),"Gmail: "+(student.gmail||"—"),"Submitted: "+formatSubmittedAt(student.created_at)]
      .forEach(t=>{const span=document.createElement("span");span.textContent=t;details.appendChild(span);});

    const status = document.createElement("div");
    status.className="status-cell";
    const badge=document.createElement("span");badge.className="status-badge accepted";badge.textContent="✓ Accepted";
    const note=document.createElement("small");note.textContent=student.avatar_url?"PFP available":"No PFP uploaded";
    status.append(badge,note);

    const viewBtn=document.createElement("button");
    viewBtn.className="secondary-btn compact"; viewBtn.type="button"; viewBtn.textContent="View / Edit";
    viewBtn.addEventListener("click",()=>openStudentModal(student));

    const deleteBtn=document.createElement("button");
    deleteBtn.className="danger-btn compact student-row-remove";
    deleteBtn.type="button";
    deleteBtn.textContent="Remove";
    deleteBtn.setAttribute("aria-label", `Remove ${student.full_name || "student"}`);
    deleteBtn.addEventListener("click",()=>deleteStudentRecord(student));

    const actionWrap=document.createElement("div");
    actionWrap.className="student-row-actions";
    actionWrap.append(viewBtn,deleteBtn);
    status.appendChild(actionWrap);

    row.append(number,identity,details,status);
    adminStudentList.appendChild(row);
  });
}


async function loadOfficers() {
  const {data,error} = await supabaseClient
    .from("class_officers")
    .select("id,position,student_id,created_at,students(id,student_no,full_name,gmail,avatar_url)")
    .order("created_at",{ascending:true});
  if (error) {
    console.error(error);
    if (officerList) showListMessage(officerList,"Unable to load class officers.");
    return [];
  }
  return data || [];
}

async function loadOfficerStudentOptions(selectedId="") {
  const select = $("officerStudent");
  const {data,error} = await supabaseClient
    .from("students")
    .select("id,student_no,full_name")
    .order("full_name",{ascending:true});
  if (error) {
    console.error(error);
    select.innerHTML = '<option value="">Unable to load students</option>';
    return;
  }
  select.innerHTML = '<option value="">Select a student</option>';
  (data || []).forEach(s=>{
    const opt=document.createElement("option");
    opt.value=s.id;
    opt.textContent=`${s.full_name || "Student"} — ${s.student_no || "No Student No."}`;
    if (String(s.id)===String(selectedId)) opt.selected=true;
    select.appendChild(opt);
  });
}

function renderOfficers(items) {
  officerList.innerHTML = "";
  if (!items.length) {
    showListMessage(officerList,"No class officers configured.");
    return;
  }
  items.forEach(item=>{
    const row=document.createElement("article");
    row.className="officer-admin-item";

    const photo=document.createElement("div");
    photo.className="officer-admin-photo";
    const img=document.createElement("img");
    const fallback=document.createElement("span");
    const student=item.students || {};
    fallback.textContent=initials(student.full_name);
    if(student.avatar_url){
      img.src=cacheBust(student.avatar_url);
      img.alt=student.full_name || "Officer";
      img.onerror=()=>{img.style.display="none";fallback.style.display="grid";};
    } else {
      img.style.display="none"; fallback.style.display="grid";
    }
    photo.append(img,fallback);

    const copy=document.createElement("div");
    copy.className="officer-admin-copy";
    const pos=document.createElement("div");pos.className="officer-position";pos.textContent=item.position;
    const name=document.createElement("h4");name.textContent=student.full_name || "Unassigned";
    const meta=document.createElement("p");meta.textContent=student.student_no ? `Student No. ${student.student_no}` : "No linked student record";
    copy.append(pos,name,meta);

    const actions=document.createElement("div");actions.className="management-actions";
    const edit=document.createElement("button");edit.className="secondary-btn compact";edit.type="button";edit.textContent="Edit";
    edit.onclick=()=>openOfficerModal(item);
    const del=document.createElement("button");del.className="danger-btn compact";del.type="button";del.textContent="Remove";
    del.onclick=()=>deleteOfficer(item);
    actions.append(edit,del);

    row.append(photo,copy,actions);
    officerList.appendChild(row);
  });
}

async function refreshOfficers() {
  const officers=await loadOfficers();
  renderOfficers(officers);
}

async function openOfficerModal(item=null) {
  activeOfficerId=item?.id || null;
  $("officerModalTitle").textContent=item ? "Edit Officer" : "Add Officer";
  $("officerPosition").value=item?.position || "";
  $("officerModalMessage").textContent="";
  openModal("officerModal");
  await loadOfficerStudentOptions(item?.student_id || "");
}

async function saveOfficer() {
  const position=$("officerPosition").value.trim();
  const student_id=$("officerStudent").value || null;
  if(!position || !student_id){
    $("officerModalMessage").textContent="Position and student are required.";
    return;
  }
  const btn=$("saveOfficerBtn");btn.disabled=true;
  const payload={position,student_id,updated_at:new Date().toISOString()};
  let result;
  if(activeOfficerId) result=await supabaseClient.from("class_officers").update(payload).eq("id",activeOfficerId);
  else result=await supabaseClient.from("class_officers").insert({position,student_id});
  btn.disabled=false;
  if(result.error){
    console.error(result.error);
    $("officerModalMessage").textContent=result.error.message || "Unable to save officer.";
    return;
  }
  closeModals();
  await refreshOfficers();
}

async function deleteOfficer(item) {
  const studentName=item.students?.full_name || "this officer";
  if(!confirm(`Remove ${item.position} — ${studentName} from Class Officers?`)) return;
  const {error}=await supabaseClient.from("class_officers").delete().eq("id",item.id);
  if(error){alert(error.message || "Unable to remove officer.");return;}
  await refreshOfficers();
}


function openStudentModal(student) {
  activeStudent=student;
  $("studentModalTitle").textContent=student.full_name||"Student";
  $("editStudentNo").value=student.student_no||"";
  $("editFullName").value=student.full_name||"";
  $("editBirthday").value=student.birthday||"";
  $("editGmail").value=student.gmail||"";
  $("studentModalMessage").textContent="";
  const img=$("modalAvatar"), fallback=$("modalAvatarFallback");
  fallback.textContent=initials(student.full_name);
  if(student.avatar_url){img.src=cacheBust(student.avatar_url);img.style.display="block";fallback.style.display="none";img.onerror=()=>{img.style.display="none";fallback.style.display="grid";};}
  else {img.removeAttribute("src");img.style.display="none";fallback.style.display="grid";}
  openModal("studentModal");
}

async function saveStudent() {
  if(!activeStudent) return;
  const payload={
    student_no:$("editStudentNo").value.trim(),
    full_name:$("editFullName").value.trim(),
    birthday:$("editBirthday").value || null,
    gmail:$("editGmail").value.trim()
  };
  if(!payload.student_no || !payload.full_name || !payload.gmail){$("studentModalMessage").textContent="Student No., Full Name, and Gmail are required.";return;}
  const btn=$("saveStudentBtn"); btn.disabled=true;
  const {error}=await supabaseClient.from("students").update(payload).eq("id",activeStudent.id);
  btn.disabled=false;
  if(error){console.error(error);$("studentModalMessage").textContent=error.message||"Update failed.";return;}
  closeModals();
  activeStudent=null;
  await renderStudents();
}

function getStudentAvatarPath(avatarUrl){
  if(!avatarUrl) return null;
  try {
    const url = new URL(avatarUrl);
    const marker = "/storage/v1/object/public/student-avatars/";
    const index = url.pathname.indexOf(marker);
    if(index === -1) return null;
    const path = url.pathname.slice(index + marker.length);
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

async function deleteStudentRecord(student){
  if(!student?.id) return;
  const studentName=student.full_name || "this student";
  const studentNo=student.student_no ? ` (Student No. ${student.student_no})` : "";
  const confirmed=confirm(`Remove ${studentName}${studentNo} from Student Records?\n\nThis permanently removes the student record and any linked Class Officer assignment. The Google account itself is not deleted.`);
  if(!confirmed) return;

  const {data:deleted,error}=await supabaseClient
    .from("students")
    .delete()
    .eq("id",student.id)
    .select("id")
    .maybeSingle();

  if(error){
    console.error(error);
    alert(error.message || "Unable to remove the student record.");
    return;
  }

  if(!deleted){
    alert("No student record was removed. The record may already have been deleted.");
    await renderStudents();
    return;
  }

  const avatarPath=getStudentAvatarPath(student.avatar_url);
  let cleanupWarning="";
  if(avatarPath){
    const {error:storageError}=await supabaseClient.storage.from("student-avatars").remove([avatarPath]);
    if(storageError){
      console.warn("Student avatar cleanup failed after record deletion:",storageError);
      cleanupWarning=" The student record was removed, but the stored profile photo could not be cleaned up.";
    }
  }

  if(activeStudent?.id===student.id){
    closeModals();
    activeStudent=null;
  }
  await renderStudents();
  if(cleanupWarning) alert(`Student record removed.${cleanupWarning}`);
}

async function deleteStudent(){
  if(!activeStudent) return;
  await deleteStudentRecord(activeStudent);
}

function openModal(id){$(id).classList.remove("hidden");$(id).setAttribute("aria-hidden","false");}
function closeModals(){document.querySelectorAll(".modal").forEach(m=>{m.classList.add("hidden");m.setAttribute("aria-hidden","true");});}
document.querySelectorAll("[data-close-modal]").forEach(el=>el.addEventListener("click",closeModals));

function csvEscape(v){return `"${String(v??"").replace(/"/g,'""')}"`;}
function exportCsv(){
  if(!lastFilteredStudents.length){alert("There are no student records to export.");return;}
  const headers=["Student No.","Full Name","Birthday","Gmail","Submitted At","PFP"];
  const rows=lastFilteredStudents.map(s=>[s.student_no||"",s.full_name||"",s.birthday||"",s.gmail||"",s.created_at||"",s.avatar_url?"Yes":"No"]);
  const csv=[headers,...rows].map(r=>r.map(csvEscape).join(",")).join("\r\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob), link=document.createElement("a");
  link.href=url;link.download=`BSIS-1A-Student-Records-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}

async function loadContent(table) {
  const {data,error}=await supabaseClient.from(table).select("id,title,body,published,created_at,updated_at").order("created_at",{ascending:false});
  if(error){console.error(error);return [];}
  return data||[];
}

function renderContentList(el,items,type){
  el.innerHTML="";
  if(!items.length){showListMessage(el,`No ${type==="announcement"?"announcements":"class information"} created yet.`);return;}
  items.forEach(item=>{
    const card=document.createElement("article");card.className="management-item";
    const main=document.createElement("div");
    const title=document.createElement("h4");title.textContent=item.title;
    const body=document.createElement("p");body.textContent=item.body;
    const meta=document.createElement("small");meta.textContent=`${item.published?"Published":"Draft"} • Updated ${formatSubmittedAt(item.updated_at||item.created_at)}`;
    main.append(title,body,meta);
    const actions=document.createElement("div");actions.className="management-actions";
    const edit=document.createElement("button");edit.className="secondary-btn compact";edit.type="button";edit.textContent="Edit";
    edit.onclick=()=>openContentModal(type,item);
    const toggle=document.createElement("button");toggle.className="secondary-btn compact";toggle.type="button";toggle.textContent=item.published?"Unpublish":"Publish";
    toggle.onclick=()=>togglePublished(type,item);
    const del=document.createElement("button");del.className="danger-btn compact";del.type="button";del.textContent="Delete";
    del.onclick=()=>deleteContent(type,item);
    actions.append(edit,toggle,del);card.append(main,actions);el.appendChild(card);
  });
}

async function refreshContent(){
  const [ann,info]=await Promise.all([loadContent("announcements"),loadContent("class_information")]);
  totalAnnouncements.textContent=ann.length;
  totalClassInfo.textContent=info.length;
  renderContentList(announcementList,ann,"announcement");
  renderContentList(classInfoList,info,"classinfo");
}

function openContentModal(type,item=null){
  contentMode=type; editingContentId=item?.id||null;
  $("contentModalKicker").textContent=type==="announcement"?"ANNOUNCEMENT":"CLASS INFORMATION";
  $("contentModalTitle").textContent=item?"Edit item":(type==="announcement"?"New Announcement":"New Class Information");
  $("contentTitle").value=item?.title||"";
  $("contentBody").value=item?.body||"";
  $("contentPublished").checked=!!item?.published;
  $("contentModalMessage").textContent="";
  openModal("contentModal");
}

async function saveContent(){
  const table=contentMode==="announcement"?"announcements":"class_information";
  const title=$("contentTitle").value.trim(), body=$("contentBody").value.trim(), published=$("contentPublished").checked;
  if(!title||!body){$("contentModalMessage").textContent="Title and content are required.";return;}
  const btn=$("saveContentBtn");btn.disabled=true;
  const payload={title,body,published,updated_at:new Date().toISOString()};
  let result;
  if(editingContentId) result=await supabaseClient.from(table).update(payload).eq("id",editingContentId);
  else result=await supabaseClient.from(table).insert(payload);
  btn.disabled=false;
  if(result.error){console.error(result.error);$("contentModalMessage").textContent=result.error.message||"Save failed.";return;}
  closeModals(); await refreshContent();
}

async function togglePublished(type,item){
  const table=type==="announcement"?"announcements":"class_information";
  const {error}=await supabaseClient.from(table).update({published:!item.published,updated_at:new Date().toISOString()}).eq("id",item.id);
  if(error){alert(error.message||"Update failed.");return;} await refreshContent();
}

async function deleteContent(type,item){
  if(!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
  const table=type==="announcement"?"announcements":"class_information";
  const {error}=await supabaseClient.from(table).delete().eq("id",item.id);
  if(error){alert(error.message||"Delete failed.");return;} await refreshContent();
}

const adminMenuBtn = $("adminMenuBtn");
const adminSidebar = $("adminSidebar");
const adminNavBackdrop = $("adminNavBackdrop");

const scheduleDays = {1:"Monday",2:"Tuesday",3:"Wednesday",4:"Thursday",5:"Friday",6:"Saturday",7:"Sunday"};
const scheduleModeLabels = {regular:"Regular / Original", f2f:"Current F2F", online:"Online Class", asynchronous:"Asynchronous"};
const scheduleAdminList = $("scheduleAdminList");

function scheduleTime(value){
  if(!value) return "—";
  const [h,m]=value.slice(0,5).split(":").map(Number);
  const d=new Date(); d.setHours(h,m,0,0);
  return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(d);
}

function renderScheduleAdmin(items){
  scheduleAdminList.innerHTML="";
  if(!items.length){showListMessage(scheduleAdminList,"No schedule entries yet. Add the first class schedule.");return;}
  const grouped={};
  items.forEach(item=>{
    const mode=item.class_mode || "regular";
    const key=`${mode}-${item.day_of_week}`;
    (grouped[key] ||= []).push(item);
  });

  const modeOrder={regular:1,f2f:2,online:3,asynchronous:4};
  Object.keys(grouped).sort((a,b)=>{
    const [am,ad]=a.split("-"), [bm,bd]=b.split("-");
    return (modeOrder[am]||99)-(modeOrder[bm]||99) || Number(ad)-Number(bd);
  }).forEach(key=>{
    const groupItems=grouped[key], mode=groupItems[0].class_mode || "regular", day=groupItems[0].day_of_week;
    const group=document.createElement("section"); group.className="schedule-admin-day";
    const head=document.createElement("div"); head.className="schedule-admin-day-head";
    const left=document.createElement("div");
    const kicker=document.createElement("span"); kicker.className="section-kicker"; kicker.textContent=scheduleModeLabels[mode] || "Schedule";
    const title=document.createElement("h4"); title.textContent=scheduleDays[day];
    left.append(kicker,title);
    const count=document.createElement("span"); count.textContent=`${groupItems.length} ${groupItems.length===1?"class":"classes"}`;
    head.append(left,count);
    const list=document.createElement("div"); list.className="schedule-admin-items";

    groupItems.sort((a,b)=>(a.start_time||"").localeCompare(b.start_time||"")).forEach(item=>{
      const row=document.createElement("article"); row.className="schedule-admin-item";
      const time=document.createElement("div"); time.className="schedule-admin-time"; time.textContent=`${scheduleTime(item.start_time)} – ${scheduleTime(item.end_time)}`;
      const copy=document.createElement("div"); copy.className="schedule-admin-copy";
      const subject=document.createElement("h4"); subject.textContent=item.subject;
      const meta=document.createElement("p"); meta.textContent=[item.instructor,item.room].filter(Boolean).join(" • ") || "No instructor/room specified";
      const notes=document.createElement("small"); notes.textContent=item.notes||"";
      copy.append(subject,meta,notes);
      const status=document.createElement("span"); status.className=`schedule-admin-status ${item.published?"published":"draft"}`; status.textContent=item.published?"Published":"Draft";
      const actions=document.createElement("div"); actions.className="management-actions";
      const edit=document.createElement("button"); edit.className="secondary-btn compact"; edit.type="button"; edit.textContent="Edit"; edit.onclick=()=>openScheduleModal(item);
      const toggle=document.createElement("button"); toggle.className="secondary-btn compact"; toggle.type="button"; toggle.textContent=item.published?"Unpublish":"Publish"; toggle.onclick=()=>toggleSchedule(item);
      const del=document.createElement("button"); del.className="danger-btn compact"; del.type="button"; del.textContent="Remove"; del.onclick=()=>deleteSchedule(item);
      actions.append(edit,toggle,del); row.append(time,copy,status,actions); list.appendChild(row);
    });
    group.append(head,list); scheduleAdminList.appendChild(group);
  });
}

async function loadScheduleAdmin(){
  const {data,error}=await supabaseClient.from("class_schedule").select("id,class_mode,day_of_week,start_time,end_time,subject,instructor,room,notes,published,created_at,updated_at").order("day_of_week",{ascending:true}).order("start_time",{ascending:true});
  if(error){console.error("Schedule:",error);showListMessage(scheduleAdminList,"Unable to load the schedule. Run the schedule migration in Supabase first.");return;}
  renderScheduleAdmin(data||[]);
}

function openScheduleModal(item=null){
  activeScheduleId=item?.id||null;
  $("scheduleModalTitle").textContent=item?"Edit Schedule":"Add Schedule";
  $("scheduleMode").value=item?.class_mode||"regular";
  $("scheduleDay").value=String(item?.day_of_week||1);
  $("scheduleSubject").value=item?.subject||"";
  $("scheduleStart").value=item?.start_time?.slice(0,5)||"";
  $("scheduleEnd").value=item?.end_time?.slice(0,5)||"";
  $("scheduleInstructor").value=item?.instructor||"";
  $("scheduleRoom").value=item?.room||"";
  $("scheduleNotes").value=item?.notes||"";
  $("schedulePublished").checked=Boolean(item?.published);
  $("scheduleModalMessage").textContent="";
  openModal("scheduleModal");
}

async function saveSchedule(){
  const payload={
    class_mode:$("scheduleMode").value,
    day_of_week:Number($("scheduleDay").value),
    subject:$("scheduleSubject").value.trim(),
    start_time:$("scheduleStart").value||null,
    end_time:$("scheduleEnd").value||null,
    instructor:$("scheduleInstructor").value.trim()||null,
    room:$("scheduleRoom").value.trim()||null,
    notes:$("scheduleNotes").value.trim()||null,
    published:$("schedulePublished").checked,
    updated_at:new Date().toISOString()
  };
  const msg=$("scheduleModalMessage");
  if(!["regular","f2f","online","asynchronous"].includes(payload.class_mode)){msg.textContent="Select a valid class type.";return;}
  if(!payload.subject||!payload.start_time||!payload.end_time){msg.textContent="Class type, day, subject, start time, and end time are required.";return;}
  if(payload.end_time<=payload.start_time){msg.textContent="End time must be later than start time.";return;}
  const btn=$("saveScheduleBtn"); btn.disabled=true;
  const result=activeScheduleId
    ? await supabaseClient.from("class_schedule").update(payload).eq("id",activeScheduleId)
    : await supabaseClient.from("class_schedule").insert(payload);
  btn.disabled=false;
  if(result.error){console.error(result.error);msg.textContent=result.error.message||"Unable to save schedule.";return;}
  closeModals(); await loadScheduleAdmin();
}

async function toggleSchedule(item){
  const {error}=await supabaseClient.from("class_schedule").update({published:!item.published,updated_at:new Date().toISOString()}).eq("id",item.id);
  if(error){alert(error.message);return}
  await loadScheduleAdmin();
}
async function deleteSchedule(item){
  if(!confirm(`Remove ${item.subject} on ${scheduleDays[item.day_of_week]}?`))return;
  const {error}=await supabaseClient.from("class_schedule").delete().eq("id",item.id);
  if(error){alert(error.message);return}
  await loadScheduleAdmin();
}

const adminHeaderSignOutBtn = $("adminHeaderSignOutBtn");

function setAdminNav(open){
  document.body.classList.toggle("admin-nav-open", open);
  document.body.style.overflow = open ? "hidden" : "";
  if(adminMenuBtn){
    adminMenuBtn.setAttribute("aria-expanded", String(open));
    adminMenuBtn.setAttribute("aria-label", open ? "Close admin navigation" : "Open admin navigation");
  }
  if(adminSidebar) adminSidebar.setAttribute("aria-hidden", String(!open));
  if(adminNavBackdrop) adminNavBackdrop.setAttribute("aria-hidden", String(!open));
}

if(adminMenuBtn) adminMenuBtn.addEventListener("click",()=>setAdminNav(!document.body.classList.contains("admin-nav-open")));
if(adminNavBackdrop) adminNavBackdrop.addEventListener("click",()=>setAdminNav(false));
document.addEventListener("keydown",e=>{ if(e.key === "Escape") setAdminNav(false); });
window.addEventListener("resize",()=>{ if(window.innerWidth > 960) setAdminNav(false); });
async function performAdminSignOut(){
  setAdminNav(false);
  const {error}=await supabaseClient.auth.signOut();
  if(error){
    console.error(error);
    alert(error.message || "Unable to sign out. Please try again.");
    return;
  }
  window.location.replace(`${window.location.origin}/login/index.html`);
}
if(adminHeaderSignOutBtn) adminHeaderSignOutBtn.addEventListener("click",performAdminSignOut);

document.querySelectorAll(".admin-tab").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll(".admin-tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".admin-tab-panel").forEach(x=>x.classList.remove("active"));
  tab.classList.add("active"); $("tab-"+tab.dataset.tab).classList.add("active");
  updateAdminSection(tab.dataset.tab);
  setAdminNav(false);
  window.scrollTo({top:0,behavior:"smooth"});
}));

searchInput.addEventListener("input",renderStudents);
filterSelect.addEventListener("change",renderStudents);
sortSelect.addEventListener("change",renderStudents);
refreshBtn.addEventListener("click",async()=>{refreshBtn.disabled=true;await renderStudents();await refreshContent();refreshBtn.disabled=false;});
exportBtn.addEventListener("click",exportCsv);
$("saveStudentBtn").addEventListener("click",saveStudent);
$("deleteStudentBtn").addEventListener("click",deleteStudent);
$("newOfficerBtn").addEventListener("click",()=>openOfficerModal());
$("saveOfficerBtn").addEventListener("click",saveOfficer);
$("newAnnouncementBtn").addEventListener("click",()=>openContentModal("announcement"));
$("newClassInfoBtn").addEventListener("click",()=>openContentModal("classinfo"));
$("newScheduleBtn").addEventListener("click",()=>openScheduleModal());
$("saveScheduleBtn").addEventListener("click",saveSchedule);
$("saveContentBtn").addEventListener("click",saveContent);

const adminSectionMeta = {
  students: {title: 'Portal Management', subtitle: 'Search, review, and update registered BSIS 1-A student records.'},
  officers: {title: 'Class Officers', subtitle: 'Manage the official classroom leadership roster and linked student PFPs.'},
  announcements: {title: 'Announcements', subtitle: 'Create and manage announcements published to the student portal.'},
  classinfo: {title: 'Class Information', subtitle: 'Manage reminders, links, and other class resources.'},
  schedule: {title: 'Schedule', subtitle: 'Manage the official weekly BSIS 1-A class timetable.'}
};

function updateAdminSection(tabName){
  const meta = adminSectionMeta[tabName] || adminSectionMeta.students;
  const heading = document.querySelector('.admin-heading h2');
  const subtitle = document.getElementById('adminPageSubtitle');
  if(heading){
    heading.innerHTML = `${meta.title.split(' ')[0]} <span>${meta.title.split(' ').slice(1).join(' ')}</span>`;
  }
  if(subtitle) subtitle.textContent = meta.subtitle;
  document.title = `BSIS 1-A | ${meta.title}`;
}

(async()=>{
  const adminInfo = await BSISAdmin.apply();
  if(adminInfo?.isAdmin){
    const name = adminInfo.name || 'Administrator';
    const avatar = adminInfo.avatar;
    const sideName = document.getElementById('adminSidebarName');
    if(sideName) sideName.textContent = name;
    const sideAvatar = document.getElementById('adminSidebarAvatar');
    if(sideAvatar && avatar){ sideAvatar.src = `${avatar}${avatar.includes('?')?'&':'?'}v=${Date.now()}`; sideAvatar.alt = `${name} profile photo`; }
  }
  updateAdminSection('students');
  await renderStudents();
  await refreshOfficers();
  await refreshContent();
  await loadScheduleAdmin();
})();
