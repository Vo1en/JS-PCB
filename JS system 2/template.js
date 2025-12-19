/* template.js - 2025 Optimized Version (Fixed Spec Generator Logic) */

// 統一管理報表頭資料
window.reportData = {
    client: "",
    date: "",
    partno: "",
    qty: "",
    unit: "PNL",
    cycle: "",
    cycleInput: "",
};

document.addEventListener("DOMContentLoaded", function () {
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
window.saveCurrentReportToHistory = function () {
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
window.showToast = function (message, type = 'success') {
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
                <span class="fixed-product-value" id="ui-product-name"></span>
            </div>
            <div class="info-item">
                <span class="label">數量</span>
                <div class="input-group">
                    <input type="text" id="qty-input" class="input-line" placeholder="請輸入" style="flex: 2;">
                    <select id="qty-unit" class="unit-select" style="flex: 1;" onchange="updateReportData('unit', this.value)">
                        <option value="PNL" selected>PNL</option>
                        <option value="PCS">PCS</option>
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
    let html = `<div class="remarks-section"><div class="label-box">備註</div><textarea class="remarks-input" id="remarks-area" rows="2" placeholder="請輸入備註..."></textarea></div>`;
    if (!hideSignature) {
        html += `<div class="signature-control-area"><label class="toggle-label"><input type="checkbox" id="use-signature-img" checked onchange="toggleSignatures(this)"><span>電子簽章</span></label></div>`;
    }
    container.innerHTML = html;
}

window.toggleSignatures = function (checkbox) {
    document.body.classList.toggle('show-signatures', checkbox.checked);
}

window.updateReportData = function (key, value) {
    if (window.reportData.hasOwnProperty(key)) window.reportData[key] = value;
}

window.syncToPrint = function (elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
};

window.syncPcbSpecsToPrint = function () {
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
        if (printQty) printQty.textContent = (qtyInput.value || '') + ' ' + (qtyUnit.value || '');
        if (window.checkCompletion) window.checkCompletion();
        if (window.updateTestResults) window.updateTestResults();
    }

    window.handleCycleSelect = function (selectEl) {
        const val = selectEl.value;
        window.updateReportData('cycle', val);
        if (val === 'has') {
            selectEl.style.display = 'none'; selectEl.value = 'has';
            cycleContainer.style.display = 'flex'; cycleInput.focus();
        } else if (val === 'no') {
            if (printCycle) printCycle.textContent = "N/A";
        }
        if (window.checkCompletion) window.checkCompletion();
    }

    window.handleCycleInput = function (inputEl) {
        window.updateReportData('cycleInput', inputEl.value);
        if (printCycle) printCycle.textContent = inputEl.value;
        if (window.checkCompletion) window.checkCompletion();
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            window.updateReportData('cycle', ''); window.updateReportData('cycleInput', '');
            cycleInput.value = ""; cycleContainer.style.display = 'none';
            cycleSelect.style.display = 'block'; cycleSelect.value = '';
            if (printCycle) printCycle.textContent = "";
            if (window.checkCompletion) window.checkCompletion();
        });
    }

    if (qtyInput && qtyUnit) {
        qtyInput.addEventListener('input', function () {
            let rawValue = this.value.replace(/,/g, '').replace(/\D/g, '');
            this.value = rawValue ? parseInt(rawValue).toLocaleString('en-US') : '';
            updateQty();
        });
        qtyUnit.addEventListener('change', updateQty);
    }
}

// === Print Logic ===
window.handlePrintProcess = function (pageValidator = null, onlyValidate = false) {
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

    window.print();
    setTimeout(() => {
        document.querySelectorAll('.print-hidden-row').forEach(row => row.classList.remove('print-hidden-row'));
        if (remarksContainer) remarksContainer.classList.remove('print-hide-remarks');
        const nominalSpecA = document.getElementById('spec-hole1-nominal');
        if (nominalSpecA) nominalSpecA.classList.remove('input-error');
    }, 500);
    return true;
};

// === PDF Logic ===
// === PDF Logic ===
window.handlePDFProcess = function (pageValidator = null) {
    if (typeof html2pdf === 'undefined') { window.showToast("PDF 生成元件尚未載入完成", "error"); return; }
    if (!window.handlePrintProcess(pageValidator, true)) return;

    if (typeof window.saveCurrentReportToHistory === 'function') {
        window.saveCurrentReportToHistory();
    }

    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay active';
    overlay.innerHTML = '<div class="spinner"></div><div style="margin-top:15px;font-weight:bold;color:#b38728;font-size:16px;">正在生成 PDF，請稍候...</div>';
    document.body.appendChild(overlay);

    const client = window.reportData.client || '客戶';
    const partNo = window.reportData.partno || '料號';
    const reportTitle = document.getElementById('unified-header-container').getAttribute('data-title') || '報告';
    const safePartNo = partNo.replace(/[\/\\:*?"<>|]/g, '_');
    const fileName = `${client} ${safePartNo} ${reportTitle}.pdf`;
    const element = document.querySelector('.a4-paper');

    const opt = {
        margin: [10, 10, 15, 10], // 上、右、下、左 (下邊距留給頁碼)
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            scrollY: 0,
            letterRendering: true,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            avoid: ['tr', '.info-item', '.sign-box', '.final-decision-box', '.section-header-wrapper', '.result-item']
        }
    };

    document.body.classList.add('printing-pdf');

    setTimeout(() => {
        html2pdf().from(element).set(opt).toPdf().get('pdf').then(function (pdf) {
            const totalPages = pdf.internal.getNumberOfPages();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(9);
                pdf.setTextColor(100, 100, 100);

                // 左下角：列印資訊
                const dateStr = new Date().toLocaleString('zh-TW', { hour12: false });
                pdf.text(`Print: ${dateStr}`, 10, pageHeight - 8);

                // 右下角：頁碼 (Page x of y)
                const pageStr = `Page ${i} of ${totalPages}`;
                pdf.text(pageStr, pageWidth - 10 - pdf.getTextWidth(pageStr), pageHeight - 8);

                // 中間：ISO 表單編號
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text("JS-FORM-001 Rev.A", pageWidth / 2, pageHeight - 8, { align: 'center' });
            }
        }).save().then(function () {
            document.body.classList.remove('printing-pdf');
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
            document.querySelectorAll('.print-hidden-row').forEach(row => row.classList.remove('print-hidden-row'));
            const remarksContainer = document.getElementById('unified-remarks-container');
            if (remarksContainer) remarksContainer.classList.remove('print-hide-remarks');
            window.showToast("PDF 下載成功！");
        }).catch(function (err) {
            console.error(err);
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
            window.showToast("PDF 生成失敗", "error");
            document.body.classList.remove('printing-pdf');
        });
    }, 800);
};