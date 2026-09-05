
const API = "https://script.google.com/macros/s/AKfycbzlIZwRFU_DDybSsctadNxrgwaJtnNyzcgCrlAj9H1l4GoPmSXGLQZ7o5xsG7PpG1-d/exec";

// أيقونة واتساب SVG مدمجة فائقة السرعة
const waSvgIcon = `<svg style="width:15px;height:15px;fill:currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.698c.983.54 1.81.826 2.806.826 3.182 0 5.768-2.587 5.768-5.766-.001-3.187-2.575-5.77-5.768-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.062-2.115-.526-1.815-.752-2.983-2.59-3.074-2.711-.09-.12-1.229-1.636-1.229-3.12 0-1.485.765-2.217 1.036-2.518.271-.301.591-.376.787-.376.196 0 .393.002.564.01.181.01.425-.069.664.506.248.595.845 2.062.919 2.213.074.151.123.327.024.524-.098.197-.148.32-.294.493-.146.173-.308.386-.44.518-.146.146-.299.306-.129.598.17.292.755 1.246 1.62 2.015 1.111.989 2.049 1.296 2.341 1.442.292.146.463.123.634-.073.171-.196.732-.853.928-1.146.196-.293.391-.244.659-.146.268.098 1.708.805 2.001.951.293.146.488.22.561.342.073.122.073.708-.071 1.113z"/></svg>`;

const qs = id => document.getElementById(id);
let allClients = [], clientTransactions = [], currentClientId = "", currentTransId = null;
let currentClientModalMode = 'new'; // 'new' أو 'edit'

