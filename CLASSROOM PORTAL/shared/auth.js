// Shared auth helpers for the separate student portals.
const APP_ORIGIN = window.location.origin;
const LOGIN_PAGE = `${APP_ORIGIN}/login/index.html`;
const REGISTRAR_PAGE = `${APP_ORIGIN}/registrar/index.html`;
const FORCE_GOOGLE_ACCOUNT_SWITCH_KEY = "bsis_force_google_account_switch";

function redirectToLogin(){window.location.replace(LOGIN_PAGE);}
function redirectToRegistrar(){window.location.replace(REGISTRAR_PAGE);}

async function requireSession(){
  const {data,error}=await supabaseClient.auth.getSession();
  if(error||!data.session){redirectToLogin();return null}
  return data.session
}

async function signOutAndGoLogin(){
  await supabaseClient.auth.signOut({scope:"local"});
  redirectToLogin();
}

function setAccountSwitchIntent(){
  try{window.sessionStorage.setItem(FORCE_GOOGLE_ACCOUNT_SWITCH_KEY,"1");}catch(error){
    console.warn("Unable to persist account-switch intent:",error);
  }
}

function hasAccountSwitchIntent(){
  try{return window.sessionStorage.getItem(FORCE_GOOGLE_ACCOUNT_SWITCH_KEY)==="1";}catch(error){
    console.warn("Unable to read account-switch intent:",error);
    return false;
  }
}

function clearAccountSwitchIntent(){
  try{window.sessionStorage.removeItem(FORCE_GOOGLE_ACCOUNT_SWITCH_KEY);}catch(error){
    console.warn("Unable to clear account-switch intent:",error);
  }
}

/*
 * Supabase's browser client stores its session in localStorage by default.
 * Remove only Supabase auth storage after signOut; do not clear the whole
 * browser storage because the application may have unrelated state.
 */
function clearSupabaseAuthStorage(){
  const projectRef = SUPABASE_URL.match(/^https?:\/\/([^.]+)\.supabase\.co/i)?.[1];
  const authKeyPrefix = projectRef ? `sb-${projectRef}-auth-token` : null;
  const legacyKeys = new Set(["supabase.auth.token"]);

  const removeMatchingKeys = storage => {
    if(!storage)return;
    for(let i=storage.length-1;i>=0;i--){
      const key=storage.key(i);
      if((authKeyPrefix && key===authKeyPrefix) || legacyKeys.has(key)){
        storage.removeItem(key);
      }
    }
  };

  try{removeMatchingKeys(window.localStorage);}catch(error){
    console.warn("Unable to clear Supabase local auth storage:",error);
  }
  try{removeMatchingKeys(window.sessionStorage);}catch(error){
    console.warn("Unable to clear Supabase session auth storage:",error);
  }
}

async function signOutForAccountSwitch(){
  setAccountSwitchIntent();

  try{
    await supabaseClient.auth.signOut({scope:"local"});
  }catch(error){
    console.warn("Supabase local sign-out failed during account switch:",error);
  }

  // signOut normally removes the session itself; this targeted cleanup is a
  // defensive second step for stale/legacy browser auth entries.
  clearSupabaseAuthStorage();
}
