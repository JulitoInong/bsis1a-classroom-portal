const btn=document.getElementById("googleSignInBtn");
const switchBtn=document.getElementById("switchGoogleAccountBtn");
const message=document.getElementById("message");

function msg(text,type=""){
  message.textContent=text;
  message.className=`message show ${type}`;
}

function loading(value){
  if(!btn)return;
  btn.disabled=value;
  btn.classList.toggle("loading",value);
}

function shouldForceGooglePicker(){
  const params=new URLSearchParams(window.location.search);
  return params.get("switch_account")==="1" || hasAccountSwitchIntent();
}

async function forceSignOutThenRedirect(){
  if(switchBtn)switchBtn.disabled=true;

  await signOutForAccountSwitch();

  const loginUrl=new URL("./index.html",window.location.href);
  loginUrl.searchParams.set("switch_account","1");
  window.location.replace(loginUrl.href);
}

async function startGoogle(){
  loading(true);
  msg("");

  const forcePicker=shouldForceGooglePicker();
  const redirectTo=new URL("../registrar/index.html",window.location.href).href;

  if(forcePicker)setAccountSwitchIntent();

  const {error}=await supabaseClient.auth.signInWithOAuth({
    provider:"google",
    options:{
      redirectTo,
      queryParams:{
        access_type:"offline",
        prompt:forcePicker ? "select_account" : "consent"
      }
    }
  });

  if(error){
    console.error("Google OAuth error:",error);
    msg(`Google sign-in could not be started: ${error.message||"Please try again."}`,"error");
    loading(false);
  }
}

if(btn)btn.addEventListener("click",startGoogle);
if(switchBtn)switchBtn.addEventListener("click",forceSignOutThenRedirect);

let sessionCheckInProgress=false;

async function checkExistingSession(){
  if(sessionCheckInProgress)return;
  sessionCheckInProgress=true;

  try{
    const forcePicker=shouldForceGooglePicker();
    const {data,error}=await supabaseClient.auth.getSession();

    if(error){
      console.error("Unable to read Supabase session:",error);
      return;
    }

    if(forcePicker){
      /*
       * Account switching must win over the normal authenticated-session
       * redirect. If an old session survived, terminate only that session
       * and remain on login so the user can explicitly choose another Google
       * account.
       */
      if(data.session){
        await signOutForAccountSwitch();
      }

      msg("Choose the Google account you want to use for this portal.","info");
      if(switchBtn){
        switchBtn.textContent="Re-open Google account chooser";
        switchBtn.disabled=false;
      }
      return;
    }

    if(data.session){
      window.location.replace("../registrar/index.html");
    }
  }finally{
    sessionCheckInProgress=false;
  }
}

checkExistingSession();
window.addEventListener("pageshow",checkExistingSession);
