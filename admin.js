const API = "https://script.google.com/macros/s/AKfycbylf9SdrybqNMjSbukTl2V6oFb2sE5Rdqh9l8tH8hpUDpsisUkXqi5S5f_yVj2pJxVG/exec";
const waIcon = "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg";

const qs = id => document.getElementById(id);
let allClients=[], clientTransactions=[], currentClientId="", currentTransId=null;

// مودالات
function openModal(id){ qs(id).style.display="flex"; }
function closeModal(id){ qs(id).style.display="none"; }
window.onclick = e=>{ if(e.target.classList.contains("modal")) e.target.style.display="none"; }

// تسجيل خروج
function logout(){ localStorage.clear(); window.location.href="index.html"; }
// تحميلالاجماليات
async function loadGlobalSummary(){

    const res = await fetch(API,{
        method:"POST",
        body:JSON.stringify({
            action:"getClientsBalance"
        })
    });

    const data = await res.json();

    if(!Array.isArray(data)) return;

    let totalCredit = 0; // لكم
    let totalDebit = 0;  // عليكم

    data.forEach(c => {

        if(Number(c.total) >= 0){
            totalDebit += Number(c.total);
        }else{
            totalCredit += Math.abs(Number(c.total));
        }

    });

    const balance = totalDebit - totalCredit;

    const creditEl = document.getElementById("totalCredit");
    const debitEl = document.getElementById("totalDebit");
    const balanceEl = document.getElementById("netBalance");

    if(creditEl)
        creditEl.textContent = totalCredit.toLocaleString() + " ر.ي";

    if(debitEl)
        debitEl.textContent = totalDebit.toLocaleString() + " ر.ي";

    if(balanceEl)
        balanceEl.textContent =
            balance >= 0
            ? `لكم ${balance.toLocaleString()} ر.ي`
            : `عليكم ${Math.abs(balance).toLocaleString()} ر.ي`;

}
// تحميل العملاء
async function loadClients(){
    qs("loading").textContent="جاري تحميل العملاء...";
    const res=await fetch(API,{method:"POST",body:JSON.stringify({action:"getClients"})});
    const data=await res.json();
    allClients=data;
    const select=qs("client_select"); select.innerHTML=`<option value="">اختر العميل</option>`;
    data.forEach(c=>{
        const op=document.createElement("option");
        op.value=c.client_id; op.textContent=`${c.name} (${c.mobile})`;
        select.appendChild(op);
    });
    qs("loading").textContent="";
    updateStats();
}

// بحث العملاء
function filterClientSelect(){
    const q=qs("client_search").value.toLowerCase();
    Array.from(qs("client_select").options).forEach(op=>{
        if(op.value==="") return;
        op.style.display=op.textContent.toLowerCase().includes(q)?"":"none";
    });
}

// إضافة عميل
async function addClient(){
    const name = qs("new_name").value.trim();
    const mobile = qs("new_mobile").value.trim();
    const mobile_sms = qs("new_mobile_sms").value.trim();
    const username = qs("new_username").value.trim();
    const password = qs("new_password").value.trim();
    const msg = qs("clientMsg");

    if(!name || !mobile || !mobile_sms || !username || !password){
        msg.textContent = "يرجى تعبئة كل الحقول";
        msg.style.color = "red";
        return;
    }

    try {
        const res = await fetch(API, {
            method: "POST",
            body: JSON.stringify({
                action: "addClient",
                name,
                mobile,
                mobile_sms,
                username,
                password
            })
        });

        const data = await res.json();

        if(data.status === "success"){
            msg.textContent = "تمت إضافة العميل بنجاح";
            msg.style.color = "green";

            // تنظيف الحقول
            qs("new_name").value = "";
            qs("new_mobile").value = "";
            qs("new_mobile_sms").value = "";
            qs("new_username").value = "";
            qs("new_password").value = "";

            await loadClients();
            await loadGlobalSummary();

            setTimeout(() => {
                closeModal("addClientModal");
                msg.textContent = "";
            }, 800);

        } else {
            msg.textContent = data.message || "حدث خطأ أثناء الإضافة";
            msg.style.color = "red";
        }

    } catch(error) {
        console.error(error);
        msg.textContent = "تعذر الاتصال بالخادم";
        msg.style.color = "red";
    }
}

