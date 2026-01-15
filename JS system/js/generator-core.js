function formatNumber(input) {
    var value = input.value.replace(/\D/g, "");
    if (value) {
        input.value = Number(value).toLocaleString("en-US");
    } else {
        input.value = "";
    }
}

function checkCustom(selectEl) {
    if (selectEl.value === 'custom') {
        var customDivId = selectEl.id + '_custom_div';
        var customDiv = document.getElementById(customDivId);
        var customInput = document.getElementById(selectEl.id + '_custom');
        if (customDiv) {
            selectEl.style.display = 'none';

            // 電腦版：隱藏按鈕群組
            const btnGroup = document.getElementById(`btn-group-${selectEl.id}`);
            if (btnGroup) btnGroup.classList.add('hidden');

            customDiv.style.display = 'flex';
            // 自動聚焦
            if (customInput) {
                setTimeout(() => customInput.focus(), 50);
            }
        }
        return true;
    }
    return false;
}

function resetSelect(selectId) {
    var selectEl = document.getElementById(selectId);
    var customDiv = document.getElementById(selectId + '_custom_div');
    var customInput = document.getElementById(selectId + '_custom');
    if (selectEl && customDiv) {
        customDiv.style.display = 'none';
        customInput.value = '';

        // [修正] 恢復 Select 顯示邏輯
        // 1. 先清除 inline style，讓 CSS 決定 (手機 block, 電腦 none)
        selectEl.style.display = '';

        // 2. 特殊例外：Qty 在電腦版必須是 block (因為 CSS 設定 input-line-custom 為 none)
        if (selectId === 'qty') {
            selectEl.style.setProperty('display', 'block', 'important');
        }

        // 3. 恢復 Select 值
        selectEl.value = '-';

        // 4. 恢復按鈕群組顯示 (電腦版)
        const btnGroup = document.getElementById(`btn-group-${selectId}`);
        if (btnGroup) btnGroup.classList.remove('hidden');

        updateStates();
    }
}

function onSelectChange(el) {
    checkCustom(el);
    updateStates();
}

// [修改] 生成文字 + 複製 + 存檔 (若有料號)
function generateAndCopyText() {
    generateText();
    // 只要有望有填料號就儲存紀錄，不需客戶名稱
    if (getValue("partNo")) {
        if (typeof saveCurrentReportToHistory === 'function') saveCurrentReportToHistory();
    }
    copyText(true); // 傳入 true 避免 copyText 再次重複儲存
}

// [新增] 專門給「生成文字」按鈕用的函式，也會觸發存檔
function generateTextAndSave() {
    generateText();
    if (getValue("partNo")) {
        if (typeof saveCurrentReportToHistory === 'function') saveCurrentReportToHistory();
        window.showToast("規格已生成並儲存");
    }
}

// [修改] 清空重填功能：改為重新整理頁面 (並移除 URL 參數以防讀取歷史紀錄)
function resetAllFields() {
    if (!confirm('確定要清空所有欄位嗎？')) return;

    // 使用 href split 來確保保留 protocol 和 drive letter (針對 file:// 協定)
    // 這樣可以兼容 file: 和 http: 協議
    var cleanUrl = window.location.href.split('?')[0];
    window.location.href = cleanUrl;
}

// === 新增：UI 初始化與互動邏輯 ===
const GENERAL_SELECT_IDS = [
    'material', 'layers', 'thickness', 'innerCu', 'outerCu',
    'solderMask', 'legendColor', 'finish', 'goldFinger', 'testMethod',
    'ulOption', 'dateCodeOption', 'shippingMethod', 'panelizingMethod'
];

