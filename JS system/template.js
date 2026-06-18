/* template.js - 2025 Optimized Version (Fixed Spec Generator Logic) */

// 統一管理報表頭資料
window.reportData = {
    client: "",
    date: "",
    partno: "",
    qty: "",
    product: "PCB",
    unit: "PCS",
    cycle: "",
    cycleInput: "",
};

document.addEventListener("DOMContentLoaded", function() {
    // 1. 初始化日期
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const localISODate = new Date(d.getTime() - offset).toISOString().split('T')[0];
    window.reportData.date = localISODate;

    // 2. 渲染 Header & Remarks
    renderHeader();
    renderRemarks();
    
    // 3. 檢查並啟用簽名圖檔
    const signatureCheckbox = document.getElementById('use-signature-img');
    if (signatureCheckbox && signatureCheckbox.checked) {
        window.toggleSignatures(signatureCheckbox);
    }
    
    // 4. 初始化邏輯
    initTemplateLogic();

    // 5. 手機輸入優化
    optimizeMobileInputs();

    // 6. 檢查 URL 是否有歷史紀錄 ID，有的話讀取資料
    checkAndLoadHistory();

    // 7. [ERP 整合] 若 URL 帶 ?orderId，自動帶入該訂單的 PCB 規格
    //    存成 promise，讓「產生 PDF」能等帶入完成才擷取(避免按太快抓到空白)
    window.__JS_SPEC_READY = loadOrderSpecIfPresent();
});

// === Mobile Friendly 優化 ===
function optimizeMobileInputs() {
    const numericSelectors = [
        '#qty-input', '#specialAmount', '#passCount', '#openCount', '#shortCount', 
        '#dim-length-input', '#dim-width-input', '#pnl-x', '#pnl-y', 
        '.table-input'
    ];

    numericSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.setAttribute('inputmode', 'decimal');
            if (!el.getAttribute('type')) {
                el.setAttribute('type', 'text');
            }
        });
    });

    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
        if (el.classList.contains('editable-cell') || el.classList.contains('data-field')) {
            el.setAttribute('inputmode', 'decimal');
        }
    });
}

// === [修正] 歷史紀錄系統：儲存 ===
window.saveCurrentReportToHistory = function() {
    // 1. 抓取基本資訊
    let reportType = document.title.replace('駿鑫 ', '');
    if (reportType.includes('規格產生器')) reportType = '規格單';

    // [修正] 規格產生器沒有客戶欄位，預設為 '-'
    const clientInput = document.getElementById('ui-client');
    const client = clientInput ? clientInput.value : '-'; 
    
    // 規格產生器用 partNo，其他報表用 ui-partno
    const partNoInput = document.getElementById('ui-partno') || document.getElementById('partNo');
    const partno = partNoInput ? partNoInput.value : '未命名料號';
    
    const filename = window.location.pathname.split('/').pop();

    // 使用 ISO 字串儲存時間，避免跨裝置解析錯誤
    const timestamp = new Date().toISOString(); 

    // 2. 抓取所有欄位資料
    const formData = {};
    
    // Inputs & Selects
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id) {
            if (el.type === 'checkbox' || el.type === 'radio') {
                formData[el.id] = el.checked;
            } else {
                formData[el.id] = el.value;
            }
        }
    });

    // Contenteditable
    document.querySelectorAll('[contenteditable="true"][id]').forEach(el => {
        formData[el.id] = el.innerText;
    });

    // 3. 建立紀錄物件
    const record = {
        id: Date.now().toString(),
        timestamp: timestamp, // 使用 ISO 格式
        type: reportType,
        page: filename,
        client: client,
        partno: partno,
        data: formData
    };

    // 4. 存入 localStorage
    let history = JSON.parse(localStorage.getItem('js_pcb_history') || '[]');
    
    // 簡單防重複：如果料號跟類型一樣，且時間在 1 分鐘內，視為同一筆操作更新
    if (history.length > 0 && history[0].partno === partno && history[0].type === reportType) {
         const lastTime = new Date(history[0].timestamp).getTime();
         const nowTime = new Date().getTime();
         if ((nowTime - lastTime) < 60000) {
             history[0] = record; // 更新最新一筆
         } else {
             history.unshift(record);
         }
    } else {
        history.unshift(record); // 新增一筆
    }

    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem('js_pcb_history', JSON.stringify(history));
}