// إضافة عملية مالية
async function addTrans(){
    const client_id=qs("client_select").value;
    let amount=Number(qs("amount").value);
    const type=qs("type").value; const note=qs("note").value;
    const msg=qs("msg"); if(!client_id||!amount||!note){ msg.textContent="يرجى تعبئة كل الحقول"; msg.style.color="red"; return;}
    amount=type==="credit"?-Math.abs(amount):Math.abs(amount);
    const res=await fetch(API,{method:"POST",body:JSON.stringify({action:"addTransaction",client_id,amount,type,note})});
    const data=await res.json();
    if(data.status==="success"){ msg.textContent="تمت الإضافة بنجاح"; msg.style.color="green"; qs("amount").value=""; qs("note").value=""; loadTransactions();
loadGlobalSummary(); setTimeout(()=>msg.textContent="",2000);}
    else{ msg.textContent="حدث خطأ أثناء الإضافة"; msg.style.color="red";}
}

// تحميل العمليات
async function loadTransactions(){
    currentClientId=qs("client_select").value; if(!currentClientId) return;
    qs("loading").textContent="جاري تحميل العمليات...";
    const res=await fetch(API,{method:"POST",body:JSON.stringify({action:"getClientData",client_id:currentClientId})});
    const data=await res.json();
    qs("loading").textContent=""; if(data.status!=="success") return;
    clientTransactions=data.list.sort((a,b)=>new Date(b.date)-new Date(a.date));
    const total=data.total;
    const client=allClients.find(c=>c.client_id==currentClientId)||{};
    qs("total_info").textContent= total>=0?`إجمالي الرصيد: عليه ${total} ريال`:`إجمالي الرصيد: له ${Math.abs(total)} ريال`;
    updateStats();
    renderTransactions(clientTransactions.slice(0,3));
}

// عرض كل العمليات
function showAllTransactions(){ renderTransactions(clientTransactions); }

