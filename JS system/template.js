/* template.js - 統一表頭、基本資訊與備註生成器 (含修正版) */

document.addEventListener("DOMContentLoaded", function() {
    injectPrintStyles(); 
    renderHeader();
    renderRemarks();
    initTemplateLogic();
});

// === 修正 2: 注入列印專用樣式 (新增尺寸排版置中) ===
function injectPrintStyles() {
    const styleId = 'print-dynamic-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .print-text-only { display: none; }
            @media print {
                .info-item {
                    display: flex !important;
                    align-items: center !important; 
                    justify-content: flex-start !important; 
                }
                
                /* 一般輸入框靠左 */
                .input-line, .print-text-only, .fixed-product-value {
                    text-align: left !important;
                    padding: 0 0 0 5px !important; 
                    margin: 0 !important;
                    border: none !important;
                    height: auto !important;
                    line-height: 1.5 !important; 
                    display: block !important;
                }
                
                /* [修正點 2] 尺寸與排版 (split-input) 強制置中 */
                .split-input {
                    text-align: center !important;
                    padding: 0 !important;
                }

                .print-text-only { 
                    display: block !important; 
                    color: #000;
                    width: auto !important; 
                }
                .no-print-input { display: none !important; }
            }
        `;
        document.head.appendChild(style);
    }
}

// === 1. 渲染表頭與基本資訊 ===
function renderHeader() {
    const container = document.getElementById("unified-header-container");
    if (!container) return;

    const reportTitle = container.getAttribute("data-title") || "出貨檢驗報告";

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

        <h3 class="section-title">基本資訊</h3>

        <section class="info-grid">
            <div class="info-item">
                <span class="label">客戶</span>
                <input type="text" class="input-line" placeholder="請輸入">
            </div>

            <div class="info-item">
                <span class="label">日期</span>
                <input type="date" id="today-date" class="input-line">
            </div>

            <div class="info-item">
                <span class="label">料號</span>
                <input type="text" class="input-line" placeholder="請輸入">
            </div>

            <div class="info-item">
                <span class="label">品名</span>
                <span class="fixed-product-value"></span>
            </div>

            <div class="info-item">
                <span class="label">數量</span>
                
                <span id="qty-print-display" class="print-text-only"></span>

                <div class="input-group no-print-input">
                    <input type="text" id="qty-input" class="input-line" placeholder="請輸入" style="flex: 2; text-align: left;">
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
    `;
}

// === 2. 渲染備註區 ===
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

// === 3. 初始化邏輯功能 ===
function initTemplateLogic() {
    const dateInput = document.getElementById('today-date');
    if (dateInput) dateInput.valueAsDate = new Date();

    const cycleSelect = document.getElementById('cycle-select');
    const cycleContainer = document.getElementById('cycle-input-container');
    const cycleInput = document.getElementById('cycle-input');
    const resetBtn = document.getElementById('reset-cycle-btn');

    if (cycleSelect && cycleContainer && cycleInput && resetBtn) {
        cycleSelect.addEventListener('change', function() {
            if (this.value === 'has') {
                // [修正點]：將 display: 'none' 改為 visibility: 'hidden' + width: '0'
                this.style.visibility = 'hidden'; 
                this.style.width = '0';
                this.style.padding = '0'; // 清除 padding
                
                cycleContainer.style.display = 'flex';
                cycleInput.focus();
            } else {
                // 確保切換到 'no' 或 '請選擇' 時，恢復 Select 正常顯示
                this.style.visibility = 'visible';
                this.style.width = '100%';
                this.style.padding = '4px 8px'; // 恢復 input-line 的 padding
            }
        });

        resetBtn.addEventListener('click', function() {
            cycleInput.value = "";
            cycleContainer.style.display = 'none';
            
            // [修正點]：恢復 Select 的顯示屬性
            cycleSelect.style.display = 'block';
            cycleSelect.style.visibility = 'visible';
            cycleSelect.style.width = '100%';
            cycleSelect.style.padding = '4px 8px'; // 恢復 input-line 的 padding
            
            cycleSelect.value = 'none'; // 將選單值設為 '無週期' 對應的 'no'
        });
    }

    const qtyInput = document.getElementById('qty-input');
    const qtyUnit = document.getElementById('qty-unit');
    const qtyPrintDisplay = document.getElementById('qty-print-display');

    if (qtyInput && qtyUnit && qtyPrintDisplay) {
        const syncPrintText = () => {
            const val = qtyInput.value;
            const unit = qtyUnit.value;
            qtyPrintDisplay.textContent = val ? `${val} ${unit}` : '';
        };

        qtyInput.addEventListener('input', function() {
            let rawValue = this.value.replace(/,/g, '').replace(/\D/g, '');
            if (rawValue) {
                this.value = parseInt(rawValue).toLocaleString('en-US');
            } else {
                this.value = '';
            }
            syncPrintText();
        });

        qtyUnit.addEventListener('change', syncPrintText);
    }
}

// === 4. 列印前驗證功能 (修正：只驗證，不列印) ===
function validateAndPrint() {
    let isValid = true;
    let firstErrorElement = null;

    // 排除 Test Report 的唯讀欄位
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([disabled]):not([readonly]):not(#passCount):not(#openCount):not(#shortCount), select:not([disabled])');

    inputs.forEach(el => {
        if (el.offsetParent === null) return;

        const val = el.value.trim();
        let isError = false;

        // 確保非自訂輸入的 select/input 不為空
        if (val === "" || val === "none" || val === "請選擇") {
            isError = true;
        }

        if (isError) {
            isValid = false;
            el.classList.add('input-error');

            if (!firstErrorElement) firstErrorElement = el;

            // 移除錯誤標記的事件監聽
            el.addEventListener('input', function() {
                if (this.value.trim() !== "" && this.value !== "none") {
                    this.classList.remove('input-error');
                }
            }, { once: true });
            
            el.addEventListener('change', function() {
                if (this.value !== "" && this.value !== "none" && this.value !== "請選擇") {
                    this.classList.remove('input-error');
                }
            }, { once: true });
        } else {
            el.classList.remove('input-error');
        }
    });

    if (isValid) {
        // 驗證成功，返回 true
        return true; 
    } else {
        alert("⚠️ 尚有欄位未填寫或未選擇！\n請依紅框提示完成輸入後再列印。");
        if (firstErrorElement) {
            firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorElement.focus();
        }
        // 驗證失敗，返回 false
        return false;
    }
}