// === 歷史紀錄系統：讀取 ===
function checkAndLoadHistory() {
    const params = new URLSearchParams(window.location.search);
    const historyId = params.get('historyId');

    if (historyId) {
        const history = JSON.parse(localStorage.getItem('js_pcb_history') || '[]');
        const record = history.find(r => r.id === historyId);

        if (record && record.data) {
            // 回填資料
            Object.keys(record.data).forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (el.type === 'checkbox' || el.type === 'radio') {
                        el.checked = record.data[id];
                        el.dispatchEvent(new Event('change')); 
                    } else if (el.isContentEditable) {
                        el.innerText = record.data[id];
                        el.dispatchEvent(new Event('input'));
                    } else {
                        el.value = record.data[id];
                        if (el.tagName === 'SELECT') {
                            el.dispatchEvent(new Event('change'));
                        } else {
                            el.dispatchEvent(new Event('input'));
                        }
                    }
                }
            });
            
            // 二次檢查：針對「其他/自行輸入」的下拉選單，確保隱藏的 input 有顯示出來
            setTimeout(() => {
                document.querySelectorAll('select').forEach(sel => {
                    if (sel.value === 'custom' || sel.value === '其他') {
                        sel.dispatchEvent(new Event('change'));
                    }
                });
                
                // 如果是規格產生器，載入後自動重新生成文字
                if (typeof generateText === 'function') {
                    generateText();
                }
            }, 100);

            // 如果有客戶名稱就顯示，沒有就只顯示料號
            const displayTitle = record.client && record.client !== '-' ? `${record.client} ${record.partno}` : record.partno;
            window.showToast(`已載入 ${displayTitle} 的紀錄`);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

// === 全域 Toast 提示 ===
window.showToast = function(message, type = 'success') {
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-notification ' + (type === 'error' ? 'error' : '');
    const icon = type === 'error' ? '⚠️ ' : '✅ ';
    toast.textContent = icon + message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
}

// === Header 渲染 ===
function renderHeader() {
    const container = document.getElementById("unified-header-container");
    if (!container) return;
    const reportTitle = container.getAttribute("data-title") || "出貨檢驗報告";
    const isSimpleMode = container.getAttribute("data-simple") === "true";
    const today = window.reportData.date;

    let htmlContent = `
        <header class="report-header-modern">
            <div class="header-left">
                <h1 class="company-name-modern">駿鑫實業有限公司</h1>
                <div class="header-sub-info">新北市五股區成泰路二段197巷31號</div>
                <div class="header-sub-info">02-2291-1252 #26</div>
            </div>
            <div class="header-right">
                <h2 class="report-title-badge">${reportTitle}</h2>
            </div>
        </header>
        <div class="print-simple-header">
            <h1>駿鑫實業有限公司</h1>
            <p>新北市五股區成泰路二段197巷31號 TEL: 02-2291-1252</p>
            <h2>${reportTitle}</h2>
        </div>
    `;

    if (!isSimpleMode) {
        htmlContent += `
        <h3 class="section-title">基本資訊</h3>
        <section class="info-grid">
            <div class="info-item">
                <span class="label">客戶</span>
                <input type="text" id="ui-client" class="input-line" placeholder="請輸入" oninput="updateReportData('client', this.value); syncToPrint('print-client', this.value); if (window.checkCompletion) window.checkCompletion();">
            </div>
            <div class="info-item">
                <span class="label">日期</span>
                <input type="date" id="today-date" class="input-line" value="${today}" onchange="updateReportData('date', this.value); syncToPrint('print-date', this.value); if (window.checkCompletion) window.checkCompletion();">
            </div>
            <div class="info-item">
                <span class="label">料號</span>
                <input type="text" id="ui-partno" class="input-line" placeholder="請輸入" oninput="updateReportData('partno', this.value); syncToPrint('print-partno', this.value); if (window.checkCompletion) window.checkCompletion();">
            </div>
            <div class="info-item">
                <span class="label">品名</span>
                <input type="text" id="ui-product-name" class="input-line" value="PCB" oninput="updateReportData('product', this.value); syncToPrint('print-product-name', this.value); if (window.checkCompletion) window.checkCompletion();">
            </div>
            <div class="info-item">
                <span class="label">數量</span>
                <div class="input-group">
                    <input type="text" id="qty-input" class="input-line" placeholder="請輸入" style="flex: 2;">
                    <select id="qty-unit" class="unit-select" style="flex: 1;" onchange="updateReportData('unit', this.value)">
                        <option value="PCS" selected>PCS</option>
                        <option value="SET">SET</option>
                    </select>
                </div>
            </div>
            <div class="info-item">
                <span class="label">週期</span>
                <div class="input-group cycle-wrapper">
                    <select id="cycle-select" class="unit-select cycle-dropdown" onchange="handleCycleSelect(this)">
                        <option value="" disabled selected hidden>請選擇</option>
                        <option value="no">無週期</option>
                        <option value="has">有週期 (輸入)</option>
                    </select>
                    <div id="cycle-input-container" style="display: none; width: 100%; align-items: center; gap: 5px;">
                        <input type="text" id="cycle-input" class="input-line" placeholder="請輸入週期" oninput="handleCycleInput(this)">
                        <span class="reset-cycle-btn" id="reset-cycle-btn" title="取消週期">×</span>
                    </div>
                </div>
            </div>
        </section>
        <table class="print-only-table">
            <tr><th>客戶名稱</th><td id="print-client"></td><th>日　　期</th><td id="print-date">${today}</td></tr>
            <tr><th>料　　號</th><td id="print-partno"></td><th>品　　名</th><td id="print-product-name">PCB</td></tr>
            <tr><th>數　　量</th><td id="print-qty"></td><th>週　　期</th><td id="print-cycle"></td></tr>
        </table>`;
    }
    container.innerHTML = htmlContent;
    if (!isSimpleMode) window.syncToPrint('print-date', today);
}