function initDesktopOptions() {
    const qtySelect = document.getElementById('qty');
    if (qtySelect) {
        qtySelect.style.setProperty('display', 'block', 'important');
    }

    GENERAL_SELECT_IDS.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        const wrapper = select.parentNode;
        const btnGroup = document.createElement('div');
        btnGroup.className = 'desktop-option-group';
        btnGroup.id = `btn-group-${id}`;

        Array.from(select.options).forEach(opt => {
            if (opt.value === '-' || opt.text === '-') return;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'option-btn';

            let btnText = opt.text;
            if (id === 'thickness') {
                btnText = btnText.replace(' mm', '');
            }
            btn.textContent = btnText;
            btn.dataset.value = opt.value;

            if (opt.value === 'custom') {
                btn.textContent = '自行輸入';
            }

            btn.onclick = () => {
                select.value = opt.value;
                onSelectChange(select);
            };

            btnGroup.appendChild(btn);
        });

        wrapper.insertBefore(btnGroup, select);
    });
}

function initSpecialProcessOptions() {
    const srcSelect = document.getElementById('special1');
    if (!srcSelect) return;

    const options = Array.from(srcSelect.options)
        .filter(opt => opt.value !== '-' && opt.value !== 'custom')
        .map(opt => ({ text: opt.text, value: opt.value }));

    const refItem = document.getElementById('special1').closest('.info-item-custom').parentNode;
    const section = refItem.parentNode;

    const newRow = document.createElement('div');
    newRow.className = 'info-item-custom';
    newRow.style.height = 'auto';
    newRow.innerHTML = `
  <span class="label">特殊製程</span>
  <div class="info-content-wrap">
      <div class="special-process-container" id="special-multi-container">
          <!-- JS 生成 -->
      </div>
      <input type="hidden" id="specialProcess_full_list" />
  </div>
`;

    section.insertBefore(newRow, refItem);

    const container = newRow.querySelector('.special-process-container');
    const hiddenInput = newRow.querySelector('#specialProcess_full_list');

    hiddenInput.addEventListener('input', function () {
        try {
            const values = JSON.parse(this.value || '[]');
            const btns = container.querySelectorAll('.option-btn');
            btns.forEach(btn => {
                if (values.includes(btn.dataset.value)) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
            syncSpecialProcessToSelects(true);
        } catch (e) { console.error('Error parsing special process history', e); }
    });

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.textContent = opt.text;
        btn.dataset.value = opt.value;
        btn.onclick = () => toggleSpecialOption(btn);
        container.appendChild(btn);
    });

    ['special1', 'special2', 'special3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const wrap = el.closest('.field-group-wrap');
            if (wrap) wrap.classList.add('original-special-row');
        }
    });
}

function toggleSpecialOption(btn) {
    btn.classList.toggle('selected');
    syncSpecialProcessToSelects();
}

function syncSpecialProcessToSelects(skipHiddenUpdate = false) {
    const selectedBtns = document.querySelectorAll('#special-multi-container .option-btn.selected');
    const values = Array.from(selectedBtns).map(b => b.dataset.value);

    if (!skipHiddenUpdate) {
        const hiddenInput = document.getElementById('specialProcess_full_list');
        if (hiddenInput) hiddenInput.value = JSON.stringify(values);
    }

    const targets = ['special1', 'special2', 'special3'];

    targets.forEach((id, index) => {
        const select = document.getElementById(id);
        if (select) {
            if (index < values.length) {
                select.value = values[index];
            } else {
                select.value = '-';
            }
        }
    });

    updateStates();
}

function updateButtonStates() {
    GENERAL_SELECT_IDS.forEach(id => {
        const select = document.getElementById(id);
        const btnGroup = document.getElementById(`btn-group-${id}`);
        if (!select || !btnGroup) return;

        const currentVal = select.value;

        if (currentVal === 'custom') {
            btnGroup.classList.add('hidden');
        } else {
            btnGroup.classList.remove('hidden');
        }

        Array.from(btnGroup.children).forEach(btn => {
            if (btn.dataset.value === currentVal) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }

            const opt = Array.from(select.options).find(o => o.value === btn.dataset.value);
            if ((opt && opt.disabled) || select.disabled) {
                btn.classList.add('disabled');
                btn.disabled = true;
            } else {
                btn.classList.remove('disabled');
                btn.disabled = false;
            }
        });
    });

    ['special1', 'special2', 'special3'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel && sel.disabled && sel.value !== '-' && sel.value !== 'custom') {
            const btn = document.querySelector(`#special-multi-container .option-btn[data-value="${sel.value}"]`);
            if (btn && !btn.classList.contains('selected')) {
                btn.classList.add('selected');
                syncSpecialProcessToSelects();
            }
        }
    });
}