// جدول العمليات
function renderTransactions(transactions){
    const table = qs("transTable");
    table.innerHTML = "";

    // رؤوس الأعمدة الجديدة بدون ID واسم العميل
    const header = ["المبلغ","النوع","البيان","التاريخ","واتساب"];
    const trH = document.createElement("tr");
    header.forEach(h => {
        const th = document.createElement("th");
        th.textContent = h;
        trH.appendChild(th);
    });
    table.appendChild(trH);

    const client = allClients.find(c => c.client_id == currentClientId) || {};
    const clientName = client.name || "";
    const clientMobile = client.mobile || "";
    const clientSmsMobile = client.mobile_sms || "";
    
    transactions.forEach(t => {
    const row = table.insertRow();
    row.onclick = () => openTransModal(t.trans_id);

    // خلايا الجدول بدون ID واسم العميل
    const cells = [
        Math.abs(t.amount),
        t.type === "debit" ? "عليه" : "له",
        t.note,
        new Date(t.date).toLocaleDateString()
    ];

    cells.forEach((c, i) => {
        const td = row.insertCell();
        td.textContent = c;
        if (i === 0) td.className = t.type === "debit" ? "debit" : "credit"; // تلوين المبلغ
    });

    // زرواتساب وSMS
const waSmsCell = row.insertCell();
const groupDiv = document.createElement("div");
groupDiv.className = "wa-sms-group";

// زر واتساب
const waBtn = document.createElement("button");
waBtn.className = "wa-btn";
waBtn.innerHTML = `<img src="${waIcon}"> واتساب`;
waBtn.onclick = e => {
    e.stopPropagation();

    const sorted = [...clientTransactions]
        .sort((a,b) => new Date(a.date) - new Date(b.date));

    const index = sorted.findIndex(x => x.trans_id == t.trans_id);

    let balanceUntil = 0;

    for(let i = 0; i <= index; i++){
        balanceUntil += Number(sorted[i].amount);
    }

    const typeText = t.type === "debit" ? "عليك" : "لك";
    const totalText =
        balanceUntil >= 0
        ? "عليك " + balanceUntil
        : "لك " + Math.abs(balanceUntil);

    const msg = `👤 *الاخ:* ${clientName}
💰 *قيد ${typeText} مبلغ:* ${Math.abs(t.amount)} ريال
📝 *البيان:* ${t.note}
---------------
📊 *رصيدك بعد هذه العملية:*
       ${totalText} ريال`;

    const url = `https://wa.me/${clientMobile}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
};
groupDiv.appendChild(waBtn);

// زر SMS
const smsBtn = document.createElement("button");
smsBtn.className = "sms-btn";
smsBtn.textContent = "SMS";

smsBtn.onclick = e => {
    e.stopPropagation();

    // استخدام رقم mobile_sms الخاص بالعميل
    const smsNumber = client.mobile_sms || "";

    if (!smsNumber) {
        alert("لا يوجد رقم SMS مسجل لهذا العميل");
        return;
    }

    const sorted = [...clientTransactions]
        .sort((a,b) => new Date(a.date) - new Date(b.date));

    const index = sorted.findIndex(x => x.trans_id == t.trans_id);

    let balanceUntil = 0;

    for(let i = 0; i <= index; i++){
        balanceUntil += Number(sorted[i].amount);
    }

    const totalText =
        balanceUntil >= 0
        ? "عليك " + balanceUntil
        : "لك " + Math.abs(balanceUntil);

    const typeText = t.type === "debit" ? "عليك" : "لك";

    const msg =
`الاخ: ${clientName}
قيد ${typeText}: ${Math.abs(t.amount)}
الاجمالي: ${totalText}
`;

    const url = `sms:${smsNumber}?body=${encodeURIComponent(msg)}`;

    window.open(url, "_blank");
};

groupDiv.appendChild(smsBtn);

waSmsCell.appendChild(groupDiv);

});
}

// تعديل وحذف العملية
function openTransModal(id){ currentTransId=id; const t=clientTransactions.find(x=>x.trans_id==id); if(!t) return; qs("modal_amount").value=Math.abs(t.amount); qs("modal_type").value=t.type; qs("modal_note").value=t.note; openModal("transModal"); }
async function saveTransModal(){ if(!currentTransId) return; let amount=Number(qs("modal_amount").value); const type=qs("modal_type").value; const note=qs("modal_note").value; amount=type==="credit"?-Math.abs(amount):Math.abs(amount);
    await fetch(API,{method:"POST",body:JSON.stringify({action:"updateTransaction",trans_id:currentTransId,amount,type,note})}); closeModal("transModal");
loadTransactions();
loadGlobalSummary(); }
async function deleteTransModal(){ if(!confirm("هل تريد حذف العملية؟")) return; await fetch(API,{method:"POST",body:JSON.stringify({action:"deleteTransaction",trans_id:currentTransId})}); closeModal("transModal");
loadTransactions();
loadGlobalSummary(); }

// طباعة PDF مع اسم العميل وصافي الحساب
function printTransactions() {
    if (!clientTransactions.length) return alert("لا توجد عمليات للطباعة");

    const client = allClients.find(c => c.client_id == currentClientId) || {};
    const clientName = client.name || "";
    const total = clientTransactions.reduce((s, x) => s + Number(x.amount), 0);

    // بيانات الشركة
    const companyName = "شركة يمن ستلايت";
    const companyPhone = "738092209"; // ضع رقم الهاتف أو البريد إذا أردت
    const logoUrl = "https://raw.githubusercontent.com/falahsab/daftar/refs/heads/main/img/%D8%AF%D9%81%D8%AA%D8%B1-%D9%8A%D9%85%D9%86-%D8%B3%D8%AA%D9%84%D8%A7%D9%8A%D8%AA-192.png"; // ضع رابط شعار الشركة إذا أردت
    const today = new Date().toLocaleDateString('ar-EG');
        const html = `
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${clientName} | ${today}</title>
        <style>
            body { font-family: "Tajawal", sans-serif; direction: rtl; margin:20px; color:#0F172A; }
            header { display:flex; justify-content: space-between; align-items:center; border-bottom: 2px solid #00693B; padding-bottom:10px; margin-bottom:20px; }
            header img { height:60px; }
            header .client-info { text-align: center; flex:1; }
            header .client-info h2 { margin:0; color:#00693B; font-size:1.3em; }
            header .client-info p { margin:0; font-size:0.95em; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #444; padding: 10px; text-align: center; }
            th { background: #00A651; color: white; }
            tbody tr:nth-child(even) { background-color: #f2f2f2; }
            .debit { color: red; font-weight: bold; }
            .credit { color: green; font-weight: bold; }
            tfoot td { font-weight: bold; font-size: 1.05em; }
            footer { margin-top: 40px; text-align: left; font-weight: bold; font-size:0.9em; }
            @media print {
                body { margin: 0; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
                footer { position: fixed; bottom: 0px; left: 20px; }
            }
        </style>
    </head>
    <body>
        <header>
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo">` : '<div style="width:60px;"></div>'}
            <div class="client-info">
                <h2>تقرير عمليات العميل</h2>
                <p>اسم العميل: ${clientName}</p>
            </div>
            <div style="width:60px;"></div>
        </header>

        <table>
<thead>
    <tr>
        <th>المبلغ</th>
        <th>النوع</th>
        <th>البيان</th>
        <th>التاريخ</th>
        <th>الرصيد</th>
    </tr>
</thead>
<tbody>
${(() => {

    const sorted = [...clientTransactions]
        .sort((a,b) => new Date(a.date) - new Date(b.date));

    let balance = 0;

    const balances = {};

    sorted.forEach(t => {
        balance += Number(t.amount);
        balances[t.trans_id] = balance;
    });

    return clientTransactions.map(t => {

        const date = new Date(t.date);
        const formattedDate =
            `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;

        const bal = balances[t.trans_id];

        return `
        <tr>
            <td class="${t.type === "debit" ? "debit" : "credit"}">
                ${Math.abs(t.amount)}
            </td>

            <td>
                ${t.type === "debit" ? "عليه" : "له"}
            </td>

            <td>${t.note}</td>

            <td>${formattedDate}</td>

            <td class="${bal >= 0 ? 'debit' : 'credit'}">
                ${bal >= 0
                    ? `عليه ${bal}`
                    : `له ${Math.abs(bal)}`}
            </td>
        </tr>
        `;
    }).join('');

})()}
</tbody>
            <tfoot>
                <tr>
                    <td colspan="2" style="text-align: right;">صافي الحساب</td>
                    <td colspan="3" style="color:${total >= 0 ? 'red' : 'green'};">
                        ${total >= 0 ? `عليه ${total}` : `له ${Math.abs(total)}`}
                    </td>
                </tr>
            </tfoot>
        </table>

        <footer>${companyName} | ${companyPhone}</footer>
    </body>
    </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
}


// عرض العملاء وصافي الحساب
async function showClientsBalances(){
    const res = await fetch(API, { method: "POST", body: JSON.stringify({ action: "getClientsBalance" }) });
    const data = await res.json(); 
    if(!Array.isArray(data)) return alert("خطأ في البيانات");

    data.sort((a,b) => b.total - a.total);

    // حساب الإجماليات
    let totalDebit = 0;   // عليه
    let totalCredit = 0;  // له

    data.forEach(c=>{
        if(c.total >= 0) totalDebit += c.total;
        else totalCredit += Math.abs(c.total);
    });

    const diff = totalDebit - totalCredit;

    // عرض الإجماليات
    const totalsDiv = document.getElementById("clientsTotals");
    if(totalsDiv){
        totalsDiv.innerHTML = `
            <div><strong>إجمالي لك:</strong> ${totalDebit} ريال</div>
            <div><strong>إجمالي عليك:</strong> ${totalCredit} ريال</div>
            <div><strong>الفرق:</strong> 
                ${diff >= 0 ? `لك ${diff}` : `عليك ${Math.abs(diff)}`}
            </div>
        `;
    }

    const tbody = document.querySelector("#clientsBalanceTable tbody"); 
    tbody.innerHTML = "";

    data.forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${c.client_id}</td>
            <td>${c.name}</td>
            <td>${c.mobile}</td>
            <td style="font-weight:bold;color:${c.total>=0?'red':'green'}">
                ${c.total>=0?`عليه ${c.total}`:`له ${Math.abs(c.total)}`}
            </td>
            <td>
                <button style="background:#EF4444;color:white;padding:4px 8px;border:none;border-radius:4px;cursor:pointer;">
                    حذف
                </button>
            </td>
        `;
        tbody.appendChild(tr);

        tr.querySelector("button").addEventListener("click", async () => {
            if(confirm(`هل تريد حذف العميل "${c.name}" وكل عملياته؟`)){
                const res = await fetch(API, {
                    method: "POST",
                    body: JSON.stringify({ action: "deleteClient", client_id: c.client_id })
                });
                const data = await res.json();
                if(data.status === "success"){
                    alert("تم حذف العميل وكل عملياته بنجاح");
                    showClientsBalances();
                } else {
                    alert("حدث خطأ أثناء الحذف");
                }
            }
        });
    });

    openModal("clientsModal");
}

function filterClientsTable(){
    const q=qs("search_client").value.toLowerCase();
    document.querySelectorAll("#clientsBalanceTable tbody tr").forEach(r=>{
        const name=r.children[1].textContent.toLowerCase();
        const mobile=r.children[2].textContent.toLowerCase();
        r.style.display=(name.includes(q)||mobile.includes(q))?"":"none";
    });
}

// تحديث الإحصائيات
function updateStats(){
    qs("stat_clients").textContent=`العملاء: ${allClients.length}`;
    if(clientTransactions.length){ qs("stat_last").textContent=""+new Date(clientTransactions[0].date).toLocaleDateString(); }
    else{ qs("stat_last").textContent="لا عمليات"; }
    const sum=clientTransactions.reduce((s,x)=>s+Number(x.amount),0);
    qs("stat_total").textContent=sum>=0?`عليه ${sum}`:`له ${Math.abs(sum)}`;
}

loadClients();
loadGlobalSummary();

qs("client_select").addEventListener("change", loadTransactions);

  // طباعة قائمة العملاء وصافي حساباتهم
function printClientsList() {
    const rows = Array.from(document.querySelectorAll("#clientsBalanceTable tbody tr"))
                      .filter(r => r.style.display !== "none"); // تجاهل الصفوف المخفية

    if (!rows.length) return alert("لا توجد بيانات للطباعة");

    const companyName = "شركة يمن ستلايت";
    const companyPhone = "738092209";
    const logoUrl = ""; // شعار الشركة

    const html = `
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: "Tajawal", sans-serif; direction: rtl; margin:20px; color:#0F172A; }
            header { display:flex; justify-content: space-between; align-items:center; border-bottom: 2px solid #00693B; padding-bottom:10px; margin-bottom:20px; }
            header img { height:60px; }
            header .report-info { text-align: center; flex:1; }
            header .report-info h2 { margin:0; color:#00693B; font-size:1.3em; }
            header .report-info p { margin:0; font-size:0.95em; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #444; padding: 10px; text-align: center; }
            th { background: #00A651; color: white; }
            tbody tr:nth-child(even) { background-color: #f2f2f2; }
            tfoot td { font-weight: bold; font-size: 1.05em; }
            footer { margin-top: 40px; text-align: left; font-weight: bold; font-size:0.9em; }
            @media print {
                body { margin: 0; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
                footer { position: fixed; bottom: 0; left: 20px; }
            }
        </style>
    </head>
    <body>
        <header>
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo">` : '<div style="width:60px;"></div>'}
            <div class="report-info">
                <h2>قائمة العملاء وصافي الحساب</h2>
                <p>عدد العملاء: ${rows.length}</p>
            </div>
            <div style="width:60px;"></div>
        </header>

        <table>
            <thead>
                <tr>
                    <th>العميل</th>
                    <th>الجوال</th>
                    <th>صافي الحساب</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => {
                    const name = r.children[1].textContent;
                    const mobile = r.children[2].textContent;
                    const totalText = r.children[3].textContent.trim(); // مثال: "عليه 500" أو "له 200"
                    
                    // تحديد اللون
                    const color = totalText.startsWith("عليه") ? "red" : "green";

                    return `<tr>
                                <td>${name}</td>
                                <td>${mobile}</td>
                                <td style="color:${color}; font-weight:bold;">${totalText}</td>
                            </tr>`;
                }).join('')}
            </tbody>
        </table>

        <footer>${companyName} | ${companyPhone}</footer>
    </body>
    </html>
    `;

    const win = window.open("", "_blank");
    win.document.title = " "; // لتجنب about:blank
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
}


//جهات الاتصال
function closePopup() {
    document.getElementById("numberPopup").style.display = "none";
}

document.getElementById("pickContact").addEventListener("click", async () => {
    if (!("contacts" in navigator && "select" in navigator.contacts)) {
        alert("المتصفح لا يدعم اختيار جهات الاتصال");
        return;
    }

    const contacts = await navigator.contacts.select(["tel"], { multiple: false });
    if (!contacts.length || !contacts[0].tel.length) return;

    let numbers = contacts[0].tel.map(n => {
        n = n.replace(/\s+/g, "")   // إزالة المسافات
             .replace(/-/g, "")     // إزالة الشرطات
             .replace(/\(/g, "")    // إزالة (
             .replace(/\)/g, "");   // إزالة )
        if (n.startsWith("+967")) n = n.slice(4);
        else if (n.startsWith("00967")) n = n.slice(5);
        else if (n.startsWith("967")) n = n.slice(3);
        n = n.replace(/^0/, "");    // إزالة الصفر البادئ
        return n;
    });

    // إذا رقم واحد فقط
    if (numbers.length === 1) {
        document.getElementById("new_mobile").value = numbers[0];
        return;
    }

    // عرض popup للاختيار
    const listDiv = document.getElementById("numbersList");
    listDiv.innerHTML = "";

    numbers.forEach(num => {
        let btn = document.createElement("button");
        btn.textContent = num;
        btn.style.cssText =
            "display:block;width:100%;margin:5px 0;padding:8px;border:none;background:#28a745;color:white;border-radius:6px;";
        btn.addEventListener("click", () => {
            document.getElementById("new_mobile").value = num; // هنا يلصق الرقم
            closePopup(); // إغلاق البوب أب بعد الاختيار
        });
        listDiv.appendChild(btn);
    });

    document.getElementById("numberPopup").style.display = "block";
});

//حذف عميلوعملياته
async function deleteClient(client_id){
    if(!confirm("هل تريد حذف هذا العميل وجميع عملياته؟")) return;

    // استدعاء API لحذف العميل
    const res = await fetch(API, {
        method: "POST",
        body: JSON.stringify({action: "deleteClient", client_id})
    });
    const data = await res.json();

    if(data.status === "success"){
        alert("تم حذف العميل وكل عملياته بنجاح");
        loadClients();
loadGlobalSummary(); // إعادة تحميل العملاء
    } else {
        alert("حدث خطأ أثناء الحذف");
    }
}
// ازرارله وعليه
function addTransType(type){
    saveNoteSuggestion();
    document.getElementById("type").value = type;

    addTrans();

}
function toggleMenu(){
    document.getElementById("sideMenu").classList.toggle("open");
    document.getElementById("menuOverlay").classList.toggle("show");
}

function closeMenu(){
    document.getElementById("sideMenu").classList.remove("open");
    document.getElementById("menuOverlay").classList.remove("show");
}
//  لصق البيان

async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById("note").value = text;
    } catch (err) {
        alert("تعذر الوصول إلى الحافظة");
    }
}

//  حفظ الادخالات
const noteInput = document.getElementById("note");
const notesList = document.getElementById("notesList");

let savedNotes = JSON.parse(localStorage.getItem("savedNotes") || "[]");

function refreshNotes(){
    notesList.innerHTML = "";

    savedNotes.forEach(note=>{
        const option = document.createElement("option");
        option.value = note;
        notesList.appendChild(option);
    });
}

refreshNotes();

function saveNoteSuggestion(){

    const value = noteInput.value.trim();

    // تجاهل أي قيمة عبارة عن أرقام فقط
    if (/^\d+$/.test(value)) {
        return;
    }

    if(value && !savedNotes.includes(value)){

        savedNotes.unshift(value);
        savedNotes = savedNotes.slice(0,50);

        localStorage.setItem("savedNotes", JSON.stringify(savedNotes));

        refreshNotes();
    }
}
// عرض Mango Users
function showMangoUsers(){

    const tbody = document.getElementById("mangoUsersBody");

    if(!tbody) return;

    tbody.innerHTML = "";

    const clients = [...allClients]
        .filter(c => c.mango_user && String(c.mango_user).trim())
        .sort((a,b) =>
            String(a.name || "").localeCompare(
                String(b.name || ""),
                "ar"
            )
        );

    if(!clients.length){

        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align:center;">
                    لا يوجد Mango User مسجل
                </td>
            </tr>
        `;

    }else{

        clients.forEach(client => {

            const tr = document.createElement("tr");

            const nameTd = document.createElement("td");
            nameTd.textContent = client.name || "";

            const mangoTd = document.createElement("td");
            mangoTd.textContent = client.mango_user || "";
            mangoTd.className = "mango-user-value";

            const actionTd = document.createElement("td");

            const copyBtn = document.createElement("button");
            copyBtn.className = "copy-mango-btn";
            copyBtn.textContent = "📋 نسخ";

            copyBtn.onclick = e => {
                e.stopPropagation();
                copyMangoUser(client.mango_user, copyBtn);
            };

            actionTd.appendChild(copyBtn);

            tr.appendChild(nameTd);
            tr.appendChild(mangoTd);
            tr.appendChild(actionTd);

            tbody.appendChild(tr);
        });
    }

    document.getElementById("mangoSearch").value = "";

    openModal("mangoUsersModal");
}


// نسخ Mango User
async function copyMangoUser(value, button){

    if(!value) return;

    try{

        await navigator.clipboard.writeText(String(value));

        const oldText = button.textContent;

        button.textContent = "✅ تم النسخ";
        button.classList.add("copied");

        setTimeout(() => {
            button.textContent = oldText;
            button.classList.remove("copied");
        }, 1200);

    }catch(error){

        // بديل للمتصفحات التي لا تسمح بـ clipboard
        const textarea = document.createElement("textarea");

        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);

        textarea.select();
        document.execCommand("copy");

        textarea.remove();

        button.textContent = "✅ تم النسخ";

        setTimeout(() => {
            button.textContent = "📋 نسخ";
        }, 1200);
    }
}


// البحث داخل Mango Users
function filterMangoUsers(){

    const q = document
        .getElementById("mangoSearch")
        .value
        .trim()
        .toLowerCase();

    document
        .querySelectorAll("#mangoUsersBody tr")
        .forEach(row => {

            const name = row.children[0]?.textContent.toLowerCase() || "";
            const mango = row.children[1]?.textContent.toLowerCase() || "";

            row.style.display =
                name.includes(q) || mango.includes(q)
                ? ""
                : "none";
        });
}
