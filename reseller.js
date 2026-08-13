const API_URL = "https://script.google.com/macros/s/AKfycbxpeDYcW_paPqoDR-Zikaapv4nGFDCbnp5vJebIJ5Y6X-nsrh1alvPXu4RHR-jmcjxc/exec";

let allData = [];
let filteredData = [];

let dealer = sessionStorage.getItem("dealer");


/* ==========================================
   الأشهر
   ========================================== */

const arabicMonths = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر"
];

let selectedMonthSheet = "";


/* ==========================================
   التحقق من تسجيل الدخول
   ========================================== */

if (!dealer) {
    window.location.href = "index.html";
}


/* ==========================================
   عناصر الصفحة
   ========================================== */

let level1ProfitEl;
let level2ProfitEl;
let levelsTotalProfitEl;


/* ==========================================
   إنشاء قائمة الأشهر
   ========================================== */

function setupMonthSelector() {

    const select = document.getElementById("monthSelect");

    if (!select) {
        console.error("monthSelect غير موجود");
        return;
    }

    const now = new Date();

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    select.innerHTML = "";

    /*
     * آخر 12 شهر
     */

    for (let i = 0; i < 12; i++) {

        const date = new Date(
            currentYear,
            currentMonth - i,
            1
        );

        const year = date.getFullYear();
        const monthIndex = date.getMonth();
        const monthNumber = monthIndex + 1;

        /*
         * اسم الشيت:
         *
         * أغسطس 2026 = 82026
         */

        const sheetName =
            String(monthNumber) + String(year);

        const option =
            document.createElement("option");

        option.value = sheetName;

        option.textContent =
            arabicMonths[monthIndex] +
            " " +
            year;

        /*
         * الشهر الحالي
         */

        if (i === 0) {

            option.selected = true;

            selectedMonthSheet = sheetName;
        }

        select.appendChild(option);
    }

    console.log(
        "الشهر المحدد:",
        selectedMonthSheet
    );
}


/* ==========================================
   تغيير الشهر
   ========================================== */