const SPEC_RULES = {
    locks: [
        {
            rule: (material, layers) => ['六層板', '八層板', '十層板'].includes(layers),
            target: 'finish',
            action: (sel) => { sel.value = '化金 2u'; sel.disabled = true; document.getElementById('finishWarning').style.display = 'block'; }
        },
        {
            rule: (material, layers) => ['六層板', '八層板', '十層板'].includes(layers),
            target: 'special1',
            action: (sel) => { sel.value = '樹脂塞孔'; sel.disabled = true; document.getElementById('special1Warning').style.display = 'block'; }
        },
    ],
    restrictions: [
        {
            rule: (material) => material === 'FR-1',
            targets: [
                { id: 'layers', disable_values: ['雙面板', '四層板', '六層板', '八層板', '十層板'], default_value: '單面板', warning: 'materialWarning' },
                { id: 'thickness', disable_values: ['0.4 mm', '0.6 mm', '0.8 mm', '1.0 mm', '1.2 mm', '2.0 mm', '2.4 mm', '3.0 mm', '3.2 mm'], default_value: '1.6 mm' },
                { id: 'outerCu', disable_values: ['2 oz', '3 oz'], default_value: '1 oz' },
                { id: 'goldFinger', disable_all: true, default_value: '-' },
                { id: 'special1', disable_all: true, default_value: '-' },
                { id: 'special2', disable_all: true, default_value: '-' },
                { id: 'special3', disable_all: true, default_value: '-' },
                { id: 'innerCu', disable_all: true, default_value: '-', warning: 'innerCuWarning' }
            ]
        },
        {
            rule: (material, layers) => ['單面板', '雙面板'].includes(layers),
            targets: [
                { id: 'innerCu', disable_all: true, default_value: '-', warning: 'innerCuWarning' }
            ]
        },
        {
            rule: (material, layers) => ['四層板', '六層板', '八層板', '十層板'].includes(layers),
            targets: [
                { id: 'thickness', disable_values: ['0.4 mm'], warning: 'thicknessWarning' }
            ]
        },
        {
            rule: (material, layers) => ['八層板', '十層板'].includes(layers),
            targets: [
                { id: 'thickness', disable_values: ['0.4 mm', '0.6 mm'], warning: 'thicknessWarning' }
            ]
        }
    ],
    defaults: [
        {
            rule: (material, layers) => layers !== '單面板' && layers !== '雙面板' && layers !== '-' && layers !== 'custom',
            target: 'innerCu',
            action: (sel, currentVal) => { if (currentVal === '-' || currentVal === '') sel.value = '0.5 oz'; }
        }
    ]
};

