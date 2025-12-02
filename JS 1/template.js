/* template.js - 統一管理 Header, Remarks, Print, PDF 與 共用邏輯 */

// 統一管理報表頭資料
window.reportData = {
    client: "",
    date: new Date().toISOString().split('T')[0],
    partno: "",
    qty: "",
    unit: "PNL",
    cycle: "", // 修正：預設為空字串，以強制觸發「請選擇」的驗證
    cycleInput: "",
};

document.addEventListener("DOMContentLoaded", function() {
    renderHeader();
    renderRemarks();
    // 💡 新增：渲染獨立的簽名控制區
    renderSignatureControl();
    
    // 💡 關鍵：DOM 渲染完畢後，立即檢查並啟用簽名圖檔的顯示
    const signatureCheckbox = document.getElementById('use-signature-img');
    if (signatureCheckbox && signatureCheckbox.checked) {
        window.toggleSignatures(signatureCheckbox);
    }
    
    initTemplateLogic();
});

// === 1. 渲染 Header (略，內容不變) ===
function renderHeader() {
    const container = document.getElementById("unified-header-container");
    if (!container) return;
    // ... (renderHeader 內容不變)
    const reportTitle = container.getAttribute("data-title") || "出貨檢驗報告";
    // [優化] 判斷是否為簡易模式 (不顯示輸入框)
    const isSimpleMode = container.getAttribute("data-simple") === "true";
    
    // 初始化日期
    window.reportData.date = new Date().toISOString().split('T')[0];
    const today = window.reportData.date;

    // 1. 基礎標題 HTML
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

    // 2. 只有在非簡易模式下，才加入基本資訊輸入框
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
    
    // 如果有渲染輸入框，才初始化日期同步
    if (!isSimpleMode) {
        window.syncToPrint('print-date', today);
    }
}

// === 2. 渲染備註欄位 (移除簽名切換功能) ===
function renderRemarks() {
    const container = document.getElementById("unified-remarks-container");
    if (!container) return;
    
    // 💡 關鍵修改：移除簽名控制區，只保留備註
    container.innerHTML = `
        <div class="remarks-section">
            <div class="label-box">備註</div>
            <textarea class="remarks-input" rows="2" placeholder="請輸入備註..."></textarea>
        </div>
    `;
}

// === 新增：渲染獨立的簽名控制區 (電腦版在簽名框上，手機版固定底部) ===
function renderSignatureControl() {
    // 1. 找到簽名區塊容器
    const signatureSection = document.querySelector('.signature-section');
    if (!signatureSection) return;

    // 2. 建立控制區 DOM
    const controlContainer = document.createElement('div');
    controlContainer.className = 'signature-control-area';
    controlContainer.innerHTML = `
        <label class="toggle-label">
            <input type="checkbox" id="use-signature-img" checked onchange="toggleSignatures(this)">
            <span>使用簽名圖檔 (列印/PDF)</span>
        </label>
    `;

    // 3. 插入位置：在簽名區塊 (signatureSection) 的 "前面"
    // 這樣在電腦版就會顯示在簽名框的上方；CSS 用 flex-end 讓它靠右 (核准人員上方)
    signatureSection.parentNode.insertBefore(controlContainer, signatureSection);
}


// === 簽名切換邏輯 (內容不變) ===
window.toggleSignatures = function(checkbox) {
    if (checkbox.checked) {
        document.body.classList.add('show-signatures');
    } else {
        document.body.classList.remove('show-signatures');
    }
}

// === 3. 共用變數同步與初始化 (略，內容不變) ===
window.updateReportData = function(key, value) {
    if (window.reportData.hasOwnProperty(key)) {
        window.reportData[key] = value;
    }
}

window.syncToPrint = function(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
};

