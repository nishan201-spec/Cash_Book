const KEY="cashBoi_v1";
let data=JSON.parse(localStorage.getItem(KEY)||'{"transactions":[],"people":[]}');
const $=id=>document.getElementById(id);
const taka=n=>"৳ "+Number(n||0).toLocaleString("bn-BD",{maximumFractionDigits:2});
const now=()=>{const d=new Date();return {date:d.toISOString(),label:d.toLocaleString("bn-BD",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"})}};
function save(){localStorage.setItem(KEY,JSON.stringify(data));renderAll()}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function monthKey(iso){const d=new Date(iso);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

const pages=["home","income","expense","due","debt"];
function showPage(name){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  $(name+"Page").classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
  window.scrollTo({top:0,behavior:"smooth"}); renderAll();
}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>openModal(b.dataset.go));

function renderMonthSelect(){
  const s=$("monthSelect"), current=s.value||monthKey(new Date().toISOString());
  const months=new Set([monthKey(new Date().toISOString()),...data.transactions.map(x=>monthKey(x.createdAt))]);
  const sorted=[...months].sort().reverse();
  s.innerHTML=sorted.map(m=>{const [y,mo]=m.split("-");const label=new Date(+y,+mo-1,1).toLocaleString("bn-BD",{month:"long",year:"numeric"});return `<option value="${m}">${label}</option>`}).join("");
  s.value=sorted.includes(current)?current:sorted[0];
}
$("monthSelect").onchange=renderAll;

function totals(){
  const income=data.transactions.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount),0);
  const expense=data.transactions.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount),0);
  return {income,expense,balance:income-expense};
}
function renderHome(){
  const t=totals();
  $("totalBalance").textContent=taka(t.balance);
  $("cashBalance").textContent=taka(t.balance);
  const dueOutstanding=data.people.filter(x=>x.type==="due").reduce((a,x)=>a+Math.max(0,Number(x.amount)-Number(x.deposit||0)),0);
  const debtOutstanding=data.people.filter(x=>x.type==="debt").reduce((a,x)=>a+Math.max(0,Number(x.amount)-Number(x.deposit||0)),0);
  $("dueBalance").textContent=taka(dueOutstanding);
  $("debtBalance").textContent=taka(debtOutstanding);
  const m=$("monthSelect").value||monthKey(new Date().toISOString());
  const mt=data.transactions.filter(x=>monthKey(x.createdAt)===m);
  $("monthIncome").textContent=taka(mt.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount),0));
  $("monthExpense").textContent=taka(mt.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount),0));
  const arr=[...data.transactions].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
  $("recentList").innerHTML=arr.length?arr.map(txHtml).join(""):`<div class="empty">এখনও কোনো লেনদেন নেই।<br>উপরের Quick Action থেকে শুরু করো।</div>`;
}
function txHtml(x){
  const inc=x.type==="income"; return `<div class="transaction">
    <div class="tx-icon ${inc?"in":"out"}">${inc?"↑":"↓"}</div>
    <div class="tx-main"><b>${escapeHtml(x.category)}</b><small><span class="type-badge ${inc?"income-badge":"expense-badge"}">${inc?"আয়":"ব্যয়"}</span> • ${escapeHtml(x.timeLabel)}${x.note?" • "+escapeHtml(x.note):""}</small></div>
    <div class="tx-amount ${inc?"in":"out"}">${inc?"+":"−"}${taka(x.amount)}</div>
    <button class="icon-btn" onclick="deleteTx('${x.id}')">🗑</button>
  </div>`;
}
function renderTxPage(type){
  const arr=data.transactions.filter(x=>x.type===type).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  $(type+"List").innerHTML=arr.length?arr.map(txHtml).join(""):`<div class="empty">কোনো ${type==="income"?"আয়":"ব্যয়"} নেই।</div>`;
}
function renderPeople(type){
  const arr=data.people.filter(x=>x.type===type).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  $(type==="due"?"dueList":"debtList").innerHTML=arr.length?arr.map(personHtml).join(""):`<div class="empty">কোনো ${type==="due"?"পাওনা":"দেনা"} নেই।</div>`;
}
function personHtml(p){
  const rem=Math.max(0,Number(p.amount)-Number(p.deposit||0));
  const paid=rem===0; return `<div class="person-card">
    <div class="person-avatar">${escapeHtml((p.name||"?").trim().charAt(0))}</div>
    <div class="person-main">
      <div class="name">${escapeHtml(p.name)}</div>
      <div class="meta">${escapeHtml(p.category)} • ${escapeHtml(p.timeLabel)}${p.phone?" • "+escapeHtml(p.phone):""}</div>
      <div class="money-row"><span>মূল: <b>${taka(p.amount)}</b></span><span class="paid">জমা: <b>${taka(p.deposit)}</b></span><span class="due">বাকি: <b>${taka(rem)}</b></span></div>
      ${paid?'<div class="meta">✓ সম্পূর্ণ পরিশোধিত</div>':""}
    </div>
    <div class="card-actions">
      ${!paid?`<button class="icon-btn" title="জমা" onclick="addPayment('${p.id}')">＋</button>`:""}
      <button class="icon-btn" title="Edit" onclick="editPerson('${p.id}')">✎</button>
      <button class="icon-btn" title="Delete" onclick="deletePerson('${p.id}')">🗑</button>
    </div>
  </div>`;
}
function renderAll(){renderMonthSelect();renderHome();renderTxPage("income");renderTxPage("expense");renderPeople("due");renderPeople("debt")}