function renderRemarks() {
    const container = document.getElementById("unified-remarks-container");
    if (!container) return;
    const hideSignature = container.getAttribute("data-hide-signature") === "true";
    const labelText = container.getAttribute("data-remarks-label") || "備註";
    let html = `<div class="remarks-section"><div class="label-box">${labelText}</div><textarea class="remarks-input" id="remarks-area" rows="2" placeholder="請輸入${labelText}..."></textarea></div>`;
    if (!hideSignature) {
        html += `<div class="signature-control-area"><label class="toggle-label"><input type="checkbox" id="use-signature-img" checked onchange="toggleSignatures(this)"><span>電子簽章</span></label></div>`;
    }
    container.innerHTML = html;
}

window.toggleSignatures = function(checkbox) {
    document.body.classList.toggle('show-signatures', checkbox.checked);
}

window.updateReportData = function(key, value) {
    if (window.reportData.hasOwnProperty(key)) window.reportData[key] = value;
}

window.syncToPrint = function(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
};

window.syncPcbSpecsToPrint = function() {
    const pcbSection = document.getElementById('pcb-spec-section');
    if (!pcbSection) return;
};

function initTemplateLogic() {
    const qtyInput = document.getElementById('qty-input');
    const qtyUnit = document.getElementById('qty-unit');
    const printQty = document.getElementById('print-qty');
    const cycleInput = document.getElementById('cycle-input');
    const cycleSelect = document.getElementById('cycle-select');
    const printCycle = document.getElementById('print-cycle');
    const resetBtn = document.getElementById('reset-cycle-btn');
    const cycleContainer = document.getElementById('cycle-input-container');

    function updateQty() {
        if (!qtyInput) return;
        let rawValue = qtyInput.value.replace(/,/g, '');
        window.updateReportData('qty', rawValue);
        window.updateReportData('unit', qtyUnit.value);
        if(printQty) printQty.textContent = (qtyInput.value || '') + ' ' + (qtyUnit.value || '');
        if (window.checkCompletion) window.checkCompletion();
        if (window.updateTestResults) window.updateTestResults();
    }

    window.handleCycleSelect = function(selectEl) {
        const val = selectEl.value;
        window.updateReportData('cycle', val);
        if (val === 'has') {
           selectEl.style.display = 'none'; selectEl.value = 'has'; 
           cycleContainer.style.display = 'flex'; cycleInput.focus();
        } else if (val === 'no') {
           if(printCycle) printCycle.textContent = "N/A";
        }
        if (window.checkCompletion) window.checkCompletion();
    }

    window.handleCycleInput = function(inputEl) {
        window.updateReportData('cycleInput', inputEl.value);
        if(printCycle) printCycle.textContent = inputEl.value;
        if (window.checkCompletion) window.checkCompletion();
    }
    
    if(resetBtn) {
        resetBtn.addEventListener('click', function() {
            window.updateReportData('cycle', ''); window.updateReportData('cycleInput', '');
            cycleInput.value = ""; cycleContainer.style.display = 'none';
            cycleSelect.style.display = 'block'; cycleSelect.value = '';
            if(printCycle) printCycle.textContent = "";
            if (window.checkCompletion) window.checkCompletion();
        });
    }

    if (qtyInput && qtyUnit) {
        qtyInput.addEventListener('input', function() {
             let rawValue = this.value.replace(/,/g, '').replace(/\D/g, '');
             this.value = rawValue ? parseInt(rawValue).toLocaleString('en-US') : '';
             updateQty();
        });
        qtyUnit.addEventListener('change', updateQty);
    }
}

