const API_URL = "https://script.google.com/macros/s/AKfycbxpeDYcW_paPqoDR-Zikaapv4nGFDCbnp5vJebIJ5Y6X-nsrh1alvPXu4RHR-jmcjxc/exec";

    let allData = [];
    let filteredData = [];
    let selectedMonthSheet = "";
    let currentLang = localStorage.getItem("app_lang") || "ar";

    /* ==========================================
       قاموس الترجمة الشامل (i18n Dictionary)
       ========================================== */
    const translations = {
      ar: {
        pageTitle: "لوحة الموزع المعتمد",
        homeBtn: "الرئيسية",
        monthLabel: "📅 الشهر:",
        lblUser: "👤 المستخدم الحالي",
        lblProfit: "💰 إجمالي الربح",
        lblHalfProfit: "💰 نصف إجمالي الربح (50%)",
        lblSales: "🛒 إجمالي المبيعات",
        lblOperations: "🔢 إجمالي العمليات",
        lblCancelled: "❌ العمليات الملغية",
        lblNet: "✅ صافي الأكواد المباعة",
        lblCommissionHeading: "👑 تفاصيل العمولات للمستخدم المختار:",
        lblSubDealer: "👤 الوكيل الفرعي (25%):",
        lblMainDealer: "👑 الوكيل الرئيسي",
        lblTotalCommission: "💰 إجمالي العمولتين:",
        lblFilterUser: "👤 فلترة بالمستخدم:",
        optAllUsers: "جميع المستخدمين",
        lblStartDate: "📅 من تاريخ:",
        lblEndDate: "📅 إلى تاريخ:",
        btnApply: "تطبيق الفلترة",
        btnReset: "إلغاء الفلترة",
        titleProductSummary: "📦 إحصائيات المنتجات المباعة",
        titleDataTable: "📋 تفاصيل جميع العمليات",
        thDate: "التاريخ",
        thProduct: "المنتج",
        thAmount: "المبلغ",
        thUser: "المستخدم",
        thSN: "الرقم التسلسلي (SN)",
        thProfit: "الربح",
        thStatus: "الحالة",
        thSales: "المبيعات",
        thCancelled: "الملغي",
        thNet: "الصافي",
        currency: "مانجو",
        allUsersLabel: "الكل",
        totalRowLabel: "الإجمالي الكلي",
        loading: "⏳ جاري تحميل بيانات الشهر...",
        noData: "لا توجد عمليات مسجلة لهذا الاختيار",
        noProducts: "لا توجد منتجات مسجلة",
        errorLoading: "حدث خطأ أثناء تحميل البيانات، يرجى المحاولة لاحقاً.",
        months: [
          "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
          "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        ]
      },
      en: {
        pageTitle: "Authorized Reseller Dashboard",
        homeBtn: "Home",
        monthLabel: "📅 Month:",
        lblUser: "👤 Current User",
        lblProfit: "💰 Total Profit",
        lblHalfProfit: "💰 Total Profit (50%)",
        lblSales: "🛒 Total Sales",
        lblOperations: "🔢 Total Transactions",
        lblCancelled: "❌ Cancelled Codes",
        lblNet: "✅ Net Sold Codes",
        lblCommissionHeading: "👑 Commission Breakdown for Selected User:",
        lblSubDealer: "👤 Sub Dealer (25%):",
        lblMainDealer: "👑 Main Dealer",
        lblTotalCommission: "💰 Total Commissions:",
        lblFilterUser: "👤 Filter by User:",
        optAllUsers: "All Users",
        lblStartDate: "📅 From Date:",
        lblEndDate: "📅 To Date:",
        btnApply: "Apply Filters",
        btnReset: "Reset Filters",
        titleProductSummary: "📦 Sold Products Statistics",
        titleDataTable: "📋 All Transactions Details",
        thDate: "Date",
        thProduct: "Product",
        thAmount: "Amount",
        thUser: "User",
        thSN: "Serial Number (SN)",
        thProfit: "Profit",
        thStatus: "Status",
        thSales: "Sales",
        thCancelled: "Cancelled",
        thNet: "Net",
        currency: "Mango",
        allUsersLabel: "All",
        totalRowLabel: "Total Summary",
        loading: "⏳ Loading month data...",
        noData: "No transactions recorded for this selection",
        noProducts: "No products recorded",
        errorLoading: "An error occurred while loading data. Please try again.",
        months: [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ]
      }
    };

    function escapeHtml(str) {
      if (str === null || str === undefined) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    /* ==========================================
       1. تطبيق اللغة والتحكم بالبطاقات
       ========================================== */
    function applyLanguage(lang) {
      currentLang = lang;
      localStorage.setItem("app_lang", lang);

      const t = translations[lang];
      const isAr = lang === "ar";

      document.documentElement.lang = lang;
      document.documentElement.dir = isAr ? "rtl" : "ltr";

      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (t[key]) {
          el.textContent = t[key];
        }
      });

      document.getElementById("langBtn").textContent = isAr ? "EN" : "AR";
      updateMonthSelectorLabels();

      // التبديل بين بطاقة إجمالي الربح (عربي) ونصف الربح (إنجليزي)
      const cardTotalProfit = document.getElementById("cardTotalProfit");
      const cardHalfProfit = document.getElementById("cardHalfProfit");

      if (isAr) {
        if (cardTotalProfit) cardTotalProfit.style.display = "flex";
        if (cardHalfProfit) cardHalfProfit.style.display = "none";
      } else {
        if (cardTotalProfit) cardTotalProfit.style.display = "none";
        if (cardHalfProfit) cardHalfProfit.style.display = "flex";
      }

      if (filteredData.length > 0 || allData.length > 0) {
        renderTable(filteredData);
      }
    }

    function toggleLanguage() {
      applyLanguage(currentLang === "ar" ? "en" : "ar");
    }

    /* ==========================================
       2. إعداد قائمة الأشهر
       ========================================== */
    function setupMonthSelector() {
      const select = document.getElementById("monthSelect");
      if (!select) return;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      select.innerHTML = "";

      for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const year = date.getFullYear();
        const monthIndex = date.getMonth();
        const monthNumber = monthIndex + 1;

        const sheetName = `${monthNumber}${year}`;

        const option = document.createElement("option");
        option.value = sheetName;
        option.setAttribute("data-month-index", monthIndex);
        option.setAttribute("data-year", year);
        option.textContent = `${translations[currentLang].months[monthIndex]} ${year}`;

        if (i === 0) {
          option.selected = true;
          selectedMonthSheet = sheetName;
        }

        select.appendChild(option);
      }
    }

    function updateMonthSelectorLabels() {
      const select = document.getElementById("monthSelect");
      if (!select) return;

      Array.from(select.options).forEach(option => {
        const monthIdx = option.getAttribute("data-month-index");
        const year = option.getAttribute("data-year");
        if (monthIdx !== null && year !== null) {
          option.textContent = `${translations[currentLang].months[monthIdx]} ${year}`;
        }
      });
    }

    /* ==========================================
       3. تغيير الشهر
       ========================================== */
    async function changeMonth() {
      const monthSelect = document.getElementById("monthSelect");
      if (!monthSelect) return;

      selectedMonthSheet = monthSelect.value;

      document.getElementById("startDate").value = "";
      document.getElementById("endDate").value = "";
      document.getElementById("filterUser").value = "";

      const tbody = document.querySelector("#dataTable tbody");
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="padding: 30px; color: var(--text-muted);">
              ${translations[currentLang].loading}
            </td>
          </tr>
        `;
      }

      await loadData();
    }

    /* ==========================================
       4. جلب البيانات من السيرفر
       ========================================== */
    async function loadData() {
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify({ monthSheet: selectedMonthSheet })
        });

        const json = await res.json();

        if (!json.success) {
          allData = [];
          filteredData = [];
          renderTable([]);
          return;
        }

        allData = json.data || [];
        filteredData = [...allData];

        fillUserFilter(allData);
        renderTable(filteredData);

      } catch (error) {
        console.error("Load Data Error:", error);
        allData = [];
        filteredData = [];
        renderTable([]);
        alert(translations[currentLang].errorLoading);
      }
    }

    /* ==========================================
       5. تعبئة قائمة المستخدمين
       ========================================== */
    function fillUserFilter(data) {
      const filter = document.getElementById("filterUser");
      if (!filter) return;

      const currentVal = filter.value;
      filter.innerHTML = `<option value="">${translations[currentLang].optAllUsers}</option>`;

      const users = [...new Set(data.map(r => r[3]))].filter(Boolean);
      users.sort().forEach(u => {
        const option = document.createElement("option");
        option.value = u;
        option.textContent = u;
        if (u === currentVal) option.selected = true;
        filter.appendChild(option);
      });
    }

    /* ==========================================
       6. تطبيق وإلغاء الفلاتر
       ========================================== */
    function applyFilters() {
      const start = document.getElementById("startDate")?.value || "";
      const end = document.getElementById("endDate")?.value || "";
      const user = document.getElementById("filterUser")?.value || "";

      filteredData = allData.filter(r => {
        const dateStr = String(r[0]).split("T")[0];
        const matchStart = !start || dateStr >= start;
        const matchEnd = !end || dateStr <= end;
        const matchUser = !user || String(r[3]) === user;

        return matchStart && matchEnd && matchUser;
      });

      renderTable(filteredData);
    }

    function resetFilters() {
      document.getElementById("startDate").value = "";
      document.getElementById("endDate").value = "";
      document.getElementById("filterUser").value = "";

      filteredData = [...allData];
      renderTable(filteredData);
    }

    /* ==========================================
       7. عرض الجدول الرئيسي والإحصائيات
       ========================================== */
    function renderTable(data) {
      const tbody = document.querySelector("#dataTable tbody");
      if (!tbody) return;

      const t = translations[currentLang];

      if (data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="padding: 30px; color: var(--text-muted);">
              ${t.noData}
            </td>
          </tr>
        `;
        updateSummaryStats(0, 0, 0, 0, 0);
        renderProductSummary([]);
        return;
      }

      let profit = 0;
      let amount = 0;
      let salesCount = 0;
      let cancelledCount = 0;
      let html = "";

      data.forEach(r => {
        const p = Number(r[5]) || 0;
        const itemAmount = Math.abs(Number(r[2]) || 0);

        profit += p;

        if (p < 0) {
          amount -= itemAmount;
          cancelledCount++;
        } else {
          amount += itemAmount;
          salesCount++;
        }

        const dateOnly = String(r[0]).split("T")[0];
        const rawStatus = escapeHtml(r[6]);

        html += `
          <tr>
            <td>${escapeHtml(dateOnly)}</td>
            <td><strong>${escapeHtml(r[1])}</strong></td>
            <td>${itemAmount.toLocaleString()}</td>
            <td>${escapeHtml(r[3])}</td>
            <td><code>${escapeHtml(r[4])}</code></td>
            <td class="${p < 0 ? 'text-danger' : 'text-success'}">${p.toLocaleString()}</td>
            <td><span class="status-badge status-${rawStatus}">${rawStatus}</span></td>
          </tr>
        `;
      });

      tbody.innerHTML = html;

      const totalCodes = data.length;
      const netCodes = salesCount - cancelledCount;
      updateSummaryStats(profit, amount, totalCodes, cancelledCount, netCodes);
      renderProductSummary(data);
    }

    function updateSummaryStats(profit, amount, totalCodes, cancelledCodes, netCodes) {
      const t = translations[currentLang];
      const halfProfit = profit / 2;

      document.getElementById("totalProfit").textContent = profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById("halfProfit").textContent = halfProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById("totalAmount").textContent = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById("totalCodes").textContent = totalCodes;
      document.getElementById("cancelledCodes").textContent = cancelledCodes;
      document.getElementById("netCodes").textContent = netCodes;

      const user = document.getElementById("filterUser");
      const isSpecificUser = Boolean(user && user.value);
      document.getElementById("selectedUser").textContent = isSpecificUser ? user.value : t.allUsersLabel;

      calculateCommissions(profit, cancelledCodes, isSpecificUser);
    }

    function calculateCommissions(profit, cancelledCount, isSpecificUser) {
      const t = translations[currentLang];
      const mainDealerRateEl = document.getElementById("mainDealerRate");
      const subDealerCommissionEl = document.getElementById("subDealerCommission");
      const mainDealerCommissionEl = document.getElementById("mainDealerCommission");
      const totalCommissionEl = document.getElementById("totalCommission");

      if (isSpecificUser) {
        const subDealerRate = 25;
        const mainRate = Math.max(0, 25 - cancelledCount);

        const subCommission = (profit * subDealerRate) / 100;
        const mainCommission = (profit * mainRate) / 100;
        const total = subCommission + mainCommission;

        mainDealerRateEl.textContent = mainRate;
        subDealerCommissionEl.textContent = `${subCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t.currency}`;
        mainDealerCommissionEl.textContent = `${mainCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t.currency}`;
        totalCommissionEl.textContent = `${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t.currency}`;
      } else {
        mainDealerRateEl.textContent = "-";
        subDealerCommissionEl.textContent = "-";
        mainDealerCommissionEl.textContent = "-";
        totalCommissionEl.textContent = "-";
      }
    }

    /* ==========================================
       8. جدول ملخص المنتجات
       ========================================== */
    function renderProductSummary(data) {
      const tbody = document.querySelector("#productSummaryTable tbody");
      if (!tbody) return;

      const t = translations[currentLang];

      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 20px; color: var(--text-muted); text-align: center;">${t.noProducts}</td></tr>`;
        return;
      }

      const productStats = {};
      let totalSales = 0;
      let totalCancelled = 0;

      data.forEach(r => {
        const product = String(r[1] || "غير محدد").trim();
        const profit = Number(r[5]) || 0;

        if (!productStats[product]) {
          productStats[product] = { sales: 0, cancelled: 0 };
        }

        if (profit < 0) {
          productStats[product].cancelled++;
          totalCancelled++;
        } else {
          productStats[product].sales++;
          totalSales++;
        }
      });

      const totalNet = totalSales - totalCancelled;
      let html = "";

      Object.entries(productStats).forEach(([product, stats]) => {
        const net = stats.sales - stats.cancelled;
        html += `
          <tr>
            <td><strong>${escapeHtml(product)}</strong></td>
            <td>${stats.sales}</td>
            <td class="text-danger">${stats.cancelled}</td>
            <td class="text-success">${net}</td>
          </tr>
        `;
      });

      html += `
        <tr class="product-total-row">
          <td><strong>${t.totalRowLabel}</strong></td>
          <td><strong>${totalSales}</strong></td>
          <td class="text-danger"><strong>${totalCancelled}</strong></td>
          <td class="text-success"><strong>${totalNet}</strong></td>
        </tr>
      `;

      tbody.innerHTML = html;
    }

    /* ==========================================
       9. الإقلاع والربط
       ========================================== */
    window.addEventListener("DOMContentLoaded", () => {
      setupMonthSelector();

      const filterUser = document.getElementById("filterUser");
      if (filterUser) {
        filterUser.addEventListener("change", applyFilters);
      }

      applyLanguage(currentLang);
      loadData();
    });
// دالة إظهار وإخفاء التضليل عند النقر
function toggleBlur(el) {
  el.classList.toggle("revealed");
}
