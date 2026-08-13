// رابط API
const API = "https://script.google.com/macros/s/AKfycbyqo_4LRAisFoN_QrUO6nTRez1o9AgvxCFLQJzxV3DbyKczaJN0EtAXwuDMXwUMlp5c/exec";

// فحص الجلسة عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    const sessionExpire = localStorage.getItem("session_expire");
    const role = localStorage.getItem("role");
    
    if (sessionExpire && Date.now() < Number(sessionExpire)) {
        // إعادة التوجيه حسب الدور
        if (role === "admin") window.location.href = "admin.html";
        else if (localStorage.getItem("client_id")) window.location.href = "client.html";
    } else {
        // انتهاء الجلسة
        localStorage.clear();
    }
});

// تسجيل الدخول
async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const msg = document.getElementById("msg");
    msg.innerText = "";

    if (!username || !password) {
        msg.innerText = "يرجى تعبئة جميع الحقول";
        return;
    }

    try {
        const res = await fetch(API, {
            method: "POST",
            body: JSON.stringify({ action: "login", username, password })
        });

        const data = await res.json();

        if (data.status !== "success") {
            msg.innerText = data.message || "خطأ في اسم المستخدم أو كلمة المرور";
            return;
        }

        // مدة الجلسة 30 دقيقة
        const sessionDuration = 30 * 60 * 1000;
        localStorage.setItem("session_expire", Date.now() + sessionDuration);

        if (data.role === "client") {
            localStorage.setItem("client_id", data.client_id);
            localStorage.setItem("client_name", data.name);
            window.location.href = "client.html";
        } else if (data.role === "admin") {
            localStorage.setItem("role", "admin");
            window.location.href = "admin.html";
        }

    } catch (err) {
        msg.innerText = "خطأ في الاتصال بالسيرفر";
        console.error(err);
    }
}

// تمديد الجلسة عند أي تفاعل
document.addEventListener("click", () => {
    const expire = localStorage.getItem("session_expire");
    if (expire && Date.now() < Number(expire)) {
        const sessionDuration = 30 * 60 * 1000;
        localStorage.setItem("session_expire", Date.now() + sessionDuration);
    }
});
// يعمل زر Enter للدخول
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault(); // منع إعادة تحميل الصفحة
            login();            // استدعاء دالة تسجيل الدخول
        });
    }
});
