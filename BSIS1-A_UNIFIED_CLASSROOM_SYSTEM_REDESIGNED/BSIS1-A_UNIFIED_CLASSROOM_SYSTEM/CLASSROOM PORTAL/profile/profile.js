const studentMenuBtn=document.getElementById("studentMenuBtn"),studentNav=document.getElementById("studentNav"),studentNavBackdrop=document.getElementById("studentNavBackdrop");
function setStudentNav(open){document.body.classList.toggle("student-nav-open",open);document.body.style.overflow=open?"hidden":"";studentMenuBtn?.setAttribute("aria-expanded",String(open));studentMenuBtn?.setAttribute("aria-label",open?"Close student navigation":"Open student navigation");studentNav?.setAttribute("aria-hidden",String(!open));studentNavBackdrop?.setAttribute("aria-hidden",String(!open));}
studentMenuBtn?.addEventListener("click",()=>setStudentNav(!document.body.classList.contains("student-nav-open")));studentNavBackdrop?.addEventListener("click",()=>setStudentNav(false));studentNav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>setStudentNav(false)));document.addEventListener("keydown",e=>{if(e.key==="Escape")setStudentNav(false)});window.addEventListener("resize",()=>{if(window.innerWidth>960)setStudentNav(false)});


const avatar=document.getElementById("avatar"),profileName=document.getElementById("profileName"),fullName=document.getElementById("fullName"),studentNo=document.getElementById("studentNo"),gmail=document.getElementById("gmail"),birthday=document.getElementById("birthday"),photoInput=document.getElementById("photoInput"),uploadMessage=document.getElementById("uploadMessage"),signOut=document.getElementById("signOutBtn");
const MAX_FILE_SIZE=5*1024*1024;

function show(t,type){uploadMessage.textContent=t;uploadMessage.className=`message show ${type}`;}

function setAvatar(url,name){
  avatar.classList.remove("avatar-empty");
  if(url){
    const cacheBusted = url.includes("?") ? `${url}&v=${Date.now()}` : `${url}?v=${Date.now()}`;
    avatar.src=cacheBusted;
    avatar.alt=`${name||"Student"} profile photo`;
    avatar.onerror=()=>{ avatar.removeAttribute("src"); avatar.classList.add("avatar-empty"); };
    return;
  }
  avatar.removeAttribute("src");
  avatar.alt="No profile photo";
  avatar.classList.add("avatar-empty");
}

function dateText(v){if(!v)return "—";return new Intl.DateTimeFormat("en-US",{month:"long",day:"2-digit",year:"numeric"}).format(new Date(`${v}T00:00:00`))}

async function init(){
  const {data:{session},error}=await supabaseClient.auth.getSession();
  if(error||!session)return window.location.replace("../login/index.html");
  const {data:student,error:e}=await supabaseClient.from("students").select("student_no,full_name,birthday,gmail,avatar_url").eq("auth_user_id",session.user.id).maybeSingle();
  if(e){console.error(e);show("Unable to load your profile.","error");return}
  if(!student)return window.location.replace("../registrar/index.html");
  profileName.textContent=student.full_name||"Student";
  fullName.textContent=student.full_name||"—";
  studentNo.textContent=student.student_no||"—";
  gmail.textContent=student.gmail||session.user.email||"—";
  birthday.textContent=dateText(student.birthday);
  setAvatar(student.avatar_url||session.user.user_metadata?.avatar_url||session.user.user_metadata?.picture,student.full_name);
  await BSISAdmin.apply();
}

photoInput.addEventListener("change",async()=>{
  const file=photoInput.files?.[0];
  if(!file)return;
  if(!file.type.startsWith("image/")){show("Please select an image file.","error");photoInput.value="";return}
  if(file.size>MAX_FILE_SIZE){show("Profile photo must be 5 MB or smaller.","error");photoInput.value="";return}

  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session)return window.location.replace("../login/index.html");

  show("Uploading profile photo...","success");
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  const path=`${session.user.id}/${crypto.randomUUID()}.${ext}`;

  const {error:uploadError}=await supabaseClient.storage.from("student-avatars").upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError){
    console.error(uploadError);
    show(`Photo upload failed: ${uploadError.message||"check the student-avatars bucket and policies."}`,"error");
    photoInput.value="";
    return;
  }

  const {data:urlData}=supabaseClient.storage.from("student-avatars").getPublicUrl(path);
  const publicUrl=urlData.publicUrl;
  const {data:updated,error:updateError}=await supabaseClient.from("students").update({avatar_url:publicUrl}).eq("auth_user_id",session.user.id).select("avatar_url").maybeSingle();

  if(updateError){
    console.error(updateError);
    show(`The photo uploaded, but the student record could not be updated: ${updateError.message||"database update failed."}`,"error");
    return;
  }
  if(!updated?.avatar_url){
    show("The photo uploaded, but no student record was updated. Check the students UPDATE policy.","error");
    return;
  }

  setAvatar(updated.avatar_url,profileName.textContent);
  show("Profile photo updated and saved.","success");
  photoInput.value="";
});

signOut.addEventListener("click",async()=>{await supabaseClient.auth.signOut();window.location.replace("../login/index.html")});
init();
