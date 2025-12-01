/* template.js - 修正版：包含基礎驗證函數，解決 Test Report 報錯 */

document.addEventListener("DOMContentLoaded", function() {
    renderHeader();
    renderRemarks();
    initTemplateLogic();
});

// [新增] 基礎驗證列印函數 (Issue 4)
// 這是為了讓 Test Report.html 有預設函數可呼叫，避免報錯
// Inspection Report.html 會用自己的邏輯覆蓋此函數
window.validateAndPrint = function() {
    // 預設行為：直接列印
    window.print();
    return true; 
};

// 全域同步函數
window.syncToPrint = function(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
};

function renderHeader() {
    const container = document.getElementById("unified-header-container");
    if (!container) return;

    const reportTitle = container.getAttribute("data-title") || "出貨檢驗報告";
    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = `
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

        <h3 class="section-title">基本資訊</h3>
        <section class="info-grid">
            <div class="info-item">
                <span class="label">客戶</span>
                <input type="text" id="ui-client" class="input-line" placeholder="請輸入" oninput="syncToPrint('print-client', this.value)">
            </div>
            <div class="info-item">
                <span class="label">日期</span>
                <input type="date" id="today-date" class="input-line" value="${today}" onchange="syncToPrint('print-date', this.value)">
            </div>
            <div class="info-item">
                <span class="label">料號</span>
                <input type="text" id="ui-partno" class="input-line" placeholder="請輸入" oninput="syncToPrint('print-partno', this.value)">
            </div>
            <div class="info-item">
                <span class="label">品名</span>
                <span class="fixed-product-value" id="ui-product-name"></span>
            </div>
            <div class="info-item">
                <span class="label">數量</span>
                <div class="input-group">
                    <input type="text" id="qty-input" class="input-line" placeholder="請輸入" style="flex: 2;">
                    <select id="qty-unit" class="unit-select" style="flex: 1;">
                        <option value="PNL" selected>PNL</option>
                        <option value="PCS">PCS</option>
                    </select>
                </div>
            </div>
            <div class="info-item">
                <span class="label">週期</span>
                <div class="input-group cycle-wrapper">
                    <select id="cycle-select" class="unit-select cycle-dropdown">
                        <option value="" disabled selected hidden>請選擇</option>
                        <option value="no">無週期</option>
                        <option value="has">有週期 (輸入)</option>
                    </select>
                    <div id="cycle-input-container" style="display: none; width: 100%; align-items: center; gap: 5px;">
                        <input type="text" id="cycle-input" class="input-line" placeholder="請輸入週期">
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

function renderRemarks() {
    const container = document.getElementById("unified-remarks-container");
    if (!container) return;
    container.innerHTML = `
        <div class="remarks-section">
            <div class="label-box">備註</div>
            <textarea class="remarks-input" rows="2" placeholder="請輸入備註..."></textarea>
        </div>
    `;
}

function initTemplateLogic() {
    const qtyInput = document.getElementById('qty-input');
    const qtyUnit = document.getElementById('qty-unit');
    const printQty = document.getElementById('print-qty');

    function updateQty() {
        if(printQty) printQty.textContent = (qtyInput.value || '') + ' ' + (qtyUnit.value || '');
    }

    if (qtyInput && qtyUnit) {
        qtyInput.addEventListener('input', function() {
             let rawValue = this.value.replace(/,/g, '').replace(/\D/g, '');
             this.value = rawValue ? parseInt(rawValue).toLocaleString('en-US') : '';
             updateQty();
        });
        qtyUnit.addEventListener('change', updateQty);
    }

    const cycleInput = document.getElementById('cycle-input');
    const cycleSelect = document.getElementById('cycle-select');
    const printCycle = document.getElementById('print-cycle');
    const resetBtn = document.getElementById('reset-cycle-btn');
    const cycleContainer = document.getElementById('cycle-input-container');

    function updateCycle() {
        if (!printCycle) return;
        if (cycleSelect.value === 'no') {
            printCycle.textContent = "N/A";
        } else if (cycleInput.value) {
            printCycle.textContent = cycleInput.value;
        } else {
            printCycle.textContent = "";
        }
    }

    if (cycleSelect && cycleInput) {
        cycleSelect.addEventListener('change', function() {
            if (this.value === 'has') {
               this.style.visibility = 'hidden'; 
               this.style.width = '0';
               cycleContainer.style.display = 'flex';
               cycleInput.focus();
            } else {
               updateCycle();
            }
        });
        cycleInput.addEventListener('input', updateCycle);
        if(resetBtn) {
            resetBtn.addEventListener('click', function() {
                cycleInput.value = "";
                cycleContainer.style.display = 'none';
                cycleSelect.style.visibility = 'visible'; 
                cycleSelect.style.width = '100%';
                cycleSelect.value = 'no';
                updateCycle();
            });
        }
    }
}