function updateStates() {
    const currentValues = {
        material: getValue("material"),
        layers: getValue("layers"),
        thickness: getValue("thickness"),
        innerCu: getValue("innerCu"),
        finish: getValue("finish"),
        special1: getValue("special1")
    };

    document.querySelectorAll('select').forEach(sel => {
        if (sel.id.startsWith('special') || sel.id === 'layers' || sel.id === 'thickness' || sel.id === 'innerCu' || sel.id === 'finish' || sel.id === 'outerCu' || sel.id === 'goldFinger' || sel.id === 'testMethod') {
            sel.disabled = false;
            Array.from(sel.options).forEach(opt => opt.disabled = false);
        }
    });
    document.querySelectorAll('.warning').forEach(warn => warn.style.display = 'none');

    SPEC_RULES.restrictions.forEach(restriction => {
        if (restriction.rule(currentValues.material, currentValues.layers)) {
            restriction.targets.forEach(target => {
                const sel = document.getElementById(target.id);
                if (!sel || checkCustom(sel)) return;

                if (target.warning) {
                    const warnEl = document.getElementById(target.warning);
                    if (warnEl) warnEl.style.display = 'block';
                }

                if (target.disable_all) {
                    sel.disabled = true;
                } else if (target.disable_values) {
                    target.disable_values.forEach(val => {
                        const opt = sel.querySelector(`option[value="${val}"]`);
                        if (opt) opt.disabled = true;
                    });
                }

                const currentOpt = sel.options[sel.selectedIndex];
                if (currentOpt && currentOpt.disabled && sel.value !== 'custom') {
                    sel.value = target.default_value;
                }
            });
        }
    });

    const thickness = getValue("thickness");
    if (thickness === "0.4 mm" && currentValues.material !== "FR-1") {
        const thicknessOpt = document.getElementById("thickness").options[document.getElementById("thickness").selectedIndex];
        if (thicknessOpt && !thicknessOpt.disabled) {
            document.getElementById('thicknessWarning').style.display = 'block';
        }
    }

    SPEC_RULES.locks.forEach(lock => {
        const sel = document.getElementById(lock.target);
        if (lock.rule(currentValues.material, currentValues.layers) && !checkCustom(sel)) {
            lock.action(sel);
        }
    });

    SPEC_RULES.defaults.forEach(defaultRule => {
        const sel = document.getElementById(defaultRule.target);
        if (defaultRule.rule(currentValues.material, currentValues.layers) && !checkCustom(sel)) {
            defaultRule.action(sel, getValue(defaultRule.target));
        }
    });

    if (typeof updateButtonStates === 'function') {
        updateButtonStates();
    }

    const shippingMethod = getValue("shippingMethod");
    const panelWrapper = document.getElementById("panelizingMethod_wrapper");
    const panelTool = document.getElementById("panelization_tool");
    if (shippingMethod === "連片出貨") {
        panelWrapper.style.display = "block";
        const panelMethod = getValue("panelizingMethod");
        if (panelMethod === "工程代連片" || panelMethod === "工程代排版") {
            panelTool.style.display = "block";
            if (typeof updatePanelPreview === 'function') updatePanelPreview();
        } else {
            panelTool.style.display = "none";
        }
    } else {
        panelWrapper.style.display = "none";
        panelTool.style.display = "none";
        resetSelect('panelizingMethod');
    }
}

function trim(str) {
    return str.replace(/^\s+|\s+$/g, "");
}

function getValue(id) {
    var el = document.getElementById(id);
    if (!el) return "";

    if (el.tagName === 'SELECT' && el.value === 'custom') {
        var customInput = document.getElementById(id + '_custom');
        if (customInput) {
            var val = trim(customInput.value);
            return val || "";
        }
    } else if (id === 'specialAmount') {
        var rawVal = trim(el.value || "");
        return rawVal.replace(/,/g, "") || "";
    }

    var v = trim(el.value);
    return v || "";
}