// نظام الإشعارات Toast
function showToast(message, type = "success") {
    const container = qs("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'}</span> <span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// فتح وإغلاق النوافذ
function openModal(id) { qs(id).style.display = "flex"; }
function closeModal(id) { qs(id).style.display = "none"; }
window.onclick = e => { if (e.target.classList.contains("modal")) e.target.style.display = "none"; }

// تسجيل الخروج
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
}

// القائمة الجانبية
function toggleMenu() {
    qs("sideMenu").classList.toggle("open");
    qs("menuOverlay").classList.toggle("show");
}
function closeMenu() {
    qs("sideMenu").classList.remove("open");
    qs("menuOverlay").classList.remove("show");
}

// تحميل الإجماليات المالية الكلية
async function loadGlobalSummary() {
    try {
        const res = await fetch(API, {
            method: "POST",
            body: JSON.stringify({ action: "getClientsBalance" })
        });
        const data = await res.json();
        if (!Array.isArray(data)) return;

        let totalCredit = 0; // لكم
        let totalDebit = 0;  // عليكم

        data.forEach(c => {
            const val = Number(c.total) || 0;
            if (val >= 0) totalDebit += val;
            else totalCredit += Math.abs(val);
        });

        const balance = totalDebit - totalCredit;

        qs("totalCredit").textContent = totalCredit.toLocaleString() + " ر.ي";
        qs("totalDebit").textContent = totalDebit.toLocaleString() + " ر.ي";
        qs("netBalance").textContent = balance >= 0
            ? `لكم ${balance.toLocaleString()} ر.ي`
            : `عليكم ${Math.abs(balance).toLocaleString()} ر.ي`;
    } catch (e) {
        console.error("خطأ في تحميل الإجماليات:", e);
    }
}

// تحميل قائمة العملاء
async function loadClients() {
    qs("loading").style.display = "block";
    try {
        const res = await fetch(API, { method: "POST", body: JSON.stringify({ action: "getClients" }) });
        const data = await res.json();
        allClients = Array.isArray(data) ? data : [];

        const select = qs("client_select");
        const prevSelected = select.value;
        select.innerHTML = `<option value="">-- اختر العميل --</option>`;

        const frag = document.createDocumentFragment();
        allClients.forEach(c => {
            const op = document.createElement("option");
            op.value = c.client_id;
            op.textContent = `${c.name} (${c.mobile || '-'})`;
            frag.appendChild(op);
        });
        select.appendChild(frag);

        if (prevSelected) select.value = prevSelected;
        toggleEditSelectedBtn();
        updateStats();
    } catch (e) {
        showToast("فشل تحميل قائمة العملاء", "error");
    } finally {
        qs("loading").style.display = "none";
    }
}

// إظهار زر التعديل المباشر عند تحديد عميل
function toggleEditSelectedBtn() {
    const hasClient = !!qs("client_select").value;
    qs("editCurrentClientBtn").style.display = hasClient ? "flex" : "none";
}

function editCurrentlySelectedClient() {
    const clientId = qs("client_select").value;
    if (clientId) {
        openEditClientModal(clientId);
    }
}

// بحث سريع في القائمة المنسدلة للعملاء
function filterClientSelect() {
    const q = qs("client_search").value.trim().toLowerCase();
    const select = qs("client_select");
    let foundFirst = false;

    Array.from(select.options).forEach((op, index) => {
        if (index === 0) return;
        const match = op.textContent.toLowerCase().includes(q);
        op.style.display = match ? "" : "none";
        if (match && !foundFirst && q !== "") {
            select.value = op.value;
            foundFirst = true;
        }
    });

    toggleEditSelectedBtn();
    if (foundFirst) loadTransactions();
}

// -------------------------------------------------------------
// إدارة نافذة العميل (إضافة جديد / تعديل حالي)
// -------------------------------------------------------------
function openNewClientModal() {
    setClientModalMode('new');
    openModal('addClientModal');
}

function openEditClientModal(clientId) {
    setClientModalMode('edit', clientId);
    openModal('addClientModal');
}

function setClientModalMode(mode, clientId = null) {
    currentClientModalMode = mode;
    const isEdit = (mode === 'edit');

    qs("selectClientToEditBox").style.display = isEdit ? "block" : "none";
    qs("clientModalTitle").textContent = isEdit ? "✏️ تعديل بيانات العميل" : "➕ إضافة عميل جديد";
    qs("saveClientBtn").textContent = isEdit ? "حفظ التعديلات" : "إضافة العميل";

    if (isEdit) {
        qs("tabEditClient").classList.add("active");
        qs("tabNewClient").classList.remove("active");
    } else {
        qs("tabNewClient").classList.add("active");
        qs("tabEditClient").classList.remove("active");
        clearClientForm();
    }

    // تعبئة القائمة المنسدلة للعملاء داخل المودال
    const modalSelect = qs("modal_client_select");
    modalSelect.innerHTML = `<option value="">-- اختر عميلاً للتعديل --</option>`;
    allClients.forEach(c => {
        const op = document.createElement("option");
        op.value = c.client_id;
        op.textContent = `${c.name} (${c.mobile || '-'})`;
        modalSelect.appendChild(op);
    });

    if (clientId) {
        modalSelect.value = clientId;
        onSelectClientToEdit();
    }
}

function clearClientForm() {
    qs("edit_client_id").value = "";
    qs("new_name").value = "";
    qs("new_mobile").value = "";
    qs("new_mobile_sms").value = "";
    qs("new_username").value = "";
    qs("new_password").value = "";
}

function onSelectClientToEdit() {
    const clientId = qs("modal_client_select").value;
    if (!clientId) {
        clearClientForm();
        return;
    }

    const client = allClients.find(c => c.client_id == clientId);
    if (!client) return;

    qs("edit_client_id").value = client.client_id;
    qs("new_name").value = client.name || "";
    qs("new_mobile").value = client.mobile || "";
    qs("new_mobile_sms").value = client.mobile_sms || "";
    qs("new_username").value = client.username || "";
    qs("new_password").value = client.password || "";
}

// حفظ العميل (إضافة أو تعديل تلقائياً)
async function saveClientData() {
    const clientId = qs("edit_client_id").value;
    const name = qs("new_name").value.trim();
    const mobile = qs("new_mobile").value.trim();
    const mobile_sms = qs("new_mobile_sms").value.trim();
    const username = qs("new_username").value.trim();
    const password = qs("new_password").value.trim();
    const btn = qs("saveClientBtn");

    if (!name || !mobile || !username || !password) {
        showToast("يرجى تعبئة كافة الحقول الأساسية", "error");
        return;
    }

    const isEdit = (currentClientModalMode === 'edit' && clientId);
    const action = isEdit ? "updateClient" : "addClient";

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = "جاري الحفظ...";

    const payload = {
        action: action,
        name,
        mobile,
        mobile_sms,
        username,
        password
    };

    if (isEdit) {
        payload.client_id = clientId;
    }

    try {
        const res = await fetch(API, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.status === "success") {
            showToast(isEdit ? "تم تحديث بيانات العميل بنجاح" : "تمت إضافة العميل بنجاح");
            closeModal("addClientModal");
            clearClientForm();
            await Promise.all([loadClients(), loadGlobalSummary()]);
        } else {
            showToast(data.message || "حدث خطأ أثناء حفظ البيانات", "error");
        }
    } catch (err) {
        showToast("تعذر الاتصال بالخادم", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// -------------------------------------------------------------
// العمليات المالية
// -------------------------------------------------------------
async function addTrans() {
    const client_id = qs("client_select").value;
    let amount = Number(qs("amount").value);
    const type = qs("type").value;
    const note = qs("note").value.trim();

    if (!client_id) { showToast("يرجى اختيار العميل أولاً", "error"); return; }
    if (!amount || isNaN(amount) || amount <= 0) { showToast("يرجى إدخال مبلغ صحيح", "error"); return; }
    if (!note) { showToast("يرجى كتابة البيان", "error"); return; }

    amount = type === "credit" ? -Math.abs(amount) : Math.abs(amount);
    qs("loading").style.display = "block";

    try {
        const res = await fetch(API, {
            method: "POST",
            body: JSON.stringify({ action: "addTransaction", client_id, amount, type, note })
        });
        const data = await res.json();

        if (data.status === "success") {
            showToast("تم تسجيل العملية بنجاح");
            qs("amount").value = "";
            qs("note").value = "";
            await Promise.all([loadTransactions(), loadGlobalSummary()]);
        } else {
            showToast("حدث خطأ أثناء إضافة العملية", "error");
        }
    } catch (e) {
        showToast("تعذر الاتصال بالخادم", "error");
    } finally {
        qs("loading").style.display = "none";
    }
}

function addTransType(type) {
    saveNoteSuggestion();
    qs("type").value = type;
    addTrans();
}

// تحميل وعرض العمليات
async function loadTransactions() {
    currentClientId = qs("client_select").value;
    toggleEditSelectedBtn();

    if (!currentClientId) {
        qs("transBody").innerHTML = `<tr><td colspan="5" style="color:var(--text-muted);padding:20px;">اختر عميلاً لعرض عملياته</td></tr>`;
        return;
    }

    qs("loading").style.display = "block";
    try {
        const res = await fetch(API, { method: "POST", body: JSON.stringify({ action: "getClientData", client_id: currentClientId }) });
        const data = await res.json();

        if (data.status !== "success") return;

        clientTransactions = (data.list || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        updateStats(data.total);
        renderTransactions(clientTransactions.slice(0, 5));
    } catch (e) {
        showToast("فشل تحميل عمليات العميل", "error");
    } finally {
        qs("loading").style.display = "none";
    }
}

function showAllTransactions() {
    if (!clientTransactions.length) {
        showToast("لا توجد عمليات لعرضها", "error");
        return;
    }
    renderTransactions(clientTransactions);
}

// رسم جدول العمليات بطريقة فائقة السرعة
function renderTransactions(transactions) {
    const tbody = qs("transBody");
    tbody.innerHTML = "";

    if (!transactions.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:var(--text-muted);padding:20px;">لا توجد عمليات مسجلة لهذا العميل</td></tr>`;
        return;
    }

    const client = allClients.find(c => c.client_id == currentClientId) || {};
    const clientName = client.name || "";
    const clientMobile = client.mobile || "";
    const clientSms = client.mobile_sms || "";

    const frag = document.createDocumentFragment();

    transactions.forEach(t => {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.onclick = () => openTransModal(t.trans_id);

        const isDebit = t.type === "debit";
        const dateStr = new Date(t.date).toLocaleDateString('ar-EG');

        tr.innerHTML = `
            <td class="${isDebit ? 'debit-text' : 'credit-text'}">${Math.abs(t.amount).toLocaleString()}</td>
            <td><span class="badge ${isDebit ? 'badge-debit' : 'badge-credit'}">${isDebit ? 'عليه' : 'له'}</span></td>
            <td>${escapeHtml(t.note)}</td>
            <td>${dateStr}</td>
            <td>
                <div class="wa-sms-group">
                    <button class="wa-btn" title="إرسال عبر واتساب">${waSvgIcon} واتساب</button>
                    <button class="sms-btn" title="إرسال عبر SMS">SMS</button>
                </div>
            </td>
        `;

        const waBtn = tr.querySelector(".wa-btn");
        const smsBtn = tr.querySelector(".sms-btn");

        waBtn.onclick = e => {
            e.stopPropagation();
            sendWhatsAppMsg(t, clientName, clientMobile);
        };

        smsBtn.onclick = e => {
            e.stopPropagation();
            sendSmsMsg(t, clientName, clientSms);
        };

        frag.appendChild(tr);
    });

    tbody.appendChild(frag);
}

function sendWhatsAppMsg(t, clientName, clientMobile) {
    const sorted = [...clientTransactions].sort((a,b) => new Date(a.date) - new Date(b.date));
    const index = sorted.findIndex(x => x.trans_id == t.trans_id);
    let balanceUntil = 0;
    for (let i = 0; i <= index; i++) balanceUntil += Number(sorted[i].amount);

    const typeText = t.type === "debit" ? "عليك" : "لك";
    const totalText = balanceUntil >= 0 ? `عليك ${balanceUntil.toLocaleString()}` : `لك ${Math.abs(balanceUntil).toLocaleString()}`;

    const msg = `👤 *الأخ:* ${clientName}\n💰 *قيد ${typeText} مبلغ:* ${Math.abs(t.amount).toLocaleString()} ريال\n📝 *البيان:* ${t.note}\n---------------\n📊 *رصيدك بعد هذه العملية:*\n       ${totalText} ريال`;
    window.open(`https://wa.me/${clientMobile}?text=${encodeURIComponent(msg)}`, "_blank");
}

function sendSmsMsg(t, clientName, smsNumber) {
    if (!smsNumber) {
        showToast("لا يوجد رقم SMS مسجل لهذا العميل", "error");
        return;
    }
    const sorted = [...clientTransactions].sort((a,b) => new Date(a.date) - new Date(b.date));
    const index = sorted.findIndex(x => x.trans_id == t.trans_id);
    let balanceUntil = 0;
    for (let i = 0; i <= index; i++) balanceUntil += Number(sorted[i].amount);

    const typeText = t.type === "debit" ? "عليك" : "لك";
    const totalText = balanceUntil >= 0 ? `عليك ${balanceUntil.toLocaleString()}` : `لك ${Math.abs(balanceUntil).toLocaleString()}`;

    const msg = `الأخ: ${clientName}\nقيد ${typeText}: ${Math.abs(t.amount)}\nالإجمالي: ${totalText}`;
    window.open(`sms:${smsNumber}?body=${encodeURIComponent(msg)}`, "_blank");
}

// تعديل وحذف العملية المالية
function openTransModal(id) {
    currentTransId = id;
    const t = clientTransactions.find(x => x.trans_id == id);
    if (!t) return;
    qs("modal_amount").value = Math.abs(t.amount);
    qs("modal_type").value = t.type;
    qs("modal_note").value = t.note;
    openModal("transModal");
}

async function saveTransModal() {
    if (!currentTransId) return;
    let amount = Number(qs("modal_amount").value);
    const type = qs("modal_type").value;
    const note = qs("modal_note").value;
    amount = type === "credit" ? -Math.abs(amount) : Math.abs(amount);

    try {
        await fetch(API, { method: "POST", body: JSON.stringify({ action: "updateTransaction", trans_id: currentTransId, amount, type, note }) });
        closeModal("transModal");
        showToast("تم تحديث العملية بنجاح");
        await Promise.all([loadTransactions(), loadGlobalSummary()]);
    } catch (e) {
        showToast("فشل تحديث العملية", "error");
    }
}

async function deleteTransModal() {
    if (!confirm("هل أنت متأكد من حذف هذه العملية؟")) return;
    try {
        await fetch(API, { method: "POST", body: JSON.stringify({ action: "deleteTransaction", trans_id: currentTransId }) });
        closeModal("transModal");
        showToast("تم حذف العملية");
        await Promise.all([loadTransactions(), loadGlobalSummary()]);
    } catch (e) {
        showToast("فشل حذف العملية", "error");
    }
}

// طباعة كشف حساب عميل
function printTransactions() {
    if (!clientTransactions.length) {
        showToast("لا توجد عمليات لطباعتها", "error");
        return;
    }

    const client = allClients.find(c => c.client_id == currentClientId) || {};
    const clientName = client.name || "عميل غير محدد";
    const total = clientTransactions.reduce((s, x) => s + Number(x.amount), 0);
    const today = new Date().toLocaleDateString('ar-EG');

    const sorted = [...clientTransactions].sort((a,b) => new Date(a.date) - new Date(b.date));
    let runBalance = 0;
    const balances = {};
    sorted.forEach(t => {
        runBalance += Number(t.amount);
        balances[t.trans_id] = runBalance;
    });

    const rowsHtml = clientTransactions.map(t => {
        const bal = balances[t.trans_id];
        const isDebit = t.type === "debit";
        const date = new Date(t.date).toLocaleDateString('ar-EG');
        return `
            <tr>
                <td style="color:${isDebit ? '#dc2626' : '#16a34a'}; font-weight:bold;">${Math.abs(t.amount).toLocaleString()}</td>
                <td>${isDebit ? 'عليه' : 'له'}</td>
                <td>${t.note}</td>
                <td>${date}</td>
                <td style="color:${bal >= 0 ? '#dc2626' : '#16a34a'}; font-weight:bold;">${bal >= 0 ? `عليه ${bal.toLocaleString()}` : `له ${Math.abs(bal).toLocaleString()}`}</td>
            </tr>
        `;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${clientName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800&display=swap" rel="stylesheet">
        <style>
            body { font-family: "Tajawal", sans-serif; margin: 20px; color: #0f172a; direction: rtl; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #047857; padding-bottom: 12px; margin-bottom: 20px; }
            .company h2 { margin: 0; color: #047857; font-size: 1.4rem; }
            .company p { margin: 2px 0 0; color: #64748b; font-size: 0.85rem; }
            .client-card { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.95rem; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; }
            th { background: #047857; color: white; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; border-top: 1px dashed #94a3b8; padding-top: 15px; font-size: 0.85rem; color: #64748b; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company">
                <h2>شركة يمن ستلايت</h2>
                <p>هاتف: 738092209</p>
            </div>
            <div style="text-align: left;">
                <h3>كشف حساب مالي</h3>
                <p style="font-size:0.85rem; color:#64748b;">تاريخ التقرير: ${today}</p>
            </div>
        </div>

        <div class="client-card">
            <strong>اسم العميل:</strong> ${clientName} | <strong>رقم الهاتف:</strong> ${client.mobile || '-'}
        </div>

        <table>
            <thead>
                <tr>
                    <th>المبلغ</th>
                    <th>النوع</th>
                    <th>البيان</th>
                    <th>التاريخ</th>
                    <th>الرصيد بعد العملية</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
                <tr style="background:#f1f5f9; font-weight:bold;">
                    <td colspan="2" style="text-align:right;">الرصيد الصافي النهائي:</td>
                    <td colspan="3" style="color:${total >= 0 ? '#dc2626' : '#16a34a'}; font-size:1.1rem;">
                        ${total >= 0 ? `عليه ${total.toLocaleString()} ريال` : `له ${Math.abs(total).toLocaleString()} ريال`}
                    </td>
                </tr>
            </tfoot>
        </table>

        <div class="footer">
            <span>تم الاستخراج بواسطة نظام يمن ستلايت</span>
            <span>توقيع المحاسب: ..........................</span>
        </div>
    </body>
    </html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 350);
}

// عرض نافذة حسابات وأرصدة العملاء (مع زر التعديل المباشر)
async function showClientsBalances() {
    try {
        const res = await fetch(API, { method: "POST", body: JSON.stringify({ action: "getClientsBalance" }) });
        const data = await res.json();
        if (!Array.isArray(data)) return showToast("بيانات العملاء غير صحيحة", "error");

        data.sort((a, b) => b.total - a.total);

        let totalDebit = 0, totalCredit = 0;
        const tbody = qs("clientsBalanceBody");
        tbody.innerHTML = "";
        const frag = document.createDocumentFragment();

        data.forEach(c => {
            const tot = Number(c.total) || 0;
            if (tot >= 0) totalDebit += tot;
            else totalCredit += Math.abs(tot);

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${c.client_id}</td>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>${escapeHtml(c.mobile || '-')}</td>
                <td style="font-weight:bold; color:${tot >= 0 ? '#dc2626' : '#16a34a'}">
                    ${tot >= 0 ? `عليه ${tot.toLocaleString()}` : `له ${Math.abs(tot).toLocaleString()}`}
                </td>
                <td>
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        <button class="trans-btn btn-accent edit-btn" style="padding: 4px 8px; font-size: 0.75rem;">تعديل</button>
                        <button class="trans-btn debit-btn del-btn" style="padding: 4px 8px; font-size: 0.75rem;">حذف</button>
                    </div>
                </td>
            `;

            // زر التعديل
            tr.querySelector(".edit-btn").onclick = () => {
                closeModal("clientsModal");
                openEditClientModal(c.client_id);
            };

            // زر الحذف
            tr.querySelector(".del-btn").onclick = async () => {
                if (confirm(`هل أنت متأكد من حذف العميل "${c.name}" وجميع عملياته بشكل نهائي؟`)) {
                    await fetch(API, { method: "POST", body: JSON.stringify({ action: "deleteClient", client_id: c.client_id }) });
                    showToast("تم حذف العميل بنجاح");
                    showClientsBalances();
                    loadClients();
                    loadGlobalSummary();
                }
            };

            frag.appendChild(tr);
        });

        tbody.appendChild(frag);

        const diff = totalDebit - totalCredit;
        qs("clientsTotals").innerHTML = `
            <div class="summary-item">
                <span class="label">إجمالي لكم</span>
                <span class="value debit-value">${totalDebit.toLocaleString()} ر.ي</span>
            </div>
            <div class="summary-item">
                <span class="label">إجمالي عليكم</span>
                <span class="value credit-value">${totalCredit.toLocaleString()} ر.ي</span>
            </div>
            <div class="summary-item">
                <span class="label">الصافي</span>
                <span class="value balance-value">${diff >= 0 ? `لكم ${diff.toLocaleString()}` : `عليكم ${Math.abs(diff).toLocaleString()}`}</span>
            </div>
        `;

        openModal("clientsModal");
    } catch (e) {
        showToast("تعذر تحميل كشف الأرصدة", "error");
    }
}

// فلترة جدول حسابات العملاء
function filterClientsTable() {
    const q = qs("search_client_list").value.trim().toLowerCase();
    document.querySelectorAll("#clientsBalanceBody tr").forEach(r => {
        const name = r.children[1]?.textContent.toLowerCase() || "";
        const mobile = r.children[2]?.textContent.toLowerCase() || "";
        r.style.display = (name.includes(q) || mobile.includes(q)) ? "" : "none";
    });
}

// تحديث الإحصائيات في الشاشة الرئيسية
function updateStats(explicitTotal = null) {
    qs("stat_clients").textContent = allClients.length;
    if (clientTransactions.length) {
        qs("stat_last").textContent = new Date(clientTransactions[0].date).toLocaleDateString('ar-EG');
    } else {
        qs("stat_last").textContent = "لا توجد";
    }

    const sum = explicitTotal !== null ? explicitTotal : clientTransactions.reduce((s, x) => s + Number(x.amount), 0);
    const totalEl = qs("stat_total");
    if (sum >= 0) {
        totalEl.textContent = `عليه ${sum.toLocaleString()} ر.ي`;
        totalEl.className = "value debit-value";
    } else {
        totalEl.textContent = `له ${Math.abs(sum).toLocaleString()} ر.ي`;
        totalEl.className = "value credit-value";
    }
}

// جهات الاتصال من الموبايل
function closePopup() { qs("numberPopup").style.display = "none"; }

qs("pickContact").addEventListener("click", async () => {
    if (!("contacts" in navigator && "select" in navigator.contacts)) {
        showToast("المتصفح لا يدعم اختيار جهات الاتصال", "error");
        return;
    }

    try {
        const contacts = await navigator.contacts.select(["tel"], { multiple: false });
        if (!contacts.length || !contacts[0].tel || !contacts[0].tel.length) return;

        let numbers = contacts[0].tel.map(n => {
            return n.replace(/[\s\-\(\)]/g, "")
                    .replace(/^(\+967|00967|967)/, "")
                    .replace(/^0/, "");
        });

        if (numbers.length === 1) {
            qs("new_mobile").value = numbers[0];
            return;
        }

        const listDiv = qs("numbersList");
        listDiv.innerHTML = "";
        numbers.forEach(num => {
            const btn = document.createElement("button");
            btn.textContent = num;
            btn.className = "trans-btn credit-btn";
            btn.onclick = () => {
                qs("new_mobile").value = num;
                closePopup();
            };
            listDiv.appendChild(btn);
        });

        qs("numberPopup").style.display = "flex";
    } catch (e) {
        console.warn(e);
    }
});

// التعامل مع الحافظة ولصق البيان
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        qs("note").value = text;
        showToast("تم لصق النص");
    } catch (err) {
        showToast("تعذر الوصول للحافظة، يرجى اللصق يدوياً", "error");
    }
}

// حفظ سجل البيانات المقترحة
let savedNotes = JSON.parse(localStorage.getItem("savedNotes") || "[]");
function refreshNotes() {
    const list = qs("notesList");
    list.innerHTML = "";
    savedNotes.forEach(note => {
        const op = document.createElement("option");
        op.value = note;
        list.appendChild(op);
    });
}
refreshNotes();

function saveNoteSuggestion() {
    const value = qs("note").value.trim();
    if (/^\d+$/.test(value) || !value) return;

    if (!savedNotes.includes(value)) {
        savedNotes.unshift(value);
        savedNotes = savedNotes.slice(0, 50);
        localStorage.setItem("savedNotes", JSON.stringify(savedNotes));
        refreshNotes();
    }
}

// عرض Mango Users
function showMangoUsers() {
    const tbody = qs("mangoUsersBody");
    tbody.innerHTML = "";

    const clients = allClients
        .filter(c => c.mango_user && String(c.mango_user).trim())
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar"));

    if (!clients.length) {
        tbody.innerHTML = `<tr><td colspan="3" style="color:var(--text-muted);padding:20px;">لا يوجد Mango User مسجل</td></tr>`;
    } else {
        const frag = document.createDocumentFragment();
        clients.forEach(c => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td style="direction:ltr; font-family:monospace; font-weight:bold;">${escapeHtml(c.mango_user)}</td>
                <td>
                    <button class="trans-btn btn-accent" style="padding:4px 8px; font-size:0.8rem;">📋 نسخ</button>
                </td>
            `;

            const copyBtn = tr.querySelector("button");
            copyBtn.onclick = () => copyMangoUser(c.mango_user, copyBtn);
            frag.appendChild(tr);
        });
        tbody.appendChild(frag);
    }

    qs("mangoSearch").value = "";
    openModal("mangoUsersModal");
}

async function copyMangoUser(value, button) {
    if (!value) return;
    try {
        await navigator.clipboard.writeText(String(value));
        button.textContent = "✓ تم";
        button.style.background = "#059669";
        setTimeout(() => {
            button.textContent = "📋 نسخ";
            button.style.background = "";
        }, 1200);
        showToast("تم نسخ اسم المستخدم");
    } catch {
        showToast("تعذر النسخ التلقائي", "error");
    }
}

function filterMangoUsers() {
    const q = qs("mangoSearch").value.trim().toLowerCase();
    document.querySelectorAll("#mangoUsersBody tr").forEach(row => {
        const name = row.children[0]?.textContent.toLowerCase() || "";
        const mango = row.children[1]?.textContent.toLowerCase() || "";
        row.style.display = (name.includes(q) || mango.includes(q)) ? "" : "none";
    });
}

// دالة حماية من الـ XSS
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// طباعة قائمة جميع العملاء وصافي حساباتهم
function printClientsList() {
    const rows = Array.from(document.querySelectorAll("#clientsBalanceBody tr"))
                      .filter(r => r.style.display !== "none");

    if (!rows.length) {
        showToast("لا توجد بيانات للطباعة", "error");
        return;
    }

    const today = new Date().toLocaleDateString('ar-EG');
    const tableRows = rows.map(r => {
        const name = r.children[1]?.textContent || "";
        const mobile = r.children[2]?.textContent || "";
        const total = r.children[3]?.textContent || "";
        const isDebit = total.includes("عليه");

        return `
            <tr>
                <td>${name}</td>
                <td>${mobile}</td>
                <td style="color:${isDebit ? '#dc2626' : '#16a34a'}; font-weight:bold;">${total}</td>
            </tr>
        `;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>قائمة العملاء وصافي الأرصدة</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: "Tajawal", sans-serif; margin: 20px; direction: rtl; color: #0f172a; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #047857; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.95rem; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
            th { background: #047857; color: white; }
            tr:nth-child(even) { background: #f8fafc; }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <h2>شركة يمن ستلايت</h2>
                <p>كشف إجمالي أرصدة العملاء</p>
            </div>
            <div>تاريخ التقرير: ${today}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>العميل</th>
                    <th>الجوال</th>
                    <th>الرصيد الصافي</th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
        </table>
    </body>
    </html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 350);
}

// بدء التشغيل
Promise.all([loadClients(), loadGlobalSummary()]);
qs("client_select").addEventListener("change", loadTransactions);
