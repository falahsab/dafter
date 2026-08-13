const API="https://script.google.com/macros/s/AKfycbyTBztcQHgbaYmtle4dPg0ZWIchR48lnhBZz5Z1fM1qb0RNqYMJSd-ptRcx8u58gaPF/exec";

if(!localStorage.getItem("client_id")){
    alert("يرجى تسجيل الدخول أولاً");
    window.location="index.html";
}

document.getElementById("clientName").innerText=localStorage.getItem("client_name");

loadTotal();

async function loadTotal(){
    let res=await fetch(API,{
        method:"POST",
        body:JSON.stringify({
            action:"getClientData",
            client_id:localStorage.getItem("client_id")
        })
    });
    let data=await res.json();
    let total=Number(data.total);

    const balanceText=document.getElementById("balanceText");
    const balanceValue=document.getElementById("balanceValue");
    const modalBalanceValue=document.getElementById("modalBalanceValue");

    if(total < 0){
        balanceText.innerText="لكم:";
        balanceValue.innerText=Math.abs(total)+" ريال";
        modalBalanceValue.innerText = "لكم: " + Math.abs(total) + " ريال";
        balanceValue.style.color="#0FA958";
        modalBalanceValue.style.color="#0FA958";
    } else {
        balanceText.innerText="عليكم:";
        balanceValue.innerText=total+" ريال";
        modalBalanceValue.innerText = "عليكم: " + total + " ريال";
        balanceValue.style.color="#D13A3A";
        modalBalanceValue.style.color="#D13A3A";
    }

    showLast5(data.list);
}

document.getElementById("refreshBtn").addEventListener("click",loadTotal);

function showLast5(list){
    let box=document.getElementById("lastOpsList");
    box.innerHTML="";
    list.sort((a,b)=>new Date(b.date)-new Date(a.date))
    .slice(0,5)
    .forEach(r=>{
        const typeClass = r.amount < 0 ? "credit" : "debit";
        box.innerHTML+=`
        <div class="op-card">
            <div class="op-details">
                <div class="op-date">${new Date(r.date).toLocaleDateString()}</div>
                <div class="op-note">${r.note}</div>
            </div>
            <div class="op-amount ${typeClass}">
                ${r.amount < 0 ? '+' : '-'}${Math.abs(r.amount)}
            </div>
        </div>`;
    });
    document.getElementById("showStatementBtn").style.display = "block";
}

/* OPEN STATEMENT */
document.getElementById("showStatementBtn").addEventListener("click",async()=>{
    document.getElementById("statementModal").style.display="block";

    let res=await fetch(API,{
        method:"POST",
        body:JSON.stringify({
            action:"getClientData",
            client_id:localStorage.getItem("client_id")
        })
    });

    let data=await res.json();
    const statementList=document.getElementById("statementList");

    // اسم العميل في المودال
    document.getElementById("printClientName").innerText = "اسم العميل: " + (localStorage.getItem("client_name") || "غير معروف");

    function calcTotals(list){
        let totalCredit = 0;
        let totalDebit = 0;
        list.forEach(r => {
            if (r.amount < 0) totalCredit += Math.abs(r.amount);
            else totalDebit += r.amount;
        });

        let net = totalDebit - totalCredit;
        let netText = "";
        let netColor = "";

        if (net < 0) {
            netText = "الصافي: لكم " + Math.abs(net) + " ريال";
            netColor = "#0FA958";
        } else if (net > 0) {
            netText = "الصافي: عليكم " + net + " ريال";
            netColor = "#D13A3A";
        } else {
            netText = "الصافي: لا يوجد (0 ريال)";
            netColor = "#333";
        }

        document.getElementById("totalsBox").innerHTML = `
            <div style="text-align:center;">
                <div>إجمالي لكم: <strong style="color:#0FA958">${totalCredit} ريال</strong></div>
                <div>إجمالي عليكم: <strong style="color:#D13A3A">${totalDebit} ريال</strong></div>
                <div style="
                    margin-top:12px;
                    font-size:18px;
                    font-weight:bold;
                    color:${netColor};
                    padding:8px 0;
                ">
                    ${netText}
                </div>
            </div>
        `;
    }

    function renderOperations(list){
        statementList.innerHTML="";
        list.forEach(r=>{
            const typeClass=r.amount < 0 ? "credit" : "debit";
            statementList.innerHTML+=`
            <div class="op-card">
                <div class="op-details">
                    <div class="op-date">${new Date(r.date).toLocaleDateString()}</div>
                    <div class="op-note">${r.note}</div>
                </div>
                <div class="op-amount ${typeClass}">
                    ${r.amount < 0 ? '+' : '-'}${Math.abs(r.amount)}
                </div>
            </div>`;
        });
    }

    const sorted=data.list.sort((a,b)=>new Date(b.date)-new Date(a.date));
    renderOperations(sorted);
    calcTotals(sorted);

    document.getElementById("fromDate").onchange=filterOps;
    document.getElementById("toDate").onchange=filterOps;

    function filterOps(){
        const from=document.getElementById("fromDate").value;
        const to=document.getElementById("toDate").value;

        const fromDate=from ? new Date(from+"T00:00:00") : null;
        const toDate=to ? new Date(to+"T23:59:59") : null;

        const filtered=data.list.filter(r=>{
            const d=new Date(r.date);
            if(fromDate && d<fromDate) return false;
            if(toDate && d>toDate) return false;
            return true;
        });

        filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));
        renderOperations(filtered);
        calcTotals(filtered);
    }
});

/* PRINT */
document.getElementById("printStatement").addEventListener("click",()=>{
    window.print();
});

/* EXPORT EXCEL */
document.getElementById("exportExcel").addEventListener("click", () => {
    let clientName = document.getElementById("clientName").innerText || "اسم العميل غير معروف";

    let rows = [
        ["اسم العميل:", clientName],
        [],
        ["التاريخ", "البيان", "المبلغ"]
    ];

    document.querySelectorAll("#statementList .op-card").forEach(card => {
        let date = card.querySelector(".op-date").innerText;
        let note = card.querySelector(".op-note").innerText;
        let safeNote = `="${note.replace(/"/g, '""')}"`;
        let amount = `="${card.querySelector(".op-amount").innerText.replace(/'/g, "")}"`;

        rows.push([date, safeNote, amount]);
    });

    let csvContent = "\uFEFF" + rows.map(e => e.join(",")).join("\n");

    let blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "كشف الحساب.csv";
    a.click();
});

/* CLOSE MODAL */
document.getElementById("closeStatement").addEventListener("click",()=>{
    document.getElementById("statementModal").style.display="none";
});

/* LOGOUT */
document.getElementById("logoutBtn").addEventListener("click",()=>{
    localStorage.removeItem("client_id");
    localStorage.removeItem("client_name");
    window.location="index.html";
});

/* TO TOP BUTTON */
const toTop=document.getElementById("toTop");
window.onscroll=()=>{
    if(window.scrollY>300) toTop.style.display="flex";
    else toTop.style.display="none";
};
toTop.onclick=()=>window.scrollTo({top:0,behavior:"smooth"});
