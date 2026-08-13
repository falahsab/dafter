// رابط السكربت الصحيح الذي يدعم العملاء والأدمن
const API = "https://script.google.com/macros/s/AKfycbyqo_4LRAisFoN_QrUO6nTRez1o9AgvxCFLQJzxV3DbyKczaJN0EtAXwuDMXwUMlp5c/exec";

async function login() {
    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value.trim();
    let msg = document.getElementById("msg");

    msg.innerText = "";

    if (username === "" || password === "") {
        msg.innerText = "يرجى تعبئة جميع الحقول";
        return;
    }

    try {
        let res = await fetch(API, {
            method: "POST",
            body: JSON.stringify({
                action: "login",
                username,
                password
            })
        });

        let data = await res.json();

        if (data.status !== "success") {
            msg.innerText = data.message || "خطأ في اسم المستخدم أو كلمة المرور";
            return;
        }

        // حفظ بيانات العميل أو الانتقال للأدمن
        if (data.role === "client") {
            localStorage.setItem("client_id", data.client_id);
            localStorage.setItem("client_name", data.name);
            window.location = "client.html";
        } else if (data.role === "admin") {
            localStorage.setItem("role", "admin");
            window.location = "admin.html";
        }

    } catch (err) {
        msg.innerText = "خطأ في الاتصال بالسيرفر";
        console.error(err);
    }
}
     // تحديد مدة الجلسه
    document.addEventListener("click", () => {
    const expire = localStorage.getItem("session_expire");
    if (expire && Date.now() < Number(expire)) {
        // تمديد الجلسة تلقائياً
        const sessionDuration = 30 * 60 * 1000; // 30 دقيقة
        localStorage.setItem("session_expire", Date.now() + sessionDuration);
    }
});
// تسجيل Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js")
    .then(() => console.log("Service Worker Registered"))
    .catch((err) => console.error("SW registration failed:", err));
}

// زر تثبيت التطبيق
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.createElement("button");
  installBtn.textContent = "ثبت التطبيق على جهازك";
  installBtn.className = "btn";
  installBtn.style.position = "fixed";
  installBtn.style.bottom = "10px";
  installBtn.style.left = "50%";
  installBtn.style.transform = "translateX(-50%)";
  installBtn.style.zIndex = "10000";
  document.body.appendChild(installBtn);

  installBtn.addEventListener("click", async () => {
    installBtn.remove();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(outcome === "accepted" ? "تم التثبيت" : "تم رفض التثبيت");
    deferredPrompt = null;
  });
});