// === Print Logic ===
window.handlePrintProcess = function(pageValidator = null, onlyValidate = false) {
    // [ERP 整合] 電性測試報告：訂單電測為「無/未測」時，生成前先確認一次
    if (window.__JS_REPORT_TEST_IS_NONE && !window.__JS_TEST_NONE_CONFIRMED) {
        const ok = window.confirm('⚠ 此訂單的電性測試為「' + (window.__JS_REPORT_TEST_VALUE || '無') + '」，可能不需要電測報告。\n仍要繼續生成嗎？');
        if (!ok) return false;
        window.__JS_TEST_NONE_CONFIRMED = true;
    }

    let isComplete = true;
    if (window.syncPcbSpecsToPrint) window.syncPcbSpecsToPrint();

    const basicIds = ['ui-client', 'ui-partno', 'qty-input'];
    basicIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.value.trim() === '') { el.classList.add('input-error'); isComplete = false; } 
            else { el.classList.remove('input-error'); }
        }
    });

    const cycleSelect = document.getElementById('cycle-select');
    const cycleInput = document.getElementById('cycle-input');
    if (cycleSelect && (window.reportData.cycle === '' || window.reportData.cycle === '請選擇' || window.reportData.cycle === null)) { 
        cycleSelect.classList.add('input-error'); isComplete = false;
    } else if (window.reportData.cycle === 'has' && window.reportData.cycleInput.trim() === '') {
        if (cycleInput) cycleInput.classList.add('input-error'); isComplete = false;
    } else {
        if (cycleSelect) cycleSelect.classList.remove('input-error');
        if (cycleInput) cycleInput.classList.remove('input-error');
    }

    if (pageValidator && !pageValidator()) isComplete = false;

    if (!isComplete) {
        window.showToast("請填寫所有標示紅框的必填欄位！", "error");
        setTimeout(() => {
            const firstError = document.querySelector('.input-error');
            if (firstError) { firstError.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (firstError.tagName === 'INPUT') firstError.focus(); }
        }, 100);
        return false;
    }

    const remarksInput = document.querySelector('.remarks-input');
    const remarksContainer = document.getElementById('unified-remarks-container');
    if (remarksContainer) {
        if (remarksInput && remarksInput.value.trim() === '') remarksContainer.classList.add('print-hide-remarks');
        else remarksContainer.classList.remove('print-hide-remarks');
    }

    if (onlyValidate) return true;

    if (typeof window.saveCurrentReportToHistory === 'function') {
        window.saveCurrentReportToHistory();
    }

    // [ERP] 有 orderId（從 ERP 訂單開啟）→ 走伺服器端 Chromium 產多頁 PDF（每頁公司抬頭、完美分頁）+ 存回訂單。
    //       無 orderId（獨立使用）→ 退回瀏覽器原生列印。
    if ((window.__JS_REPORT_ORDER_ID || window.__JS_PDF_ENDPOINT) && typeof jsServerRenderPdf === 'function') {
        jsServerRenderPdf(pageValidator);
    } else {
        window.print();
        setTimeout(() => {
            document.querySelectorAll('.print-hidden-row').forEach(row => row.classList.remove('print-hidden-row'));
            if (remarksContainer) remarksContainer.classList.remove('print-hide-remarks');
            const nominalSpecA = document.getElementById('spec-hole1-nominal');
            if (nominalSpecA) nominalSpecA.classList.remove('input-error');
        }, 800);
    }
    return true;
};

// === 「生成PDF」與「列印」一致：走瀏覽器原生列印，於列印視窗選「另存為 PDF」 ===
// （改用原生列印後版面才會跟畫面一致、不跑掉、每頁有抬頭；html2pdf 截圖法已棄用於畫面輸出）
window.handlePDFProcess = function(pageValidator = null) {
    return window.handlePrintProcess(pageValidator);
};

/* =====================================================================
 *  [新增] ERP 整合：依 URL ?orderId 自動帶入該訂單的 PCB 規格
 *  - 只在有完整表頭的報告頁（出貨檢驗 / 電性測試）執行，規格產生器略過
 *  - 對得上下拉選項就選；對不上自動切「其他」並原文填入（生成前可手改）
 *  - 資料來源：GET /api/orders/[id]/report-spec（伺服器端授權）
 * ===================================================================== */
window.__JS_REPORT_ORDER_ID = null;
// [獨立站 / GitHub Pages] 沒有後端 → 指定外部「Chromium 產 PDF」微服務端點（Vercel），
// 輸出與 ERP 一致。留空字串 = 不啟用，維持瀏覽器原生列印（安全 fallback）。
// 部署微服務後，把網址填進下面字串即可（例：https://js-pcb-pdf.vercel.app/api/render）。
window.__JS_PDF_ENDPOINT = window.__JS_PDF_ENDPOINT || "";
window.__JS_REPORT_TEST_IS_NONE = false;
window.__JS_REPORT_TEST_VALUE = '';
window.__JS_TEST_NONE_CONFIRMED = false;

