import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
export const db = createClient('https://jtifhcvbgxqwlywugvjv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aWZoY3ZiZ3hxd2x5d3Vndmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDc5NTgsImV4cCI6MjA4ODA4Mzk1OH0.UfRVLuvM8_HPvKXUEDXb0cxR50znv16L5Tf99AnSc7g', {
 auth: { storageKey:'sb-inky-duck-auth', persistSession:true, autoRefreshToken:true, detectSessionInUrl:false }
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
