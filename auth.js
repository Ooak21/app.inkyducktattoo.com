import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
export const db = createClient('https://fbunxgjlldxvnrjoruwk.supabase.co', 'sb_publishable_ltaNA7nnVozoSCOcZIjg', {
 auth: { storageKey:'sb-inky-duck-isolated-auth', persistSession:true, autoRefreshToken:true, detectSessionInUrl:location.pathname.endsWith('/password.html') }
});
export async function membership() {
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)return null;
 const {data,error:denied}=await db.from('inky_duck_members').select('role').eq('user_id',user.id).eq('active',true).maybeSingle();
 if(denied)throw new Error('Cannot check access. Please try again.');
 return data ? {...user,inkyRole:data.role} : null;
}
export async function guard() {
 const user=await membership();
 if(!user){await db.auth.signOut();location.replace('./login.html?access=required');return null;}
 return user;
}
export async function signOut(){await db.auth.signOut();location.replace('./login.html');}
