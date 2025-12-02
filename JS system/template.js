/* template.js - 統一管理 Header, Remarks, Print, PDF, Toast 與 共用邏輯 */

// 統一管理報表頭資料
window.reportData = {
    client: "",
    date: "", // 初始化為空，稍後在 DOMContentLoaded 計算當地時間
    partno: "",
    qty: "",
    unit: "PNL",
    cycle: "", 
    cycleInput: "",
};

document.addEventListener("DOMContentLoaded", function() {
    // 1. 初始化日期 (修正時區問題)
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000; // 計算時區偏移毫秒數
    const localISODate = new Date(d.getTime() - offset).toISOString().split('T')[0];
    window.reportData.date = localISODate;

    renderHeader();
    renderRemarks();
    
    // 檢查並啟用簽名圖檔
    const signatureCheckbox = document.getElementById('use-signature-img');
    if (signatureCheckbox && signatureCheckbox.checked) {
        window.toggleSignatures(signatureCheckbox);
    }
    
    initTemplateLogic();
});

// === 0. 全域 Toast 提示訊息系統 ===
window.showToast = function(message, type = 'success') {
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification ' + (type === 'error' ? 'error' : '');
    const icon = type === 'error' ? '⚠️ ' : '✅ ';
    toast.textContent = icon + message;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// === 1. 渲染 Header ===
function renderHeader() {
    const container = document.getElementById("unified-header-container");
    if (!container) return;

    const reportTitle = container.getAttribute("data-title") || "出貨檢驗報告";
    const isSimpleMode = container.getAttribute("data-simple") === "true";
    
    // 使用已修正時區的日期
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
                <input type="text" id="ui-client" class="input-line" placeholder="請輸入" oninput="updateReportData('client', this.value); syncToPrint('print-client', this.value); if (typeof window.checkCompletion === 'function') window.checkCompletion();">
            </div>
            <div class="info-item">
                <span class="label">日期</span>
                <input type="date" id="today-date" class="input-line" value="${today}" onchange="updateReportData('date', this.value); syncToPrint('print-date', this.value); if (typeof window.checkCompletion === 'function') window.checkCompletion();">
            </div>
            <div class="info-item">
                <span class="label">料號</span>
                <input type="text" id="ui-partno" class="input-line" placeholder="請輸入" oninput="updateReportData('partno', this.value); syncToPrint('print-partno', this.value); if (typeof window.checkCompletion === 'function') window.checkCompletion();">
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
            <tr>
                <th>客戶名稱</th>
                <td id="print-client"></td>
                <th>日　　期</th>
                <td id="print-date">${today}</td>
            </tr>
            <tr>
                <th>料　　號</th>
                <td id="print-partno"></td>
                <th>品　　名</th>
                <td id="print-product-name">PCB</td>
            </tr>
            <tr>
                <th>數　　量</th>
                <td id="print-qty"></td>
                <th>週　　期</th>
                <td id="print-cycle"></td>
            </tr>
        </table>
        `;
    }

    container.innerHTML = htmlContent;
    
    if (!isSimpleMode) {
        window.syncToPrint('print-date', today);
    }
}

// === 2. 渲染備註欄位 ===
function renderRemarks() {
    const container = document.getElementById("unified-remarks-container");
    if (!container) return;
    
    const hideSignature = container.getAttribute("data-hide-signature") === "true";

    let html = `
        <div class="remarks-section">
            <div class="label-box">備註</div>
            <textarea class="remarks-input" rows="2" placeholder="請輸入備註..."></textarea>
        </div>
    `;

    if (!hideSignature) {
        html += `
            <div class="signature-control-area">
                <label class="toggle-label">
                    <input type="checkbox" id="use-signature-img" checked onchange="toggleSignatures(this)">
                    <span>電子簽章</span>
                </label>
            </div>
        `;
    }

    container.innerHTML = html;
}

window.toggleSignatures = function(checkbox) {
    if (checkbox.checked) {
        document.body.classList.add('show-signatures');
    } else {
        document.body.classList.remove('show-signatures');
    }
}

// === 3. 共用邏輯 ===
window.updateReportData = function(key, value) {
    if (window.reportData.hasOwnProperty(key)) {
        window.reportData[key] = value;
    }
}

window.syncToPrint = function(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
};

window.syncPcbSpecsToPrint = function(pcbSectionId = 'pcb-spec-section') {
    const pcbSection = document.getElementById(pcbSectionId);
    if (!pcbSection) return;

    pcbSection.querySelectorAll('.toggle-select').forEach(select => {
        const printTargetId = select.getAttribute('data-print-target');
        const inputGroup = document.getElementById(select.getAttribute('data-target'));
        const input = inputGroup ? inputGroup.querySelector('input') : null;
        const target = document.getElementById(printTargetId);
        
        if (target) {
            let val = select.value;
            if (val === '其他' || (inputGroup && inputGroup.style.display !== 'none')) { 
                val = input ? input.value : ''; 
            }
            val = val.replace(/🟢|⚪|🔴|⚫|🔵/g, '').trim();
            target.textContent = val;
        }
    });
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
        
        if (typeof window.checkCompletion === 'function') window.checkCompletion();
        if (typeof window.updateTestResults === 'function') window.updateTestResults();
    }

    window.handleCycleSelect = function(selectEl) {
        const val = selectEl.value;
        window.updateReportData('cycle', val);
        window.updateReportData('cycleInput', '');
        
        if (val === 'has') {
           selectEl.style.display = 'none'; 
           selectEl.value = 'has'; 
           cycleContainer.style.display = 'flex';
           cycleInput.focus();
        } else if (val === 'no') {
           if(printCycle) printCycle.textContent = "N/A";
        }
        if (typeof window.checkCompletion === 'function') window.checkCompletion();
    }

    window.handleCycleInput = function(inputEl) {
        window.updateReportData('cycleInput', inputEl.value);
        if(printCycle) printCycle.textContent = inputEl.value;
        if (typeof window.checkCompletion === 'function') window.checkCompletion();
    }
    
    if(resetBtn) {
        resetBtn.addEventListener('click', function() {
            window.updateReportData('cycle', '');
            window.updateReportData('cycleInput', '');
            cycleInput.value = "";
            cycleContainer.style.display = 'none';
            cycleSelect.style.display = 'block';
            cycleSelect.value = '';
            if(printCycle) printCycle.textContent = "";
            if (typeof window.checkCompletion === 'function') window.checkCompletion();
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

// === 4. 列印流程 ===
window.handlePrintProcess = function(pageValidator = null, onlyValidate = false) {
    let isComplete = true;

    if (typeof window.syncPcbSpecsToPrint === 'function') {
        window.syncPcbSpecsToPrint();
    }

    const basicIds = ['ui-client', 'ui-partno', 'qty-input'];
    basicIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.value.trim() === '') {
                el.classList.add('input-error');
                isComplete = false;
            } else {
                el.classList.remove('input-error');
            }
        }
    });

    const cycleSelect = document.getElementById('cycle-select');
    const cycleInput = document.getElementById('cycle-input');
    
    if (cycleSelect && (window.reportData.cycle === '' || window.reportData.cycle === '請選擇' || window.reportData.cycle === null)) { 
        cycleSelect.classList.add('input-error');
        isComplete = false;
    } else if (window.reportData.cycle === 'has' && window.reportData.cycleInput.trim() === '') {
        if (cycleInput) cycleInput.classList.add('input-error');
        isComplete = false;
    } else {
        if (cycleSelect) cycleSelect.classList.remove('input-error');
        if (cycleInput) cycleInput.classList.remove('input-error');
    }

    if (pageValidator && typeof pageValidator === 'function') {
        if (!pageValidator()) isComplete = false;
    }

    if (!isComplete) {
        window.showToast("請填寫所有標示紅框的必填欄位！", "error");
        return false;
    }

    const remarksInput = document.querySelector('.remarks-input');
    const remarksContainer = document.getElementById('unified-remarks-container');
    if (remarksContainer) {
        if (remarksInput && remarksInput.value.trim() === '') {
            remarksContainer.classList.add('print-hide-remarks');
        } else {
            remarksContainer.classList.remove('print-hide-remarks');
        }
    }

    if (onlyValidate) return true;

    window.print();

    setTimeout(() => {
        document.querySelectorAll('.print-hidden-row').forEach(row => row.classList.remove('print-hidden-row'));
        if (remarksContainer) remarksContainer.classList.remove('print-hide-remarks');
        const nominalSpecA = document.getElementById('spec-hole1-nominal');
        if (nominalSpecA) nominalSpecA.classList.remove('input-error');
    }, 500);

    return true;
};

// === 5. PDF 生成流程 (Timeout 優化 + Loading Overlay) ===
window.handlePDFProcess = function(pageValidator = null) {
    if (typeof html2pdf === 'undefined') {
        window.showToast("PDF 生成元件尚未載入完成", "error");
        return;
    }

    if (!window.handlePrintProcess(pageValidator, true)) return;

    // 建立並顯示 Loading 遮罩
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
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    document.body.classList.add('printing-pdf');

    // 延遲執行生成，確保 Loading 動畫有機會渲染
    setTimeout(() => {
        html2pdf().set(opt).from(element).save().then(function() {
            document.body.classList.remove('printing-pdf');
            
            // 移除遮罩
            if(document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }

            document.querySelectorAll('.print-hidden-row').forEach(row => row.classList.remove('print-hidden-row'));
            const remarksContainer = document.getElementById('unified-remarks-container');
            if (remarksContainer) remarksContainer.classList.remove('print-hide-remarks');
            
            window.showToast("PDF 下載成功！");
        }).catch(function(err) {
            console.error(err);
            
            // 發生錯誤也要移除遮罩
            if(document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
            
            window.showToast("PDF 生成失敗", "error");
            document.body.classList.remove('printing-pdf');
        });
    }, 800);
};