function openModal(type, edit=null){
  $("entryForm").reset(); $("editId").value=edit?.id||""; $("entryType").value=type;
  $("modalTitle").textContent=edit?(type==="income"?"আয় সম্পাদনা":type==="expense"?"ব্যয় সম্পাদনা":type==="due"?"পাওনা সম্পাদনা":"দেনা সম্পাদনা"):(type==="income"?"নতুন আয়":type==="expense"?"নতুন ব্যয়":type==="due"?"নতুন পাওনা":"নতুন দেনা");
  const person=["due","debt"].includes(type); $("personFields").classList.toggle("hidden",!person); $("depositFields").classList.toggle("hidden",!person);
  if(edit){
    $("category").value=edit.category||"";$("amount").value=edit.amount||"";$("note").value=edit.note||"";
    if(person){$("personName").value=edit.name||"";$("designation").value=edit.designation||"";$("address").value=edit.address||"";$("phone").value=edit.phone||"";$("deposit").value=edit.deposit||0}
  }
  $("modalBackdrop").classList.add("show"); $("category").focus(); updatePreview();
}
$("closeModal").onclick=()=>$("modalBackdrop").classList.remove("show");
$("modalBackdrop").onclick=e=>{if(e.target===$("modalBackdrop"))$("modalBackdrop").classList.remove("show")};
$("amount").oninput=updatePreview;$("deposit").oninput=updatePreview;
function updatePreview(){const a=Number($("amount").value||0),d=Number($("deposit").value||0);$("remainingPreview").textContent=taka(Math.max(0,a-d))}
$("entryForm").onsubmit=e=>{
 e.preventDefault(); const type=$("entryType").value, editId=$("editId").value, amount=Number($("amount").value||0);
 if(!amount||amount<0)return;
 if(["due","debt"].includes(type)){
   const dep=Number($("deposit").value||0); if(dep>amount){toast("জমা মূল টাকার বেশি হতে পারবে না");return}
   const obj={id:editId||id(),type,name:$("personName").value.trim(),designation:$("designation").value.trim(),address:$("address").value.trim(),phone:$("phone").value.trim(),category:$("category").value.trim(),amount,deposit:dep,createdAt:editId?(data.people.find(x=>x.id===editId)?.createdAt||new Date().toISOString()):new Date().toISOString(),timeLabel:editId?(data.people.find(x=>x.id===editId)?.timeLabel||now().label):now().label};
   if(!obj.name||!obj.category){toast("নাম ও ক্যাটাগরি দিন");return}
   if(editId){const i=data.people.findIndex(x=>x.id===editId);data.people[i]=obj}else{data.people.push(obj);linkPrimary(type,amount,obj)}
 }else{
   const obj={id:editId||id(),type,category:$("category").value.trim(),amount,note:$("note").value.trim(),createdAt:editId?(data.transactions.find(x=>x.id===editId)?.createdAt||new Date().toISOString()):new Date().toISOString(),timeLabel:editId?(data.transactions.find(x=>x.id===editId)?.timeLabel||now().label):now().label};
   if(!obj.category){toast("ক্যাটাগরি দিন");return}
   if(editId){const i=data.transactions.findIndex(x=>x.id===editId);data.transactions[i]=obj}else data.transactions.push(obj);
 }
 $("modalBackdrop").classList.remove("show");save();toast("সেভ হয়েছে");
};
function linkPrimary(type,amount,p){data.transactions.push({id:id(),type:type==="due"?"income":"expense",category:p.name+" — "+p.category,amount,note:(type==="due"?"পাওনা থেকে আয়":"দেনা থেকে ব্যয়"),createdAt:p.createdAt,timeLabel:p.timeLabel,linkedPersonId:p.id})}
function addPayment(pid){
 const p=data.people.find(x=>x.id===pid); if(!p)return;
 const rem=Number(p.amount)-Number(p.deposit||0); const val=prompt(`বাকি ${taka(rem)}। কত টাকা জমা হয়েছে?`,"");
 if(val===null)return; const n=Number(val); if(!n||n<0||n>rem){toast("সঠিক জমার পরিমাণ দিন");return}
 p.deposit=Number(p.deposit||0)+n; save(); toast(n===rem?"সম্পূর্ণ পরিশোধিত":"জমা যোগ হয়েছে");
}
function editPerson(pid){const p=data.people.find(x=>x.id===pid);if(p)openModal(p.type,p)}
function deletePerson(pid){if(!confirm("এই দেনা/পাওনার রেকর্ড মুছবেন? মূল আয়/ব্যয়ের history মুছবে না।"))return;data.people=data.people.filter(x=>x.id!==pid);save();toast("রেকর্ড মুছে গেছে; মূল transaction রাখা হয়েছে")}
function deleteTx(tid){if(!confirm("এই transaction মুছবেন?"))return;data.transactions=data.transactions.filter(x=>x.id!==tid);save();toast("Transaction মুছে গেছে")}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
$("addIncomeBtn").onclick=()=>openModal("income");$("addExpenseBtn").onclick=()=>openModal("expense");$("addDueBtn").onclick=()=>openModal("due");$("addDebtBtn").onclick=()=>openModal("debt");
$("seeAll").onclick=()=>showPage("income");
$("profileBtn").onclick=()=>{const n=prompt("তোমার নাম লিখুন:",$("userName").textContent);if(n&&n.trim()){$("userName").textContent=n.trim();localStorage.setItem("cashBoi_name",n.trim())}};
const savedName=localStorage.getItem("cashBoi_name");if(savedName)$("userName").textContent=savedName;
renderAll();