/* template.js - 2025 Optimized Version */

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

    // 5. [新功能] 手機輸入優化 (針對所有數字相關欄位強制加入 inputmode)
    optimizeMobileInputs();

    // 6. [新功能] 檢查 URL 是否有歷史紀錄 ID，有的話讀取資料
    checkAndLoadHistory();
});

// === [新功能] Mobile Friendly 優化 ===
function optimizeMobileInputs() {
    // 針對常見的數字欄位 ID 或 Class 強制加入 inputmode="decimal"
    const numericSelectors = [
        '#qty-input', '#specialAmount', '#passCount', '#openCount', '#shortCount', // 數量金額
        '#dim-length-input', '#dim-width-input', '#pnl-x', '#pnl-y', // 尺寸排版
        '.table-input' // 電測表格
    ];

    numericSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.setAttribute('inputmode', 'decimal');
            // 如果不是 type="date" 或其他特殊格式，設為 text 配合 inputmode 效果最好
            if (!el.getAttribute('type')) {
                el.setAttribute('type', 'text');
            }
        });
    });

    // 針對 contenteditable 的表格 (出貨檢驗報告)
    document.querySelectorAll('[contenteditable="true"]').forEach(el => {
        // 如果是數據欄位，強制加入 decimal
        if (el.classList.contains('editable-cell') || el.classList.contains('data-field')) {
            el.setAttribute('inputmode', 'decimal');
        }
    });
}

// === [新功能] 歷史紀錄系統 (儲存與讀取) ===
function saveCurrentReportToHistory() {
    // 1. 抓取基本資訊
    const reportType = document.title.replace('駿鑫 ', '');
    const client = document.getElementById('ui-client')?.value || window.reportData.client || '未命名客戶';
    const partno = document.getElementById('ui-partno')?.value || window.reportData.partno || '未命名料號';
    const date = window.reportData.date;
    const filename = window.location.pathname.split('/').pop();

    // 2. 抓取所有欄位資料 (包含 input, select, textarea, contenteditable)
    const formData = {};
    
    // 抓取 Inputs & Selects
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id) {
            if (el.type === 'checkbox' || el.type === 'radio') {
                formData[el.id] = el.checked;
            } else {
                formData[el.id] = el.value;
            }
        }
    });

    // 抓取 contenteditable (出貨檢驗報告數據)
    document.querySelectorAll('[contenteditable="true"][id]').forEach(el => {
        formData[el.id] = el.innerText;
    });

    // 3. 建立紀錄物件
    const record = {
        id: Date.now().toString(), // 使用時間戳當 ID
        timestamp: new Date().toLocaleString(),
        type: reportType,
        page: filename,
        client: client,
        partno: partno,
        data: formData
    };

    // 4. 存入 localStorage (限制最近 20 筆)
    let history = JSON.parse(localStorage.getItem('js_pcb_history') || '[]');
    history.unshift(record); // 加到最前面
    if (history.length > 20) history = history.slice(0, 20); // 只留 20 筆
    localStorage.setItem('js_pcb_history', JSON.stringify(history));
}

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
                        // 觸發 change 事件以連動 UI (如簽名圖檔)
                        el.dispatchEvent(new Event('change')); 
                    } else if (el.isContentEditable) {
                        el.innerText = record.data[id];
                        // 觸發 input 事件以重新計算
                        el.dispatchEvent(new Event('input'));
                    } else {
                        el.value = record.data[id];
                        // 觸發 change/input 事件以連動 UI (如 PCB 規格 toggle)
                        el.dispatchEvent(new Event('change'));
                        el.dispatchEvent(new Event('input'));
                    }
                }
            });
            
            // 特別處理：如果是下拉選單選了「其他」，需要顯示隱藏的輸入框
            document.querySelectorAll('select.toggle-select').forEach(sel => {
                if (sel.value === '其他') {
                    sel.dispatchEvent(new Event('change'));
                }
            });

            window.showToast(`已載入 ${record.client} - ${record.partno} 的紀錄`);
            
            // 移除 URL 參數讓網址乾淨，避免重新整理又重讀
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
    // 讓 inspection-report.html 呼叫自己的同步邏輯
    const pcbSection = document.getElementById('pcb-spec-section');
    if (!pcbSection) return;
    // 這裡只負責觸發通用的同步，具體由頁面內的 JS 處理
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

    // [新功能] 列印前儲存到歷史紀錄
    saveCurrentReportToHistory();

    window.print();
    setTimeout(() => {
        document.querySelectorAll('.print-hidden-row').forEach(row => row.classList.remove('print-hidden-row'));
        if (remarksContainer) remarksContainer.classList.remove('print-hide-remarks');
        const nominalSpecA = document.getElementById('spec-hole1-nominal');
        if (nominalSpecA) nominalSpecA.classList.remove('input-error');
    }, 500);
    return true;
};

// === PDF Logic (Updated for Font Fix) ===
window.handlePDFProcess = function(pageValidator = null) {
    if (typeof html2pdf === 'undefined') { window.showToast("PDF 生成元件尚未載入完成", "error"); return; }
    if (!window.handlePrintProcess(pageValidator, true)) return;

    // [新功能] 生成 PDF 前儲存到歷史紀錄
    saveCurrentReportToHistory();

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

    // [優化] PDF 生成設定：解決掉字問題
    const opt = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            scrollY: 0,
            letterRendering: true, // [關鍵修正] 改善文字渲染
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    document.body.classList.add('printing-pdf');

    setTimeout(() => {
        html2pdf().set(opt).from(element).save().then(function() {
            document.body.classList.remove('printing-pdf');
            if(document.body.contains(overlay)) document.body.removeChild(overlay);
            document.querySelectorAll('.print-hidden-row').forEach(row => row.classList.remove('print-hidden-row'));
            const remarksContainer = document.getElementById('unified-remarks-container');
            if (remarksContainer) remarksContainer.classList.remove('print-hide-remarks');
            window.showToast("PDF 下載成功！");
        }).catch(function(err) {
            console.error(err);
            if(document.body.contains(overlay)) document.body.removeChild(overlay);
            window.showToast("PDF 生成失敗", "error");
            document.body.classList.remove('printing-pdf');
        });
    }, 800);
};