// [ERP] 讀 CSRF token（double-submit cookie，HttpOnly=false 可讀）→ 放進 x-csrf-token 標頭，
// 否則 ERP 的 CSRF 中介層會把 API 的 POST 擋成 403。
function jsGetCsrfToken() {
    const m = document.cookie.match(/(?:^|;\s*)(?:__Host-csrf|csrf)=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
}

// [優化] 報告抬頭圖快取：抬頭只有「出貨檢驗 / 電性測試」兩種且內容固定，擷取一次存 localStorage 重用，
// 省掉每次列印用 html2canvas 重畫抬頭(~1.3s)。日後抬頭若改版，把版本號 +1 即可作廢舊快取。
var JS_HEADER_CACHE_VER = 'v1';
function jsGetCachedHeader(title) {
    try {
        var raw = localStorage.getItem('js_rpt_hdr_' + JS_HEADER_CACHE_VER + '_' + title);
        if (raw) { var o = JSON.parse(raw); if (o && o.img && o.aspect > 0) return o; }
    } catch (e) {}
    return null;
}
function jsSetCachedHeader(title, img, aspect) {
    try { localStorage.setItem('js_rpt_hdr_' + JS_HEADER_CACHE_VER + '_' + title, JSON.stringify({ img: img, aspect: aspect })); } catch (e) {}
}

// （已移除舊的 html2pdf 存檔流程 jsBuildReportPdfBlob / jsUploadReportPdf：
//  列印已改走伺服器端 Chromium 產 PDF，存回訂單由 /api/orders/[id]/report-pdf-render 在伺服器端完成。）

// [ERP] 伺服器端 Chromium 產 PDF：擷取目前報告 HTML → 送後端 → 取回多頁 PDF（每頁抬頭）並已存回訂單
async function jsServerRenderPdf(pageValidator) {
    if (!window.__JS_REPORT_ORDER_ID && !window.__JS_PDF_ENDPOINT) { window.print(); return; }
    if (window.__JS_GENERATING) { if (window.showToast) window.showToast('PDF 產生中，請稍候…'); return; } // 防止重複點擊
    window.__JS_GENERATING = true;

    // 在 user gesture 內先開分頁，避免被彈窗攔截
    const win = window.open('', '_blank');
    if (win) { try { win.document.write('<!doctype html><meta charset="utf-8"><title>產生 PDF…</title><body style="font-family:sans-serif;padding:40px;color:#555">正在產生 PDF（每頁含抬頭），請稍候…</body>'); } catch (e) {} }

    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay active';
    overlay.innerHTML = '<div class="spinner"></div><div style="margin-top:15px;font-weight:bold;color:#b38728;font-size:16px;">正在產生 PDF…</div>';
    document.body.appendChild(overlay);

    try {
        // 關鍵：按列印太快時，訂單規格(report-spec)可能還沒帶入完成 → 先等它(最多 8s，任何卡住都不拖死產 PDF)，避免擷取到空白
        if (window.__JS_SPEC_READY) { try { await Promise.race([window.__JS_SPEC_READY, new Promise(function (r) { setTimeout(r, 8000); })]); } catch (e) {} }
        // 同步列印用欄位 + 隱藏空孔徑列（在帶入完成「之後」，讓擷取到的 HTML 是最終狀態）
        if (pageValidator) { try { pageValidator(); } catch (e) {} }
        else if (typeof window.checkInspectionCompletion === 'function') { try { window.checkInspectionCompletion(); } catch (e) {} }
        // clone + 把表單值凍結成屬性，讓 outerHTML 帶得出目前畫面狀態（input/textarea/select）
        const src = document.querySelector('.a4-paper');
        const clone = src.cloneNode(true);
        // 欄位值裡的半形雙引號(" U+0022)會破壞擷取 HTML 的屬性 → 伺服器 setContent 崩潰(如表面處理「化金1u"」)。
        // 換成吋號符號(″ U+2033)：語意正確(吋)且不會破壞 HTML。
        var _sq = String.fromCharCode(34), _inch = String.fromCharCode(8243);
        clone.querySelectorAll('input').forEach(function (i) { i.setAttribute('value', String(i.value || '').split(_sq).join(_inch)); });
        clone.querySelectorAll('textarea').forEach(function (t) { t.textContent = String(t.value || '').split(_sq).join(_inch); });
        clone.querySelectorAll('select').forEach(function (s) {
            Array.from(s.options).forEach(function (o) { o.removeAttribute('selected'); });
            if (s.selectedIndex >= 0) s.options[s.selectedIndex].setAttribute('selected', 'selected');
        });
        const html = clone.outerHTML;
        const reportType = (document.getElementById('unified-header-container') && document.getElementById('unified-header-container').getAttribute('data-title')) || '報告';
        const bodyClass = document.body.classList.contains('show-signatures') ? 'show-signatures' : '';

        // 擷取「原版抬頭」成圖（clone 到固定寬度維持桌面比例）→ 後端當每頁 headerTemplate，與原報告一致
        // [優化] 先查快取：同一種報告(reportType)的抬頭固定不變，擷取過就直接重用，省 ~1.3s/張
        let headerImg = null, headerAspect = 0;
        const cachedHeader = jsGetCachedHeader(reportType);
        if (cachedHeader) {
            headerImg = cachedHeader.img; headerAspect = cachedHeader.aspect;
        } else {
            try {
                const hEl = document.querySelector('.report-header-modern');
                if (hEl && window.html2canvas) {
                    const holder = document.createElement('div');
                    holder.style.cssText = 'position:fixed;left:-100000px;top:0;width:760px;background:#ffffff;';
                    const hClone = hEl.cloneNode(true);
                    hClone.style.width = '100%'; hClone.style.margin = '0';
                    // 金色漸層文字(background-clip:text)無法被 html2canvas 擷取(會變空白金塊)，改成實心金字
                    const badge = hClone.querySelector('.report-title-badge');
                    if (badge) {
                        badge.style.background = 'none';
                        badge.style.webkitBackgroundClip = 'border-box';
                        badge.style.backgroundClip = 'border-box';
                        badge.style.webkitTextFillColor = '#b38728';
                        badge.style.color = '#b38728';
                        badge.style.animation = 'none';
                    }
                    holder.appendChild(hClone); document.body.appendChild(holder);
                    await new Promise(function (r) { setTimeout(r, 30); });
                    const hc = await window.html2canvas(hClone, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 760, windowWidth: 900 });
                    document.body.removeChild(holder);
                    headerImg = hc.toDataURL('image/png');
                    headerAspect = hc.height / hc.width;
                    if (headerImg && headerAspect > 0) jsSetCachedHeader(reportType, headerImg, headerAspect);
                }
            } catch (e) { console.warn('擷取原版抬頭失敗，後端改用文字抬頭', e); headerImg = null; }
        }

        function postRender() {
            // ERP 模式（有 orderId）：走同源訂單端點，帶 CSRF、產完存回訂單。
            if (window.__JS_REPORT_ORDER_ID) {
                return fetch('/api/orders/' + window.__JS_REPORT_ORDER_ID + '/report-pdf-render', {
                    method: 'POST', credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json', 'x-csrf-token': jsGetCsrfToken() },
                    body: JSON.stringify({ html: html, reportType: reportType, bodyClass: bodyClass, headerImg: headerImg, headerAspect: headerAspect })
                });
            }
            // 獨立站模式：呼叫外部 PDF 微服務（跨網域，不帶 cookie/CSRF，只送報告內容）。
            return fetch(window.__JS_PDF_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html: html, reportType: reportType, bodyClass: bodyClass, headerImg: headerImg, headerAspect: headerAspect })
            });
        }
        // 伺服器若偶發 5xx(如記憶體不足讓 Chromium 中途關閉)，等幾秒換個 Lambda 再試一次 → 自動救回
        let res = await postRender();
        if (!res.ok && res.status >= 500) {
            await new Promise(function (r) { setTimeout(r, 3500); });
            res = await postRender();
        }
        if (!res.ok) {
            let errMsg = 'HTTP ' + res.status;
            try { const j = await res.json(); if (j && j.error) errMsg = j.error; } catch (e) {}
            throw new Error(errMsg);
        }
        const saved = res.headers.get('X-Saved') === '1';
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (win && !win.closed) win.location.href = url;
        else { const a = document.createElement('a'); a.href = url; a.download = reportType + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); }
        if (window.__JS_REPORT_ORDER_ID) {
            // ERP 模式：另存料號範本 + 顯示存回訂單結果
            if (typeof jsSaveReportTemplate === 'function') jsSaveReportTemplate();
            window.showToast(saved ? 'PDF 已產生並存回此訂單' : 'PDF 已產生（但存回訂單失敗，請重試）', saved ? 'success' : 'error');
        } else {
            // 獨立站模式：只產 PDF
            window.showToast('PDF 已產生', 'success');
        }
    } catch (e) {
        console.error('伺服器產生 PDF 失敗', e);
        if (win && !win.closed) win.close();
        window.showToast('產生 PDF 失敗：' + (e && e.message ? e.message : e), 'error');
    } finally {
        window.__JS_GENERATING = false;
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        document.querySelectorAll('.print-hidden-row').forEach(function (r) { r.classList.remove('print-hidden-row'); });
        const rc = document.getElementById('unified-remarks-container'); if (rc) rc.classList.remove('print-hide-remarks');
    }
}

function jsReportGetParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}
function jsReportDispatch(el, type) {
    el.dispatchEvent(new Event(type, { bubbles: true }));
}
// 去 emoji、吋號(")、全/半形空白，讓「化金 1u"」與「化金1u」等寫法能對上下拉
function jsReportNormalize(s) {
    return (s || '').replace(/[🟢⚪🔴⚫🔵🟡🟠🟣🟤]/g, '').replace(/["”〞＂″]/g, '').replace(/\s+/g, '').trim();
}
// 防焊/文字常見「雙面/單面」前綴 → 比對時嘗試去掉（雙面綠色 → 綠色）
function jsReportStripSide(s) {
    return (s || '').replace(/^(雙面|單面|正反面|正反)/, '').trim();
}
// 表面處理高頻別名
const JS_REPORT_SURFACE_ALIASES = { '無鉛': '無鉛噴錫', '有鉛': '有鉛噴錫', 'O.S.P': 'OSP' };

function jsReportFillText(id, value) {
    const el = document.getElementById(id);
    if (el && value != null && String(value) !== '') {
        el.value = value;
        jsReportDispatch(el, 'input');
    }
}
function jsReportSetSelect(el, value) {
    if (!el || value == null || value === '') return false;
    const v = String(value).trim();
    for (const opt of el.options) {
        if (opt.value === v || opt.textContent.trim() === v) {
            el.value = opt.value;
            jsReportDispatch(el, 'change');
            return true;
        }
    }
    return false;
}
// 取得 inspection-report 內以 data-print-target 標示的 toggle-select
function jsReportToggle(printTarget) {
    return document.querySelector('.toggle-select[data-print-target="' + printTarget + '"]');
}
// inspection-report PCB 規格欄：對得上選項就選，對不上切「其他」原文填入
function jsReportFillToggle(selectEl, rawValue) {
    if (!selectEl || rawValue == null || String(rawValue).trim() === '') return;
    const raw = String(rawValue).trim();
    const candidates = [raw, jsReportStripSide(raw)];
    if (JS_REPORT_SURFACE_ALIASES[raw]) candidates.push(JS_REPORT_SURFACE_ALIASES[raw]);
    const normSet = candidates.map(jsReportNormalize);

    let matched = null;
    for (const opt of selectEl.options) {
        if (opt.disabled || opt.value === '' || opt.value === '其他') continue;
        const ov = jsReportNormalize(opt.value);
        const ot = jsReportNormalize(opt.textContent);
        if (normSet.includes(ov) || normSet.includes(ot)) { matched = opt; break; }
    }

    if (matched) {
        selectEl.value = matched.value;
        jsReportDispatch(selectEl, 'change');
    } else {
        // 切到「其他」並原文填入（initToggleLogic 的 change 監聽會顯示輸入框）
        selectEl.value = '其他';
        jsReportDispatch(selectEl, 'change');
        const box = document.getElementById(selectEl.getAttribute('data-target'));
        const input = box ? box.querySelector('input') : null;
        if (input) {
            input.value = raw;
            jsReportDispatch(input, 'input');
        }
    }
}

function jsReportFill(spec) {
    // ── 表頭 ──
    jsReportFillText('ui-client', spec.client);
    jsReportFillText('ui-partno', spec.partNo);
    // 品名：預設 PCB（可手改）；訂單規格若有帶 product 就覆寫，否則維持預設值。
    if (spec.product) jsReportFillText('ui-product-name', spec.product);

    // 數量 + 單位（先設單位，再設數量；數量 input 監聽會更新 print-qty 與電測 PASS/FAIL）
    jsReportSetSelect(document.getElementById('qty-unit'), spec.qtyUnit);
    jsReportFillText('qty-input', spec.qty);

    // 週期
    const cycleSelect = document.getElementById('cycle-select');
    if (cycleSelect && spec.cycle) {
        cycleSelect.value = spec.cycle;
        jsReportDispatch(cycleSelect, 'change');
        if (spec.cycle === 'has') {
            const ci = document.getElementById('cycle-input');
            if (ci) { ci.value = spec.cycleInput || ''; jsReportDispatch(ci, 'input'); }
        }
    }

    // ── PCB 規格區（僅出貨檢驗報告有 #pcb-spec-section）──
    const pcb = document.getElementById('pcb-spec-section');
    if (pcb) {
        // 多層板有內層銅厚時，先把「內層銅厚」欄顯示出來（單/雙面板維持隱藏）
        if (typeof window.revealInnerCopper === 'function') {
            window.revealInnerCopper(!!(spec.innerCopper && String(spec.innerCopper).trim()));
        }
        jsReportFillToggle(jsReportToggle('print-material'), spec.material);
        jsReportFillToggle(jsReportToggle('print-layer'), spec.layerType);
        jsReportFillToggle(jsReportToggle('print-thickness'), spec.boardThickness);
        jsReportFillToggle(jsReportToggle('print-inner-copper'), spec.innerCopper);
        jsReportFillToggle(jsReportToggle('print-copper'), spec.outerCopper);
        jsReportFillToggle(jsReportToggle('print-mask'), spec.solderMask);
        jsReportFillToggle(jsReportToggle('print-legend'), spec.legend);
        jsReportFillToggle(jsReportToggle('print-surface'), spec.surfaceFinish);

        // 尺寸 + 排版（會連動填入下方「長度/寬度」標稱規格）
        jsReportFillText('dim-length-input', spec.dimLength);
        jsReportFillText('dim-width-input', spec.dimWidth);
        jsReportFillText('pnl-x', spec.panelX);
        jsReportFillText('pnl-y', spec.panelY);

        // 依需求：實際量測值 / 判定留空，由現場人工填（規格已帶入即可）
        document.querySelectorAll('#inspection-data-table .data-field').forEach(function (c) { c.textContent = ''; });
        document.querySelectorAll('#inspection-data-table .judgment-field').forEach(function (c) { c.textContent = ''; c.style.color = ''; });
    }

    if (window.checkCompletion) window.checkCompletion();
}

// [沿用] 目前報告類型
function jsReportKind() {
    const p = window.location.pathname;
    if (/inspection-report/.test(p)) return 'inspection';
    if (/test-report/.test(p)) return 'test';
    return 'other';
}

// [沿用] 把目前報告的「手動黏著欄位」存成範本（依料號，下次同料號可沿用）
async function jsSaveReportTemplate() {
    if (!window.__JS_REPORT_ORDER_ID) return;
    if (typeof window.captureReportTemplate !== 'function') return;
    try {
        const template = window.captureReportTemplate();
        await fetch('/api/orders/' + window.__JS_REPORT_ORDER_ID + '/report-template', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'x-csrf-token': jsGetCsrfToken() },
            body: JSON.stringify({ kind: jsReportKind(), template: template })
        });
    } catch (e) { console.warn('儲存沿用範本失敗', e); }
}