// [優化] 抽象化 PCB 規格同步邏輯
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
            // 移除顏色符號
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
        // 更新 reportData
        let rawValue = qtyInput.value.replace(/,/g, '');
        window.updateReportData('qty', rawValue);
        window.updateReportData('unit', qtyUnit.value);

        if(printQty) printQty.textContent = (qtyInput.value || '') + ' ' + (qtyUnit.value || '');
        
        // 觸發頁面專屬的完成度檢查 (如果存在)
        if (typeof window.checkCompletion === 'function') {
            window.checkCompletion();
        }
        // 觸發測試報告的 Pass/Fail 更新 (如果存在)
        if (typeof window.updateTestResults === 'function') {
            window.updateTestResults();
        }
    }

    // 處理週期選擇
    window.handleCycleSelect = function(selectEl) {
        const val = selectEl.value;
        window.updateReportData('cycle', val);
        window.updateReportData('cycleInput', '');
        
        if (val === 'has') {
           selectEl.style.display = 'none'; // 使用 display: none 更徹底
           selectEl.value = 'has'; // 確保選單值是 'has'
           cycleContainer.style.display = 'flex';
           cycleInput.focus();
        } else if (val === 'no') {
           if(printCycle) printCycle.textContent = "N/A";
        }
        
        // 觸發頁面專屬的完成度檢查
        if (typeof window.checkCompletion === 'function') {
            window.checkCompletion();
        }
    }

    // 處理週期輸入
    window.handleCycleInput = function(inputEl) {
        window.updateReportData('cycleInput', inputEl.value);
        if(printCycle) printCycle.textContent = inputEl.value;
        if (typeof window.checkCompletion === 'function') {
            window.checkCompletion();
        }
    }
    
    // 重置週期
    if(resetBtn) {
        resetBtn.addEventListener('click', function() {
            window.updateReportData('cycle', 'no');
            window.updateReportData('cycleInput', '');
            cycleInput.value = "";
            cycleContainer.style.display = 'none';
            cycleSelect.style.display = 'block';
            cycleSelect.value = 'no'; // 預設切換到'無週期'
            if(printCycle) printCycle.textContent = "N/A";
            
            // 觸發頁面專屬的完成度檢查
            if (typeof window.checkCompletion === 'function') {
                window.checkCompletion();
            }
        });
    }

    if (qtyInput && qtyUnit) {
        qtyInput.addEventListener('input', function() {
             // 格式化數字 (數量欄位)
             let rawValue = this.value.replace(/,/g, '').replace(/\D/g, '');
             this.value = rawValue ? parseInt(rawValue).toLocaleString('en-US') : '';
             updateQty();
        });
        qtyUnit.addEventListener('change', updateQty);
    }
    
    // 初始載入時，如果 cycleSelect 是 'has'，需要顯示 input
    if (cycleSelect && cycleInput) {
        if (cycleSelect.value === 'has') {
            cycleSelect.style.display = 'none';
            cycleContainer.style.display = 'flex';
        } else if (cycleSelect.value === 'no') {
            if(printCycle) printCycle.textContent = "N/A";
        }
    }
}

// === 4. 統一列印與驗證流程 (包含週期判斷) ===
window.handlePrintProcess = function(pageValidator = null, onlyValidate = false) {
    let isComplete = true;

    // 呼叫 PCB 規格同步函數 (確保列印內容最新)
    if (typeof window.syncPcbSpecsToPrint === 'function') {
        window.syncPcbSpecsToPrint();
    }

    // A. 基礎欄位驗證 (僅在有這些欄位時檢查)
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

    // B. 週期欄位驗證 (使用 reportData 檢查狀態)
    const cycleSelect = document.getElementById('cycle-select');
    const cycleInput = document.getElementById('cycle-input');
    
    // 如果 reportData.cycle 是 'has' (有週期)，但輸入框是空的 -> 擋下
    if (window.reportData.cycle === 'has' && window.reportData.cycleInput.trim() === '') {
        if (cycleInput) cycleInput.classList.add('input-error');
        isComplete = false;
    } 
    // 如果根本還沒選 (預設為 "") -> 擋下
    else if (cycleSelect && (window.reportData.cycle === '' || window.reportData.cycle === '請選擇')) {
        cycleSelect.classList.add('input-error');
        isComplete = false;
    } 
    else {
        // 驗證通過 (例如選了 'no' 或是選了 'has' 且有輸入)
        if (cycleSelect) cycleSelect.classList.remove('input-error');
        if (cycleInput) cycleInput.classList.remove('input-error');
    }

    // C. 執行頁面專屬驗證
    if (pageValidator && typeof pageValidator === 'function') {
        if (!pageValidator()) {
            isComplete = false;
        }
    }

    if (!isComplete) {
        alert("請填寫所有標示紅框的必填欄位！");
        return false;
    }

    // D. 處理備註欄位
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

    // 列印完成後，移除輔助樣式
    setTimeout(() => {
        document.querySelectorAll('.print-hidden-row').forEach(row => row.classList.remove('print-hidden-row'));
        if (remarksContainer) remarksContainer.classList.remove('print-hide-remarks');
        const nominalSpecA = document.getElementById('spec-hole1-nominal');
        if (nominalSpecA) nominalSpecA.classList.remove('input-error');
    }, 500);

    return true;
};

// === 5. 統一 PDF 生成流程 (略，內容不變) ===
window.handlePDFProcess = function(pageValidator = null) {
    if (typeof html2pdf === 'undefined') {
        alert("PDF 生成元件尚未載入完成");
        return;
    }

    if (!window.handlePrintProcess(pageValidator, true)) return;

    // 檔名邏輯
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
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            scrollY: 0 
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    document.body.classList.add('printing-pdf');

    html2pdf().set(opt).from(element).save().then(function() {
        document.body.classList.remove('printing-pdf');
        document.querySelectorAll('.print-hidden-row').forEach(row => row.classList.remove('print-hidden-row'));
        const remarksContainer = document.getElementById('unified-remarks-container');
        if (remarksContainer) remarksContainer.classList.remove('print-hide-remarks');
    }).catch(function(err) {
        console.error(err);
        alert("PDF 生成失敗：" + err.message);
        document.body.classList.remove('printing-pdf');
    });
};