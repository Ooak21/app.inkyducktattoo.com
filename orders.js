// Browser code contains no WooCommerce or service credentials.
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const orderLink=id=>Number.isSafeInteger(Number(id))&&Number(id)>0?'https://inkyducktattoo.com/wp-admin/admin.php?page=wc-orders&action=edit&id='+Number(id):null;
export const money=(v,currency)=>{try{if(!/^[A-Z]{3}$/.test(currency)||!Number.isFinite(Number(v)))return 'Unavailable';return new Intl.NumberFormat(undefined,{style:'currency',currency}).format(Number(v));}catch{return 'Unavailable';}};
const date=v=>{const d=new Date(v);return v&&Number.isFinite(d.getTime())?new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(d):'Not supplied';};
const status=v=>({completed:'Completed',processing:'Processing',refunded:'Refunded',cancelled:'Cancelled',failed:'Failed',pending:'Pending payment','on-hold':'On hold',imported:'Imported',updated:'Updated',unchanged:'Already current',ignored_stale:'Newer version retained',unpaid_not_imported:'Unpaid · skipped',eligible_purchase:'Ready to import',needs_review:'Needs review'}[v]||v);
export function renderOrders(rows){
 return rows.map(o=>`<article class="order-card"><header><div><a href="${escape(orderLink(o.woo_order_id)||'#')}" target="_blank" rel="noopener">Order #${escape(o.order_number)}</a><div class="muted">${escape(date(o.created_at_woo))} · ${escape(o.currency)}</div></div><span class="pill ${o.status==='refunded'?'due':''}">${escape(status(o.status))}</span></header><ul>${(Array.isArray(o.items)?o.items:[]).map(i=>`<li><span>${escape(i.name)} <span class="muted">× ${escape(i.quantity)}</span></span><span>${escape(money(i.total,o.currency))}</span></li>`).join('')}</ul><dl><dt>Order total</dt><dd>${escape(money(o.total,o.currency))}</dd><dt>Shipping included</dt><dd>${escape(money(o.shipping_total,o.currency))}</dd><dt>Tax included</dt><dd>${escape(money(o.total_tax,o.currency))}</dd>${Number(o.refunded_total)>0?`<dt class="refund">Refunded</dt><dd class="refund">${escape(money(o.refunded_total,o.currency))}</dd>`:''}</dl><div class="order-sync muted">Updated in CRM ${escape(date(o.synced_at))} · <a href="${escape(orderLink(o.woo_order_id)||'#')}" target="_blank" rel="noopener">Open in WooCommerce ↗</a></div></article>`).join('');
}
export async function mountOrders(host,db,leadId){
 host.innerHTML='<h3>Order history</h3><p class="muted" role="status">Loading orders…</p>';
 let page=0,rows=[],busy=false;
 const load=async()=>{
  if(busy)return;busy=true;const more=host.querySelector('button');if(more)more.disabled=true;
  try{
   const {data,error}=await db.from('inky_duck_orders').select('*').eq('lead_id',leadId).order('created_at_woo',{ascending:false}).order('woo_order_id',{ascending:false}).range(page*20,page*20+20);
   if(error)throw error;if(!host.isConnected)return;
   const hasMore=data.length>20;rows.push(...data.slice(0,20));page++;
   host.innerHTML='<h3>Order history</h3>'+(rows.length?renderOrders(rows):'<p class="muted">No synced purchases for this contact.</p>')+(hasMore?'<button type="button" class="btn order-more">Load more orders</button>':'')+'<p class="footnote">Orders come from WooCommerce. A purchase does not grant marketing consent.</p>';
   host.querySelector('button')?.addEventListener('click',load);
  }catch{if(host.isConnected){host.innerHTML='<h3>Order history</h3>'+renderOrders(rows)+'<p role="alert">Orders could not be loaded.</p><button type="button" class="btn">Retry loading orders</button>';host.querySelector('button').addEventListener('click',load);}}
  finally{busy=false;}
 };await load();
}
const endpoint='https://fbunxgjlldxvnrjoruwk.supabase.co/functions/v1/inky-duck-woo-sync';
export function initOrderImport(db,user,onImported,{request=fetch}={}){
 const toggle=document.getElementById('order-import-toggle'),panel=document.getElementById('order-import');
 if(user.inkyRole!=='admin')return;toggle.hidden=false;
 let busy=false,previewed=false;
 panel.innerHTML='<div class="import-heading"><div><h2>Import WooCommerce orders</h2><p class="muted">Preview existing orders, then bring paid purchases and refund history into customer records.</p></div><button type="button" class="btn" id="import-close">Close</button></div><p>Customers are matched by billing email. Existing conversations and follow-ups are preserved.</p><div class="import-actions"><button type="button" class="btn" id="import-preview">Preview existing orders</button><button type="button" class="btn primary" id="import-run" hidden>Import reviewed orders</button></div><p id="import-status" role="status" aria-live="polite"></p><div id="import-results"></div>';
 const $=id=>panel.querySelector('#'+id);
 toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;});$('import-close').addEventListener('click',()=>{if(!busy)panel.hidden=true;});
 const render=rows=>{const counts={};for(const r of rows)counts[r.result]=(counts[r.result]||0)+1;
  $('import-results').innerHTML='<div class="import-counts">'+Object.entries(counts).map(([k,v])=>`<span class="pill">${escape(status(k))}: ${v}</span>`).join('')+'</div><div class="import-table"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Woo status</th><th>Result</th></tr></thead><tbody>'+rows.map(r=>`<tr><td>${r.order_id?`<a href="${escape(orderLink(r.order_id))}" target="_blank" rel="noopener">#${escape(r.order_number||r.order_id)}</a>`:'Unknown'}</td><td>${escape(r.name||'Needs review')}</td><td>${r.total?escape(money(r.total,r.currency)):'—'}</td><td>${escape(status(r.status||'—'))}</td><td>${escape(status(r.result))}${r.reason?`<small>${escape(r.reason)}</small>`:''}</td></tr>`).join('')+'</tbody></table></div>';
 };
 const run=async action=>{
  if(busy||action==='import'&&!previewed)return;busy=true;let page=1,rows=[];
  $('import-preview').disabled=true;$('import-run').disabled=true;$('import-close').disabled=true;toggle.disabled=true;
  if(action==='preview'){previewed=false;$('import-run').hidden=true;$('import-results').innerHTML='';}
  try{
   while(page){
    $('import-status').textContent=(action==='preview'?'Previewing':'Importing')+' page '+page+'…';
    const {data:{session},error}=await db.auth.getSession();if(error||!session)throw new Error('Sign in again to import orders.');
    const response=await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({action,page}),signal:AbortSignal.timeout(60000)});
    const result=await response.json();if(!response.ok||!result.success||!Array.isArray(result.results))throw new Error('Could not '+action+' page '+page+'. You can retry safely.');
    rows.push(...result.results);render(rows);
    if(result.next_page!==null&&(!Number.isSafeInteger(result.next_page)||result.next_page<=page||result.next_page>10000))throw new Error('Invalid pagination. Retry the preview.');
    page=result.next_page;
   }
   const review=rows.filter(r=>r.result==='needs_review').length;
   $('import-status').textContent=action==='preview'?`Preview complete: ${rows.length} orders checked. Review the list, then choose Import reviewed orders.${review?' '+review+' need manual review.':''}`:`Import complete: ${rows.length} orders checked.${review?' '+review+' skipped for manual review.':''} Unpaid orders were skipped.`;
   if(action==='preview'){previewed=true;$('import-run').hidden=!rows.some(r=>r.result==='eligible_purchase');}
   else{previewed=false;$('import-run').hidden=true;await onImported();}
  }catch(error){$('import-status').textContent=(error instanceof Error?error.message:'Could not complete the import.')+(action==='import'?' Earlier successful rows are saved. Run again to reconcile safely.':'');if(action==='import')await onImported();}
  finally{busy=false;$('import-preview').disabled=false;$('import-run').disabled=false;$('import-close').disabled=false;toggle.disabled=false;}
 };
 $('import-preview').addEventListener('click',()=>run('preview'));$('import-run').addEventListener('click',()=>run('import'));
}