function generateText() {
    var partNo = getValue("partNo");
    var material = getValue("material");
    var layers = getValue("layers");
    var thickness = getValue("thickness");
    var innerCu = getValue("innerCu");
    var outerCu = getValue("outerCu");
    var solderMask = getValue("solderMask");
    var legendColor = getValue("legendColor");
    var finish = getValue("finish");
    var goldFinger = getValue("goldFinger");
    var testMethod = getValue("testMethod");
    var qty = getValue("qty");
    var specialAmount = getValue("specialAmount");

    var specials = [];
    var selectedBtns = document.querySelectorAll('#special-multi-container .option-btn.selected');
    if (selectedBtns.length > 0) {
        selectedBtns.forEach(btn => specials.push(btn.dataset.value));
    } else {
        var specialsIds = ["special1", "special2", "special3"];
        for (var i = 0; i < specialsIds.length; i++) {
            var v = getValue(specialsIds[i]);
            if (v && v !== "-" && v !== "請選擇") specials.push(v);
        }
        specials = [...new Set(specials)];
    }

    var remarksEl = document.querySelector('.remarks-input');
    var remark = remarksEl ? trim(remarksEl.value) : "";

    var lines = [
        "料號：" + (partNo || "-"),
        "板材：" + (material || "-"),
        "層別：" + (layers || "-"),
        "成品板厚：" + (thickness || "-")
    ];

    if (layers !== "單面板" && layers !== "雙面板" && layers !== "" && layers !== "-") {
        lines.push("內層銅厚：" + (innerCu || "-"));
    }

    lines.push(
        "外層銅厚：" + (outerCu || "-"),
        "防焊顏色：" + (solderMask || "-"),
        "文字顏色：" + (legendColor || "-"),
        "表面處理：" + (finish || "-")
    );

    if (goldFinger && goldFinger !== "-" && goldFinger !== "請選擇") {
        lines.push("金(錫)手指：" + goldFinger);
    }

    if (testMethod && testMethod !== "-" && testMethod !== "請選擇") {
        lines.push("電性測試：" + testMethod);
    }

    lines.push("數量(出貨片)：" + (qty || "-"));

    // [優化] 訂單備註在數量下方
    if (remark) {
        lines.push("訂單備註：" + remark);
    }

    if (specials.length > 0) {
        var uniqueSpecials = Array.from(new Set(specials));
        lines.push("特殊製程：" + uniqueSpecials.join("、"));
    }

    if (specialAmount) {
        lines.push("訂單金額：" + Number(specialAmount).toLocaleString("en-US") + "元");
    }

    var dimLength = getValue("dimLength");
    var dimWidth = getValue("dimWidth");
    var shippingMethod = getValue("shippingMethod");
    var engRemarks = [];

    var ulOption = getValue("ulOption");
    if (ulOption && ulOption !== "-") {
        engRemarks.push("UL標記：" + ulOption);
    }

    var dateCodeOption = getValue("dateCodeOption");
    if (dateCodeOption && dateCodeOption !== "-") {
        engRemarks.push("週期標記：" + dateCodeOption);
    }

    if (shippingMethod && shippingMethod !== "-" && shippingMethod !== "請選擇") {
        engRemarks.push("出貨方式：" + shippingMethod);

        if (shippingMethod === "連片出貨") {
            var panelizingMethod = getValue("panelizingMethod");
            if (panelizingMethod && panelizingMethod !== "-" && panelizingMethod !== "請選擇") {
                engRemarks.push("連片方式：" + panelizingMethod);

                if (panelizingMethod === "工程代連片" || panelizingMethod === "工程代排版") {
                    var singleX = getValue("panelSingleX");
                    var singleY = getValue("panelSingleY");
                    var layoutX = getValue("panelLayoutX") || "1";
                    var layoutY = getValue("panelLayoutY") || "1";
                    var spacingX = getValue("panelSpacingX") || "0";
                    var spacingY = getValue("panelSpacingY") || "0";
                    var breakPos = document.getElementById("panelBreakPos").value;
                    var breakWidth = getValue("panelBreakWidth") || "0";
                    var resultSize = document.getElementById("panelResultSize").textContent;

                    var breakPosText = { "none": "無", "lr": "左右", "tb": "上下", "all": "四周" }[breakPos] || "四周";

                    if (singleX && singleY) {
                        engRemarks.push("單片尺寸：" + singleX + " × " + singleY + " mm");
                        engRemarks.push("排版方式：" + layoutX + " × " + layoutY);
                        engRemarks.push("間距：X=" + spacingX + " / Y=" + spacingY + " mm");
                        engRemarks.push("折斷邊：" + breakPosText + " " + breakWidth + " mm");
                        engRemarks.push("排版後尺寸：" + resultSize);
                    }
                }
            }
        }
    }

    var engRemarkInput = document.getElementById("engRemarkInput");
    var engRemark = engRemarkInput ? engRemarkInput.value.trim() : "";
    if (engRemark) {
        engRemarks.push("工程備註：" + engRemark);
    }

    if (engRemarks.length > 0) {
        lines.push("", "【工程製作說明】");
        lines = lines.concat(engRemarks);
    }

    var resultText = lines.join("\n");
    document.getElementById("output-text").value = resultText;

    // 這裡我們不自動加時間與備註，因為已經加在lines裡了。
    // 注意：原程式碼在 generateText 底部有重複加入備註與時間的邏輯 (line 1910)，要整併。
    // 上面的代碼已經將備註與工程說明加入 lines。
    // 時間戳記通常不需要在「生成的規格」裡，而是顯示在 UI 或 Log。
    // 但原程式碼在 resultText 之後又加了 timeStr 和 remark。
    // 使用者的需求是「訂單備註在數量下方」，所以我已將 remark 移入 lines。
    // 時間戳記保留或移除？原代碼 msg = timeStr + "\n" + msg;
    // 假設使用者想要時間戳記。
    /*
    var now = new Date();
    var timeStr = now.getFullYear() + "/" +
        (now.getMonth() + 1).toString().padStart(2, '0') + "/" +
        now.getDate().toString().padStart(2, '0') + " " +
        now.getHours().toString().padStart(2, '0') + ":" +
        now.getMinutes().toString().padStart(2, '0');
    
    // 如果需要時間，可以加在最前面
    // lines.unshift(timeStr);
    */
    // 為了保持輸出乾淨，暫不加時間戳記到 text area value，除非這是歷史紀錄用途。
    // 原代碼 1916 行把 msg 寫回 output-text。
    // 我們使用 resultText 即可。
}