async function changeMonth() {

    const monthSelect =
        document.getElementById("monthSelect");

    if (!monthSelect) return;

    selectedMonthSheet =
        monthSelect.value;

    /*
     * تصفير فلاتر التاريخ
     */

    const start =
        document.getElementById("startDate");

    const end =
        document.getElementById("endDate");

    const user =
        document.getElementById("filterUser");

    if (start) start.value = "";
    if (end) end.value = "";
    if (user) user.value = "";


    /*
     * رسالة تحميل
     */

    const table =
        document.getElementById("dataTable");

    if (table) {

        const tbody =
            table.querySelector("tbody");

        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        جاري تحميل بيانات الشهر...
                    </td>
                </tr>
            `;
        }
    }


    await loadData();
}


/* ==========================================
   جلب البيانات
   ========================================== */

async function loadData() {

    try {

        const res = await fetch(API_URL, {

            method: "POST",

            body: JSON.stringify({

                monthSheet: selectedMonthSheet

            })

        });


        const json = await res.json();


        if (!json.success) {

            console.error(json);

            allData = [];
            filteredData = [];

            renderTable([]);

            return;
        }


        /* =========================
           بيانات الشهر المختار
           ========================= */

        allData = json.data || [];

        filteredData = [...allData];


        /* =========================
           المستخدمون الموجودون
           في هذا الشهر فقط
           ========================= */

        fillUserFilter(allData);


        /* =========================
           عرض البيانات
           ========================= */

        renderTable(filteredData);


        console.log(
            "الشهر:",
            json.monthSheet
        );

        console.log(
            "عدد العمليات:",
            allData.length
        );

        console.log(
            "Target:",
            json.target
        );


    } catch (error) {

        console.error(
            "Load Data Error:",
            error
        );

        allData = [];
        filteredData = [];

        renderTable([]);

        alert(
            "حدث خطأ أثناء تحميل بيانات الشهر"
        );

    }

}


/* ==========================================
   فلتر المستخدم
   ========================================== */

function fillUserFilter(data) {

    const filter =
        document.getElementById(
            "filterUser"
        );

    if (!filter) return;


    filter.innerHTML =
        '<option value="">اختر المستخدم</option>';


    [
        ...new Set(
            data.map(
                r => r[3]
            )
        )
    ].forEach(u => {

        if (u) {

            const option =
                document.createElement(
                    "option"
                );

            option.value = u;

            option.textContent = u;

            filter.appendChild(
                option
            );
        }

    });
}


/* ==========================================
   تطبيق الفلاتر
   ========================================== */

function applyFilters() {

    const start =
        document.getElementById(
            "startDate"
        );

    const end =
        document.getElementById(
            "endDate"
        );

    const user =
        document.getElementById(
            "filterUser"
        );


    const startValue =
        start ? start.value : "";

    const endValue =
        end ? end.value : "";

    const userValue =
        user ? user.value : "";


    filteredData =
        allData.filter(r => {

            const d =
                String(r[0])
                .split("T")[0];


            return (

                (!startValue ||
                    d >= startValue)

                &&

                (!endValue ||
                    d <= endValue)

                &&

                (!userValue ||
                    r[3] == userValue)

            );

        });


    renderTable(
        filteredData
    );
}


/* ==========================================
   إلغاء الفلترة
   ========================================== */

function resetFilters() {

    const start =
        document.getElementById(
            "startDate"
        );

    const end =
        document.getElementById(
            "endDate"
        );

    const user =
        document.getElementById(
            "filterUser"
        );


    if (start)
        start.value = "";

    if (end)
        end.value = "";

    if (user)
        user.value = "";


    filteredData =
        [...allData];


    renderTable(
        allData
    );
}


/* ==========================================
   عرض الجدول
   ========================================== */

function renderTable(data) {

    const table =
        document.getElementById(
            "dataTable"
        );

    if (!table) return;


    const tbody =
        table.querySelector(
            "tbody"
        );

    if (!tbody) return;


    let profit = 0;

    let amount = 0;

    let cancelled = 0;

    let html = "";


    data.forEach(r => {

        const p =
            Number(r[5]) || 0;

        const a =
            Number(r[2]) || 0;


        profit += p;


        if (p < 0) {

            amount -= a;

            cancelled++;

        } else {

            amount += a;

        }


        html += `
        <tr>
            <td>${String(r[0]).split("T")[0]}</td>
            <td>${r[1]}</td>
            <td>${r[2]}</td>
            <td>${r[3]}</td>
            <td>${r[4]}</td>
            <td>${r[5]}</td>
            <td class="status-${r[6]}">${r[6]}</td>
        </tr>`;
    });


    tbody.innerHTML =
        html;


    /*
     * الإحصائيات
     */

    const totalProfit =
        document.getElementById(
            "totalProfit"
        );

    const totalAmount =
        document.getElementById(
            "totalAmount"
        );

    const totalCodes =
        document.getElementById(
            "totalCodes"
        );

    const cancelledCodes =
        document.getElementById(
            "cancelledCodes"
        );

    const netCodes =
        document.getElementById(
            "netCodes"
        );


    if (totalProfit)
        totalProfit.innerText =
            Number(
                profit.toFixed(3)
            );


    if (totalAmount)
        totalAmount.innerText =
            Number(
                amount.toFixed(3)
            );


    if (totalCodes)
        totalCodes.innerText =
            data.length;


    if (cancelledCodes)
        cancelledCodes.innerText =
            cancelled;


    if (netCodes)
        netCodes.innerText =
            data.length -
            (cancelled * 2);


    /*
     * المستخدم المحدد
     */

    const user =
        document.getElementById(
            "filterUser"
        );

    const selectedUser =
        document.getElementById(
            "selectedUser"
        );


    if (selectedUser) {

        selectedUser.innerText =
            (user && user.value)
                ? user.value
                : "All";
    }


    /* ==========================================
       العمولات
       ========================================== */

    const mainDealerRate =
        document.getElementById(
            "mainDealerRate"
        );

    const subDealerCommission =
        document.getElementById(
            "subDealerCommission"
        );

    const mainDealerCommission =
        document.getElementById(
            "mainDealerCommission"
        );

    const totalCommission =
        document.getElementById(
            "totalCommission"
        );


    if (user && user.value) {

        const subDealerRate = 25;

        const mainRate =
            Math.max(
                0,
                25 - cancelled
            );


        const subCommission =
            profit *
            subDealerRate /
            100;


        const mainCommission =
            profit *
            mainRate /
            100;


        const total =
            subCommission +
            mainCommission;


        if (mainDealerRate)
            mainDealerRate.innerText =
                mainRate;


        if (subDealerCommission)
            subDealerCommission.innerText =
                subCommission.toFixed(3);


        if (mainDealerCommission)
            mainDealerCommission.innerText =
                mainCommission.toFixed(3);


        if (totalCommission)
            totalCommission.innerText =
                total.toFixed(3);


    } else {

        if (mainDealerRate)
            mainDealerRate.innerText = "-";

        if (subDealerCommission)
            subDealerCommission.innerText = "-";

        if (mainDealerCommission)
            mainDealerCommission.innerText = "-";

        if (totalCommission)
            totalCommission.innerText = "-";
    }


    /* ==========================================
       مستويات الأرباح
       ========================================== */

    if (
        typeof percent1 !== "undefined" &&
        typeof percent2 !== "undefined" &&
        typeof progressBar1 !== "undefined" &&
        typeof progressBar2 !== "undefined"
    ) {

        const raw1 =
            (profit / 40) * 100;

        const raw2 =
            (profit / 70) * 100;


        percent1.innerText =
            raw1.toFixed(1);

        percent2.innerText =
            raw2.toFixed(1);


        progressBar1.style.width =
            Math.min(
                raw1,
                100
            ) + "%";


        progressBar2.style.width =
            Math.min(
                raw2,
                100
            ) + "%";


        progressBar1.innerText =
            raw1.toFixed(1) + "%";


        progressBar2.innerText =
            raw2.toFixed(1) + "%";


        const level1Profit =
            raw1 >= 100
                ? profit
                : 0;


        const level2Profit =
            raw2 >= 100
                ? profit * 0.7
                : 0;


        if (level1ProfitEl)
            level1ProfitEl.innerText =
                level1Profit.toLocaleString();


        if (level2ProfitEl)
            level2ProfitEl.innerText =
                level2Profit.toLocaleString();


        if (levelsTotalProfitEl)
            levelsTotalProfitEl.innerText =
                (
                    level1Profit +
                    level2Profit
                ).toLocaleString();
    }


    /*
     * ملخص المنتجات
     */

    renderProductSummary(
        data
    );
}


/* ==========================================
   تسجيل الخروج
   ========================================== */

function logout() {

    sessionStorage.clear();

    window.location.href =
        "login.html";
}


/* ==========================================
   الترجمة
   ========================================== */

let currentLang = "ar";


function toggleLanguage() {

    const currencies =
        document.querySelectorAll(
            ".currency"
        );


    if (currentLang === "ar") {

        document.documentElement.lang =
            "en";

        document.documentElement.dir =
            "ltr";


        document.getElementById(
            "dealerName1"
        ).textContent =
            "Hi, ";


        document.getElementById(
            "lblUser"
        ).textContent =
            "👤 User:";


        document.getElementById(
            "lblProfit"
        ).textContent =
            "💰 Total Profit:";


        document.getElementById(
            "lblSales"
        ).textContent =
            "🛒 Total Sales:";


        document.getElementById(
            "lblOperations"
        ).textContent =
            "🔢 Total Transactions:";


        document.getElementById(
            "lblCancelled"
        ).textContent =
            "❌ Cancelled Codes:";


        document.getElementById(
            "lblNet"
        ).textContent =
            "✅ Net Sold Codes:";


        document.getElementById(
            "lblSubDealer"
        ).textContent =
            "👤 Sub Dealer Commission (25%):";


        document.getElementById(
            "lblMainDealer"
        ).textContent =
            "👑 Main Dealer Commission (";


        document.getElementById(
            "lblTotalCommission"
        ).textContent =
            "💰 Total Commissions:";


        currencies.forEach(
            el =>
                el.textContent =
                    "Mango"
        );


        document.querySelectorAll(
            ".salesRow"
        ).forEach(row => {

            row.style.display =
                "none";

        });


        document.getElementById(
            "langBtn"
        ).textContent =
            "العربية";


        currentLang = "en";


    } else {

        document.documentElement.lang =
            "ar";

        document.documentElement.dir =
            "rtl";


        document.getElementById(
            "dealerName1"
        ).textContent =
            "مرحبا, ";


        document.getElementById(
            "lblUser"
        ).textContent =
            "👤 المستخدم:";


        document.getElementById(
            "lblProfit"
        ).textContent =
            "💰 إجمالي الربح:";


        document.getElementById(
            "lblSales"
        ).textContent =
            "🛒 إجمالي المبيعات:";


        document.getElementById(
            "lblOperations"
        ).textContent =
            "🔢 إجمالي العمليات:";


        document.getElementById(
            "lblCancelled"
        ).textContent =
            "❌ عدد الأكواد الملغية:";


        document.getElementById(
            "lblNet"
        ).textContent =
            "✅ صافي الأكواد المباعة:";


        document.getElementById(
            "lblSubDealer"
        ).textContent =
            "👤 عمولة الوكيل الفرعي (25%):";


        document.getElementById(
            "lblMainDealer"
        ).textContent =
            "👑 عمولة الوكيل الرئيسي (";


        document.getElementById(
            "lblTotalCommission"
        ).textContent =
            "💰 إجمالي العمولتين:";


        currencies.forEach(
            el =>
                el.textContent =
                    "مانجو"
        );


        document.querySelectorAll(
            ".salesRow"
        ).forEach(row => {

            row.style.display =
                "";

        });


        document.getElementById(
            "langBtn"
        ).textContent =
            "English";


        currentLang = "ar";
    }
}


/* ==========================================
   جدول إجماليات المنتجات
   ========================================== */

function renderProductSummary(data) {

    const productStats = {};

    let totalSales = 0;

    let totalCancelled = 0;


    data.forEach(r => {

        const product =
            String(
                r[1] ||
                "غير محدد"
            ).trim();


        const profit =
            Number(r[5]) || 0;


        if (!productStats[product]) {

            productStats[product] = {

                sales: 0,

                cancelled: 0

            };
        }


        /*
         * Profit سالب = عملية ملغية
         */

        if (profit < 0) {

            productStats[product]
                .cancelled++;

            totalCancelled++;

        } else {

            productStats[product]
                .sales++;

            totalSales++;
        }

    });


    const totalNet =
        totalSales -
        totalCancelled;


    const tbody =
        document.querySelector(
            "#productSummaryTable tbody"
        );


    if (!tbody) return;


    let html = "";


    Object.entries(
        productStats
    ).forEach(
        ([product, stats]) => {

            const net =
                stats.sales -
                stats.cancelled;


            html += `
                <tr>
                    <td>${product}</td>
                    <td>${stats.sales}</td>
                    <td>${stats.cancelled}</td>
                    <td>${net}</td>
                </tr>
            `;
        }
    );


    /*
     * صف الإجمالي
     */

    html += `
        <tr class="product-total-row">
            <td><strong>الإجمالي</strong></td>
            <td><strong>${totalSales}</strong></td>
            <td><strong>${totalCancelled}</strong></td>
            <td><strong>${totalNet}</strong></td>
        </tr>
    `;


    tbody.innerHTML =
        html;
}


/* ==========================================
   تشغيل الصفحة
   ========================================== */

window.onload = function () {

    /*
     * تجهيز عناصر الأرباح
     */

    level1ProfitEl =
        document.getElementById(
            "level1Profit"
        );

    level2ProfitEl =
        document.getElementById(
            "level2Profit"
        );

    levelsTotalProfitEl =
        document.getElementById(
            "levelsTotalProfit"
        );


    /*
     * إنشاء قائمة الأشهر
     */

    setupMonthSelector();


    /*
     * ربط فلتر المستخدم
     */

    const filterUser =
        document.getElementById(
            "filterUser"
        );


    if (filterUser) {

        filterUser.addEventListener(
            "change",
            applyFilters
        );
    }


    /*
     * تحميل الشهر الحالي
     */

    loadData();

};
