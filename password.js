import { db, membership } from './auth.js';
import { passwordAccess, savePassword, passwordProblem } from './password-core.js';

const form=document.getElementById('password-form'),status=document.getElementById('status'),button=document.getElementById('save'),recovery=document.getElementById('recovery');
const password=document.getElementById('password'),confirmation=document.getElementById('confirmation');
const params=new URLSearchParams(location.hash.slice(1));
const invalidLink=params.has('error')||params.has('error_code')||new URLSearchParams(location.search).has('error');
const unavailable=()=>{form.hidden=true;recovery.hidden=false;status.textContent='This link is expired, already used, or your session is unavailable. Request a new link, or sign in with your temporary password first.';};
try {
 const allowed=await passwordAccess(db,membership,invalidLink);
 // The SDK has finished processing the recovery fragment. Do not keep tokens in the address bar.
 history.replaceState(null,'',location.pathname);
 if(allowed){form.hidden=false;status.textContent='';}else unavailable();
}catch{history.replaceState(null,'',location.pathname);recovery.hidden=false;status.textContent='We could not verify your access. Refresh to retry, or request a new reset link.';}

confirmation.addEventListener('input',()=>confirmation.setCustomValidity(''));
password.addEventListener('input',()=>confirmation.setCustomValidity(''));
form.addEventListener('submit',async event=>{
 event.preventDefault();if(button.disabled)return;
 const problem=passwordProblem(password.value,confirmation.value);
 if(problem){status.textContent=problem;confirmation.setCustomValidity(problem);confirmation.reportValidity();return;}
 button.disabled=true;status.textContent='Saving your password…';
 try {
  const {error}=await savePassword(db,membership,password.value,confirmation.value);
  if(error){
   if(['session_expired','session_not_found','refresh_token_not_found','bad_jwt'].includes(error.code)){unavailable();return;}
   if(['reauthentication_needed','reauthentication_not_valid'].includes(error.code)){status.textContent='Please use a fresh email reset link to verify your identity before changing your password.';recovery.hidden=false;return;}
   status.textContent=error.code==='same_password'?'Choose a password different from your current password.':error.code==='weak_password'?'That password does not meet the account security requirements. Choose a stronger password.':'Your password could not be saved. Please try again, or request a fresh reset link.';
   recovery.hidden=false;return;
  }
  form.reset();form.hidden=true;recovery.hidden=true;
  status.textContent='Your password has been updated. Sign in with your new password.';
  document.getElementById('back').textContent='Sign in with your new password';
  // End this browser session; never keep a password in app storage or send it to analytics.
  await db.auth.signOut({scope:'local'}).catch(()=>{});
 }catch{status.textContent='Your password could not be saved. Check your connection and try again.';}
 finally{button.disabled=false;}
});