async function copyText(skipSave = false) {
    var output = document.getElementById("output-text");

    if (!output.value) {
        generateText();
        if (!output.value) {
            window.showToast("請先完成規格輸入！", "error");
            return;
        }
    }

    if (!skipSave && getValue("partNo")) {
        if (typeof saveCurrentReportToHistory === 'function') saveCurrentReportToHistory();
    }

    output.select();
    output.setSelectionRange(0, 99999);

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(output.value).then(() => {
                window.showToast("文字訊息已複製到剪貼簿！");
            }).catch(err => {
                fallbackCopy();
            });
        } else {
            fallbackCopy();
        }
    } catch (err) {
        fallbackCopy();
    }
}

function fallbackCopy() {
    try {
        document.execCommand("copy");
        window.showToast("文字訊息已複製到剪貼簿！");
    } catch (err) {
        window.showToast("複製失敗，請手動複製", "error");
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // 初始化 Deep Mode Toggle (如果有的話)
    const darkModeBtn = document.getElementById('dark-mode-toggle');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            // 儲存偏好
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('js-pcb-theme', isDark ? 'dark' : 'light');
            darkModeBtn.textContent = isDark ? '☀️' : '🌙';
        });

        // 載入偏好
        const savedTheme = localStorage.getItem('js-pcb-theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            darkModeBtn.textContent = '☀️';
        }
    }

    initDesktopOptions();
    initSpecialProcessOptions();

    document.querySelectorAll('.custom-input-wrapper input').forEach(input => {
        input.addEventListener('blur', function () {
            if (this.value.trim() === '') {
                const selectId = this.id.replace('_custom', '');
                resetSelect(selectId);
            }
        });
    });
    updateStates();
});