// [沿用] 在操作按鈕區加上「↻ 沿用上次」按鈕
function jsAddReuseButton(template) {
    const bar = document.querySelector('.action-buttons');
    if (!bar || document.getElementById('btn-reuse-last')) return;
    const btn = document.createElement('button');
    btn.id = 'btn-reuse-last';
    btn.type = 'button';
    btn.className = 'btn-print';
    btn.style.cssText = 'background: rgba(0,122,255,0.12); color:#004d99; border:1px solid rgba(0,122,255,0.35);';
    btn.innerHTML = '<span style="font-size:18px;line-height:1;">&#8635;</span> 沿用上次';
    btn.title = '沿用上次同料號報告的孔徑規格 / 測試參數 / 備註（量測值會重新隨機）';
    btn.addEventListener('click', function () {
        if (typeof window.applyReportTemplate === 'function') {
            window.applyReportTemplate(template);
            if (window.showToast) window.showToast('已沿用上次同料號的設定，數值已重新隨機');
        }
    });
    bar.appendChild(btn);
}

async function loadOrderSpecIfPresent() {
    const orderId = jsReportGetParam('orderId');
    if (!orderId) return;
    // 僅在有完整表頭（ui-client）的報告頁執行；規格產生器(simple header)略過
    if (!document.getElementById('ui-client')) return;
    window.__JS_REPORT_ORDER_ID = orderId;
    try {
        const res = await fetch('/api/orders/' + orderId + '/report-spec', { credentials: 'same-origin' });
        const json = await res.json().catch(() => null);
        if (!json || !json.success) {
            if (window.showToast) window.showToast('無法載入訂單規格：' + ((json && json.error) || res.status), 'error');
            return;
        }
        const spec = json.data;
        jsReportFill(spec);

        // 電性測試報告：訂單電測為「無/未測」→ 設旗標，生成前由 handlePrintProcess 跳確認
        const isTestPage = /test-report/.test(window.location.pathname);
        if (isTestPage && spec.electricalTestIsNone) {
            window.__JS_REPORT_TEST_IS_NONE = true;
            window.__JS_REPORT_TEST_VALUE = spec.electricalTest || '無';
            setTimeout(function () {
                if (window.showToast) window.showToast('⚠ 此訂單電測為「' + (spec.electricalTest || '無') + '」，請確認是否需要電測報告', 'error');
            }, 700);
        }
        if (window.showToast) {
            window.showToast('已帶入訂單 ' + (spec.partNo || spec.client || '') + ' 的規格');
        }
        // [沿用] 若此料號以前做過同類報告，提供「↻ 沿用上次」按鈕。
        // 非阻塞(不 await)：report-template 查詢若慢/hang 不可拖住 loadOrderSpecIfPresent，
        // 否則會連帶卡住「產生 PDF」(jsServerRenderPdf 會等規格帶入完成才擷取)。
        (function () {
            let kind;
            try { kind = jsReportKind(); } catch (e) { return; }
            if (kind !== 'inspection' && kind !== 'test') return;
            fetch('/api/orders/' + orderId + '/report-template?kind=' + kind, { credentials: 'same-origin' })
                .then(function (tr) { return tr.json(); })
                .then(function (tj) {
                    if (tj && tj.success && tj.data && tj.data.template) {
                        jsAddReuseButton(tj.data.template);
                        if (window.showToast) window.showToast('此料號有上次紀錄，可按「↻ 沿用上次」帶入孔徑/參數');
                    }
                })
                .catch(function () { /* 沒範本就略過 */ });
        })();
    } catch (e) {
        console.error('[report] 載入訂單規格失敗', e);
        if (window.showToast) window.showToast('載入訂單規格失敗', 'error');
    }
}