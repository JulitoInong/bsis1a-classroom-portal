let currentUser=null;const form=document.getElementById("studentForm"),studentNo=document.getElementById("studentNo"),birthday=document.getElementById("birthday"),fullName=document.getElementById("fullName"),gmail=document.getElementById("gmail"),submitBtn=document.getElementById("submitBtn"),message=document.getElementById("message"),profileName=document.getElementById("googleProfileName"),profileEmail=document.getElementById("googleProfileEmail"),avatar=document.getElementById("googleAvatar"),switchGoogleAccountBtn=document.getElementById("switchGoogleAccountBtn");
function showMessage(t,type){message.textContent=t;message.className=`message show ${type}`;}
function cleanName(v){return v.trim().replace(/\s+/g," ")}function normalizeName(v){return v.toLowerCase().normalize("NFKC").replace(/[.,/#!$%^&*;:{}=_`~()\-]/g," ").replace(/\s+/g," ").trim()}
function future(v){const d=new Date(`${v}T00:00:00`),today=new Date();today.setHours(0,0,0,0);return d>today}
function setLoading(v){submitBtn.disabled=v;submitBtn.classList.toggle("loading",v)}
async function signOutAndPromptDifferentAccount(event){
  event?.preventDefault();
  event?.stopPropagation();

  if(switchGoogleAccountBtn)switchGoogleAccountBtn.disabled=true;

  await signOutForAccountSwitch();

  const loginUrl=new URL("../login/index.html",window.location.href);
  loginUrl.searchParams.set("switch_account","1");
  window.location.replace(loginUrl.href);
}
async function load(){const {data:{session},error}=await supabaseClient.auth.getSession();if(error||!session){window.location.replace("../login/index.html");return}currentUser=session.user;
clearAccountSwitchIntent();
const {data:existing,error:readError}=await supabaseClient.from("students").select("id").eq("auth_user_id",currentUser.id).maybeSingle();
if(readError){console.error(readError);showMessage("Unable to verify your registration. Please try again.","error");return}
if(existing){window.location.replace("../home/index.html");return}
const m=currentUser.user_metadata||{};profileName.textContent=m.full_name||m.name||"Google account";profileEmail.textContent=currentUser.email||"—";const photo=m.avatar_url||m.picture;if(photo){avatar.src=photo;avatar.alt="Google profile photo"}fullName.value=m.full_name||m.name||"";gmail.value=currentUser.email||"";}
form.addEventListener("submit",async e=>{e.preventDefault();const no=studentNo.value.trim().replace(/\s+/g," "),name=cleanName(fullName.value),birth=birthday.value,email=(gmail.value||"").trim().toLowerCase();if(!no)return showMessage("Please enter your Student No.","error");if(!birth)return showMessage("Please enter your birthday.","error");if(future(birth))return showMessage("Birthday cannot be a future date.","error");if(name.split(" ").filter(Boolean).length<2)return showMessage("Please enter your complete name.","error");if(!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/.test(email))return showMessage("Your authenticated Google account did not return a valid Gmail address.","error");setLoading(true);try{const norm=normalizeName(name);const [{data:noData,error:noErr},{data:nameData,error:nameErr},{data:gData,error:gErr}]=await Promise.all([supabaseClient.from("students").select("id").eq("student_no",no).limit(1),supabaseClient.from("students").select("id").eq("normalized_name",norm).limit(1),supabaseClient.from("students").select("id").ilike("gmail",email).limit(1)]);if(noErr||nameErr||gErr)throw new Error("verification");if(noData?.length)return showMessage("This Student No. has already been submitted.","error");if(nameData?.length)return showMessage("This name has already been submitted.","error");if(gData?.length)return showMessage("This Gmail address is already registered.","error");const m=currentUser.user_metadata||{};const avatarUrl=m.avatar_url||m.picture||null;const {error}=await supabaseClient.from("students").insert({student_no:no,full_name:name,birthday:birth,gmail:email,normalized_name:norm,auth_user_id:currentUser.id,avatar_url:avatarUrl});if(error){console.error(error);return showMessage("Registration could not be saved. Please try again.","error")}window.location.replace("../home/index.html")}catch(err){console.error(err);showMessage("We could not verify the information. Please try again.","error")}finally{setLoading(false)}});
if(switchGoogleAccountBtn){switchGoogleAccountBtn.addEventListener("click", signOutAndPromptDifferentAccount);}
load();
BSISAdmin.apply();