// [新增] 下載 PDF 功能
// [新增] 下載 PDF 功能 (正式表格版)
async function downloadPDF() {
    if (!window.jspdf) {
        alert("PDF 元件尚未載入，請稍後再試或是重新整理頁面。");
        return;
    }

    if (typeof window.showToast === 'function') {
        window.showToast("正在生成正式 PDF 報表...", "info");
    }

    // 1. 填寫 PDF 表格資料
    document.getElementById("pdf-partNo").textContent = getValue("partNo") || "-";

    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    document.getElementById("pdf-date").textContent = dateStr;

    document.getElementById("pdf-material").textContent = getValue("material") || "-";
    document.getElementById("pdf-layers").textContent = getValue("layers") || "-";
    document.getElementById("pdf-thickness").textContent = getValue("thickness") || "-";
    document.getElementById("pdf-finish").textContent = getValue("finish") || "-";
    document.getElementById("pdf-innerCu").textContent = getValue("innerCu") || "-";
    document.getElementById("pdf-outerCu").textContent = getValue("outerCu") || "-";
    document.getElementById("pdf-solderMask").textContent = getValue("solderMask") || "-";
    document.getElementById("pdf-legendColor").textContent = getValue("legendColor") || "-";
    document.getElementById("pdf-goldFinger").textContent = getValue("goldFinger") || "-";
    document.getElementById("pdf-testMethod").textContent = getValue("testMethod") || "-";
    document.getElementById("pdf-qty").textContent = getValue("qty") || "-";
    document.getElementById("pdf-amount").textContent = getValue("specialAmount") ? (Number(getValue("specialAmount").replace(/,/g, "")).toLocaleString() + " 元") : "-";

    // 特殊製程
    let specials = [];
    document.querySelectorAll('#special-multi-container .option-btn.selected').forEach(btn => specials.push(btn.dataset.value));
    if (specials.length === 0) {
        ["special1", "special2", "special3"].forEach(id => {
            let v = getValue(id);
            if (v && v !== "-" && v !== "請選擇") specials.push(v);
        });
        specials = [...new Set(specials)];
    }
    document.getElementById("pdf-specials").textContent = specials.length > 0 ? specials.join("、") : "無";

    // 備註
    const remarksEl = document.querySelector('.remarks-input');
    document.getElementById("pdf-remark").textContent = remarksEl ? remarksEl.value : "";

    // 工程資訊
    document.getElementById("pdf-ul").textContent = getValue("ulOption") || "-";
    document.getElementById("pdf-datecode").textContent = getValue("dateCodeOption") || "-";

    const shippingMethod = getValue("shippingMethod");
    document.getElementById("pdf-shipping").textContent = shippingMethod || "-";

    const panelizingMethod = getValue("panelizingMethod");
    document.getElementById("pdf-panel-method").textContent = panelizingMethod || "-";

    const engRemarkInput = document.getElementById("engRemarkInput");
    document.getElementById("pdf-eng-remark").textContent = engRemarkInput ? engRemarkInput.value : "";

    // 排版詳情與圖片
    const pdfPanelContainer = document.getElementById("pdf-panel-drawing-container");
    const pdfPanelImg = document.getElementById("pdf-panel-img");
    const pdfPanelDetails = document.getElementById("pdf-panel-details");

    let panelDetailsText = "-";

    if (shippingMethod === "連片出貨" && (panelizingMethod === "工程代連片" || panelizingMethod === "工程代排版")) {
        // 填寫排版文字詳情
        const singleX = getValue("panelSingleX");
        const singleY = getValue("panelSingleY");
        const layoutX = getValue("panelLayoutX") || "1";
        const layoutY = getValue("panelLayoutY") || "1";
        const breakPos = document.getElementById("panelBreakPos").value;
        const breakPosText = { "none": "無", "lr": "左右", "tb": "上下", "all": "四周" }[breakPos] || "四周";
        const breakWidth = getValue("panelBreakWidth") || "0";
        const resultSize = document.getElementById("panelResultSize").textContent;

        // [Modified] User request: Spacing info in PDF
        const spacingX = getValue("panelSpacingX") || "0";
        const spacingY = getValue("panelSpacingY") || "0";
        const spacingText = (spacingX !== "0" || spacingY !== "0") ? ` | 間距: ${spacingX}x${spacingY}mm` : "";

        panelDetailsText = `單片: ${singleX}x${singleY}mm | 排版: ${layoutX}x${layoutY}${spacingText} | 折斷邊: ${breakPosText} ${breakWidth}mm | 總尺寸: ${resultSize}`;

        // 處理圖片
        const sourceCanvas = document.getElementById("panelPreviewCanvas");
        if (sourceCanvas) {
            try {
                // [Modified] 暫時提高 Canvas 解析度以獲得清晰的 PDF 圖片
                const originalWidth = sourceCanvas.width;
                const originalHeight = sourceCanvas.height;

                // 設定高解析度 (例如寬度 2000px，高度按比例或固定)
                sourceCanvas.width = 2000;
                sourceCanvas.height = 1200; // 稍微寬一點的比例適合排版圖

                // [Modified] 切換到輸出模式 (白底黑線 + 尺寸標註)
                if (typeof updatePanelPreview === 'function') {
                    updatePanelPreview(true);
                }

                pdfPanelImg.src = sourceCanvas.toDataURL("image/jpeg", 0.9);
                pdfPanelContainer.style.display = "block";

                // [Modified] 還原 Canvas 解析度與預覽模式
                sourceCanvas.width = originalWidth;
                sourceCanvas.height = originalHeight;

                if (typeof updatePanelPreview === 'function') {
                    updatePanelPreview(false);
                }
            } catch (e) {
                console.error("Canvas export failed", e);
                pdfPanelContainer.style.display = "none";
            }
        } else {
            pdfPanelContainer.style.display = "none";
        }
    } else {
        pdfPanelContainer.style.display = "none";
    }

    pdfPanelDetails.textContent = panelDetailsText;

    // 2. 生成 PDF
    const { jsPDF } = window.jspdf;
    const targetElement = document.getElementById("pdf-export-container");

    try {
        const canvas = await html2canvas(targetElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            width: 794, // 210mm @ 96 DPI
            windowWidth: 1200
        });

        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgProps = pdf.getImageProperties(imgData);
        // [Modified] 單頁自適應邏輯
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (imgHeight > pdfHeight) {
            // 如果內容高度超過 A4 高度，則縮小以適應
            const scaleFactor = pdfHeight / imgHeight;
            const scaledWidth = pdfWidth * scaleFactor;
            const scaledHeight = pdfHeight;
            const xOffset = (pdfWidth - scaledWidth) / 2;
            pdf.addImage(imgData, 'JPEG', xOffset, 0, scaledWidth, scaledHeight);
        } else {
            // 否則寬度填滿，高度自動
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
        }

        const partNo = getValue("partNo");
        // [Modified] User requested filename format: [PartNo] PCB製作規格單.pdf or PCB製作規格單.pdf if empty
        const filename = partNo ? `${partNo} PCB製作規格單.pdf` : `PCB製作規格單.pdf`;
        pdf.save(filename);

        if (typeof window.showToast === 'function') window.showToast("正式報表下載成功！");

    } catch (err) {
        console.error(err);
        if (typeof window.showToast === 'function') window.showToast("報表生成失敗", "error");
        else alert("報表生成失敗");
    }
}

