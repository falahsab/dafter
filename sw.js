const CACHE_NAME = "يشبفشق-cache-v1";
const urlsToCache = [
    "index.html",
    "client.html",
    "admin.html",
    "style.css",
    "script.js",
    "reseller.html",
    "reseller.css",
    "reseller.js",
    "دفتر-يمن-ستلايت-192.png",
    "دفتر-يمن-ستلايت-512.png"
];

// تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(urlsToCache))
        .then(() => self.skipWaiting())
    );
});

// تفعيل الـ Service Worker
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }))
        ).then(() => self.clients.claim())
    );
});

// التعامل مع الطلبات من الشبكة أو الكاش
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
});
