// [新增] 連片配置預覽與計算
// isExport: true = 輸出 PDF 模式 (白底黑線); false = 螢幕預覽模式 (透明底/黑底亮線)
function updatePanelPreview(isExport = false) {
    const singleX = parseFloat(document.getElementById('panelSingleX').value) || 0;
    const singleY = parseFloat(document.getElementById('panelSingleY').value) || 0;
    const layoutX = parseInt(document.getElementById('panelLayoutX').value) || 1;
    const layoutY = parseInt(document.getElementById('panelLayoutY').value) || 1;
    const breakPos = document.getElementById('panelBreakPos').value;
    const breakWidth = parseFloat(document.getElementById('panelBreakWidth').value) || 0;

    const spacingXInput = document.getElementById('panelSpacingX');
    const spacingYInput = document.getElementById('panelSpacingY');
    const breakWidthInput = document.getElementById('panelBreakWidth');
    const breakWidthLabel = breakWidthInput.nextElementSibling; // "mm" span

    // [New] Remove leading zeros for inputs
    function formatInput(id) {
        const el = document.getElementById(id);
        if (!el || !el.value) return;
        // Allow "0" but not "05", allow "0.5"
        if (el.value.length > 1 && el.value.startsWith('0') && !el.value.startsWith('0.')) {
            const val = parseFloat(el.value);
            if (!isNaN(val)) el.value = val;
        }
    }
    ['panelSingleX', 'panelSingleY', 'panelLayoutX', 'panelLayoutY', 'panelSpacingX', 'panelSpacingY', 'panelBreakWidth'].forEach(formatInput);

    // === 驗證規則 ===
    let allowSpacingX = layoutX > 1;
    let allowSpacingY = layoutY > 1;

    if (breakPos === 'none') {
        breakWidthInput.style.display = 'none';
        breakWidthLabel.style.display = 'none';
    } else {
        breakWidthInput.style.display = 'block';
        breakWidthLabel.style.display = 'inline';
    }

    // [Modified] Remove restrictions based on breakPos. 
    // Spacing inputs are now only dependent on quantity check (layout > 1).
    // if (breakPos === 'tb') allowSpacingY = false;
    // if (breakPos === 'lr') allowSpacingX = false;

    // 更新輸入框狀態 (僅在非 Export 模式下操作 UI)
    if (!isExport) {
        if (!allowSpacingX) {
            spacingXInput.value = '0';
            spacingXInput.disabled = true;
            spacingXInput.style.backgroundColor = '#eee';
        } else {
            spacingXInput.disabled = false;
            spacingXInput.style.backgroundColor = '';
        }

        if (!allowSpacingY) {
            spacingYInput.value = '0';
            spacingYInput.disabled = true;
            spacingYInput.style.backgroundColor = '#eee';
        } else {
            spacingYInput.disabled = false;
            spacingYInput.style.backgroundColor = '';
        }
    }

    const spacingX = parseFloat(spacingXInput.value) || 0;
    const spacingY = parseFloat(spacingYInput.value) || 0;

    // 計算排版後尺寸
    let panelW = (singleX * layoutX) + (spacingX * (layoutX - 1));
    let panelH = (singleY * layoutY) + (spacingY * (layoutY - 1));

    if (breakPos === 'lr' || breakPos === 'all') panelW += breakWidth * 2;
    if (breakPos === 'tb' || breakPos === 'all') panelH += breakWidth * 2;

    // 更新顯示文字
    const resultEl = document.getElementById('panelResultSize');
    if (singleX > 0 && singleY > 0) {
        resultEl.textContent = panelW.toFixed(1) + ' × ' + panelH.toFixed(1) + ' mm';
    } else {
        resultEl.textContent = '-- × -- mm';
    }

    // 繪製預覽圖
    const canvas = document.getElementById('panelPreviewCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 設定樣式變數
    // [Modified] Export 模式改為深色背景 (高對比)
    const bgColor = isExport ? '#222222' : null; // Dark Grey for PDF Export
    const lineColor = isExport ? '#ffffff' : '#ff00ff'; // White lines for contrast
    const dimColor = isExport ? '#ffffff' : '#ffffff'; // White text
    const holeColor = isExport ? '#ffffff' : '#ff00ff'; // White holes
    const fidColor = isExport ? '#00ff00' : '#00ff00'; // Keep Green fiducials

    // 清除畫布
    if (isExport) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (singleX <= 0 || singleY <= 0) return;

    // 計算縮放比例 (留空間給尺寸標註)
    // [Modified] Dynamic padding: reduced for UI to maximize size, larger for Export to ensure clear text
    // UI (650x450): 60px padding leaves 530x330.
    // Export (2000x1200): 150px padding leaves 1700x900.
    const padding = isExport ? 150 : 60;

    const availW = canvas.width - padding * 2;
    const availH = canvas.height - padding * 2;
    const scale = Math.min(availW / panelW, availH / panelH);

    const drawW = panelW * scale;
    const drawH = panelH * scale;
    const offsetX = (canvas.width - drawW) / 2;
    const offsetY = (canvas.height - drawH) / 2;

    const boardW = singleX * scale;
    const boardH = singleY * scale;
    const gapW = spacingX * scale;
    const gapH = spacingY * scale;
    const breakScaleW = (breakPos === 'lr' || breakPos === 'all') ? breakWidth * scale : 0;
    const breakScaleH = (breakPos === 'tb' || breakPos === 'all') ? breakWidth * scale : 0;

    // 設定線條樣式
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;

    // 繪製外框 (整個連片面板)
    ctx.strokeRect(offsetX, offsetY, drawW, drawH);

    // 計算板子陣列的起始位置和總尺寸
    const arrayStartX = offsetX + breakScaleW;
    const arrayStartY = offsetY + breakScaleH;
    const arrayW = (boardW * layoutX) + (gapW * (layoutX - 1));
    const arrayH = (boardH * layoutY) + (gapH * (layoutY - 1));

    // 繪製各個板子
    for (let i = 0; i < layoutX; i++) {
        for (let j = 0; j < layoutY; j++) {
            const x = arrayStartX + i * (boardW + gapW);
            const y = arrayStartY + j * (boardH + gapH);
            ctx.strokeRect(x, y, boardW, boardH);
        }
    }

    // 繪製 V-cut 線條 (僅當間距為 0 時繪製)
    ctx.lineWidth = 1;
    // 垂直分隔線
    if (spacingX <= 0) {
        for (let i = 1; i < layoutX; i++) {
            const vx = arrayStartX + i * boardW + (i - 0.5) * gapW + gapW / 2;
            ctx.beginPath();
            ctx.moveTo(vx, arrayStartY);
            ctx.lineTo(vx, arrayStartY + arrayH);
            ctx.stroke();
        }
    }
    // 水平分隔線
    if (spacingY <= 0) {
        for (let j = 1; j < layoutY; j++) {
            const vy = arrayStartY + j * boardH + (j - 0.5) * gapH + gapH / 2;
            ctx.beginPath();
            ctx.moveTo(arrayStartX, vy);
            ctx.lineTo(arrayStartX + arrayW, vy);
            ctx.stroke();
        }
    }

    // 繪製折斷邊分隔線
    if (breakScaleW > 0) {
        ctx.beginPath();
        ctx.moveTo(arrayStartX, offsetY);
        ctx.lineTo(arrayStartX, offsetY + drawH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(arrayStartX + arrayW, offsetY);
        ctx.lineTo(arrayStartX + arrayW, offsetY + drawH);
        ctx.stroke();
    }
    if (breakScaleH > 0) {
        ctx.beginPath();
        ctx.moveTo(offsetX, arrayStartY);
        ctx.lineTo(offsetX + drawW, arrayStartY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(offsetX, arrayStartY + arrayH);
        ctx.lineTo(offsetX + drawW, arrayStartY + arrayH);
        ctx.stroke();
    }

    // 繪製定位孔與光學點
    if (breakPos !== 'none' && breakWidth > 0) {
        ctx.fillStyle = holeColor;
        const holeDiameter = Math.min(breakWidth / 2, 4);
        const holeRadius = (holeDiameter / 2) * scale;
        const edgeOffset5mm = 5 * scale;

        let cornerOffsetX, cornerOffsetY;
        if (breakPos === 'all') {
            cornerOffsetX = breakScaleW / 2;
            cornerOffsetY = breakScaleH / 2;
        } else if (breakPos === 'lr') {
            cornerOffsetX = breakScaleW / 2;
            cornerOffsetY = edgeOffset5mm;
        } else if (breakPos === 'tb') {
            cornerOffsetX = edgeOffset5mm;
            cornerOffsetY = breakScaleH / 2;
        }

        const holes = [
            [offsetX + cornerOffsetX, offsetY + cornerOffsetY],
            [offsetX + drawW - cornerOffsetX, offsetY + cornerOffsetY],
            [offsetX + cornerOffsetX, offsetY + drawH - cornerOffsetY],
            [offsetX + drawW - cornerOffsetX, offsetY + drawH - cornerOffsetY]
        ];

        holes.forEach(([cx, cy]) => {
            ctx.beginPath();
            ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
            ctx.fill();
        });

        // 光學點
        ctx.fillStyle = fidColor;
        // [Modified] User requested 2.0mm size
        const fiducialRadius = (2.0 / 2) * scale;
        const fiducialOffset15 = 15 * scale;
        const fiducialOffset = 10 * scale;
        let fiducials;

        if (breakPos === 'lr') {
            fiducials = [
                [holes[0][0], holes[0][1] + fiducialOffset15],
                [holes[1][0], holes[1][1] + fiducialOffset],
                [holes[2][0], holes[2][1] - fiducialOffset],
                [holes[3][0], holes[3][1] - fiducialOffset]
            ];
        } else {
            // 上下 or 四周 assume horizontal shift
            fiducials = [
                [holes[0][0] + fiducialOffset15, holes[0][1]],
                [holes[1][0] - fiducialOffset, holes[1][1]],
                [holes[2][0] + fiducialOffset, holes[2][1]],
                [holes[3][0] - fiducialOffset, holes[3][1]]
            ];
        }

        fiducials.forEach(([fx, fy]) => {
            ctx.beginPath();
            ctx.arc(fx, fy, fiducialRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // === 尺寸標註 ===
    const dimLineDist = 30; // [Modified] 增加距離

    // 總寬度 (上方)
    drawDimension(ctx, offsetX, offsetY, offsetX + drawW, offsetY, panelW.toFixed(1) + 'mm', -dimLineDist, false, dimColor);

    // 總高度 (左側) [Modified] 改到左側避免與右側內容衝突習慣
    drawDimension(ctx, offsetX, offsetY, offsetX, offsetY + drawH, panelH.toFixed(1) + 'mm', -dimLineDist, true, dimColor);

    // [新增] 折斷邊尺寸標註
    if (breakScaleW > 0) {
        // 左折斷邊寬度 (標在下方)
        drawDimension(ctx, offsetX, offsetY + drawH, offsetX + breakScaleW, offsetY + drawH, breakWidth.toFixed(1), dimLineDist, false, dimColor);
    }
    if (breakScaleH > 0) {
        // 上折斷邊寬度 (標在右側? 還是左側內?) -> 標在右側 ArrayStart 旁邊
        drawDimension(ctx, offsetX + drawW, offsetY, offsetX + drawW, offsetY + breakScaleH, breakWidth.toFixed(1), dimLineDist, true, dimColor);
    }

    // [新增] 間距尺寸標註
    if (gapW > 0 && layoutX > 1) {
        // X 間距 (標在第一與第二列之間, 下方)
        // 位置: arrayStartX + boardW 到 arrayStartX + boardW + gapW
        const x1 = arrayStartX + boardW;
        const x2 = x1 + gapW;
        // [Modified] Y Position Align with outer edge (offsetY + drawH) same as break dimension
        const y = offsetY + drawH;
        drawDimension(ctx, x1, y, x2, y, spacingX.toFixed(1), dimLineDist, false, dimColor);
    }
    if (gapH > 0 && layoutY > 1) {
        // Y 間距 (標在第一與第二行之間, 右側)
        const y1 = arrayStartY + boardH;
        const y2 = y1 + gapH;
        // [Modified] X Position Align with outer edge (offsetX + drawW) same as break dimension
        const x = offsetX + drawW;
        drawDimension(ctx, x, y1, x, y2, spacingY.toFixed(1), dimLineDist, true, dimColor);
    }

    // 單板尺寸 (如果空間足夠，畫在第一個板子內；否則畫在第一個板子旁)
    if (layoutX >= 1 && layoutY >= 1) {
        const bX = arrayStartX;
        const bY = arrayStartY;

        // 畫在板子下方
        const showBoardDim = boardW > 100 && boardH > 60; // [Modified] 需求空間變大因為字體變大 (24px)

        if (showBoardDim) {
            // 畫在板子內部
            ctx.fillStyle = dimColor;
            ctx.font = '24px Arial'; // [Modified] 24px Font
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(singleX.toFixed(1) + 'x' + singleY.toFixed(1), bX + boardW / 2, bY + boardH / 2);
        } else {
            // 板子太小，標註在陣列外部 (第一個板子對應位置)
            // 下方標寬度
            drawDimension(ctx, bX, bY + boardH, bX + boardW, bY + boardH, singleX.toFixed(1), 45, false, dimColor);
            // 右側標高度 (如果沒有標間距，或者避開)
            drawDimension(ctx, bX + boardW, bY, bX + boardW, bY + boardH, singleY.toFixed(1), 45, true, dimColor);
        }
    }
}

// [輔助] 繪製尺寸標註線 (類似 AutoCAD 樣式)
function drawDimension(ctx, x1, y1, x2, y2, text, offset, isVertical, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.font = '24px Arial'; // [Modified] 24px Font
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const arrowSize = 6; // [Modified] Larger arrows

    // 計算標註線的位置
    let lx1, ly1, lx2, ly2; // Line start/end
    let tx, ty; // Text position

    if (!isVertical) {
        // 水平標註
        ly1 = ly2 = y1 + offset;
        lx1 = x1;
        lx2 = x2;
        tx = (x1 + x2) / 2;
        ty = ly1 - (offset < 0 ? 15 : -15); // [Modified] Offset for larger font

        // 延伸線
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1, ly1 + (offset < 0 ? -2 : 2));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2, ly2 + (offset < 0 ? -2 : 2));
        ctx.stroke();
    } else {
        // 垂直標註
        lx1 = lx2 = x1 + offset;
        ly1 = y1;
        ly2 = y2;
        tx = lx1 - (offset < 0 ? 15 : -15); // [Modified] Offset for larger font
        ty = (y1 + y2) / 2;

        // 延伸線
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(lx1 + (offset < 0 ? -2 : 2), y1);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(lx2 + (offset < 0 ? -2 : 2), y2);
        ctx.stroke();
    }

    // 畫主線
    ctx.beginPath();
    ctx.moveTo(lx1, ly1);
    ctx.lineTo(lx2, ly2);
    ctx.stroke();

    // 畫箭頭 (變大一點)
    drawArrow(ctx, lx1, ly1, isVertical ? (ly2 > ly1 ? 'up' : 'down') : (lx2 > lx1 ? 'left' : 'right'));
    drawArrow(ctx, lx2, ly2, isVertical ? (ly2 > ly1 ? 'down' : 'up') : (lx2 > lx1 ? 'right' : 'left'));

    // 畫文字
    if (isVertical) {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(-Math.PI / 2); // 旋轉文字
        ctx.fillText(text, 0, 0);
        ctx.restore();
    } else {
        ctx.fillText(text, tx, ty);
    }
}

function drawArrow(ctx, x, y, direction) {
    const size = 6; // [Modified] Larger arrows
    ctx.beginPath();
    if (direction === 'right') {
        ctx.moveTo(x, y);
        ctx.lineTo(x - size, y - size / 2);
        ctx.lineTo(x - size, y + size / 2);
    } else if (direction === 'left') {
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y - size / 2);
        ctx.lineTo(x + size, y + size / 2);
    } else if (direction === 'down') {
        ctx.moveTo(x, y);
        ctx.lineTo(x - size / 2, y - size);
        ctx.lineTo(x + size / 2, y - size);
    } else if (direction === 'up') {
        ctx.moveTo(x, y);
        ctx.lineTo(x - size / 2, y + size);
        ctx.lineTo(x + size / 2, y + size);
    }
    ctx.fill();
}