// [新增] 下載排版示意圖功能
function downloadPanelImage() {
    const sourceCanvas = document.getElementById("panelPreviewCanvas");
    if (!sourceCanvas) {
        alert("找不到排版示意圖");
        return;
    }

    try {
        // 保存原始狀態
        const originalWidth = sourceCanvas.width;
        const originalHeight = sourceCanvas.height;

        // 放大 Canvas 以獲得高解析度
        sourceCanvas.width = 2000;
        sourceCanvas.height = 1200;

        // 切換到 Export 模式 (白底黑線)
        if (typeof updatePanelPreview === 'function') {
            updatePanelPreview(true);
        }

        // 下載圖片
        const link = document.createElement('a');
        const partNo = getValue("partNo");
        const filename = partNo ? `${partNo} 排版示意圖.png` : `排版示意圖.png`;
        link.download = filename;
        link.href = sourceCanvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 還原原始狀態
        sourceCanvas.width = originalWidth;
        sourceCanvas.height = originalHeight;

        if (typeof updatePanelPreview === 'function') {
            updatePanelPreview(false);
        }

        if (typeof window.showToast === 'function') window.showToast("排版示意圖下載成功！");

    } catch (e) {
        console.error("Download image failed", e);
        alert("圖片下載失敗");
    }
}
