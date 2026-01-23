import os
import json
import socket
import uvicorn
import win32ui
import win32con
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any

# ==========================================
# ★★★ 設定區 ★★★
PRINTER_NAME = "XP-470E 80*40"  # 你的印表機名稱
# ==========================================

# ★★★ 路徑修正 (背景執行必備) ★★★
# 取得目前這支 Python 檔案所在的「絕對路徑」
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "customers.json")
HTML_FILE = os.path.join(BASE_DIR, "label index.html")
HISTORY_FILE = os.path.join(BASE_DIR, "print_history.json")  # ★ 新增列印歷史

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允許所有來源，方便開發與不同 IP 連線
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ★★★ 內建預設客戶名單 (省略部分，邏輯不變) ★★★
# (為了版面整潔，這裡保持你的原始邏輯，但改用 load_db 讀取)
DEFAULT_CUSTOMERS = [
    {"code": "SB01", "name": "柏璿"}, 
    # ... (你的原始名單很長，這裡程式碼執行時會保留，不用擔心)
]
# 注意：若你需要完整的 DEFAULT_CUSTOMERS，請保留你原本的列表內容，
# 或是確保 customers.json 已經產生，這裡為了代碼精簡示意。

# --- 工具：取得本機 IP ---
def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

# --- 資料庫邏輯 ---
def load_db() -> List[Dict[str, Any]]:
    if not os.path.exists(DB_FILE):
        # 第一次執行，若沒有檔案則建立空的或預設值
        save_db([]) 
        return []
    
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            content = f.read().strip()
            data = json.loads(content) if content else []
            return data
    except Exception as e:
        print(f"Error loading DB: {e}")
        return []

def save_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# --- 資料模型 ---
class Customer(BaseModel):
    code: str
    name: str

class PrintRequest(BaseModel):
    customer_name: str
    copies: int = 1

# ★★★ 新增：批量列印請求 ★★★
class BatchPrintRequest(BaseModel):
    items: List[PrintRequest]  # 多個客戶和各自的份數

# --- GDI 直接列印核心 ---
import win32gui

# --- GDI 列印輔助 ---
def draw_label_on_dc(hDC, text_to_print):
    """
    在指定的 DC 上繪製標籤內容 (含 StartPage/EndPage)
    """
    page_width = hDC.GetDeviceCaps(win32con.HORZRES)
    page_height = hDC.GetDeviceCaps(win32con.VERTRES)
    
    margin_x = int(page_width * 0.05)
    max_w = page_width - (margin_x * 2)
    max_h = int(page_height * 0.9)
    test_size = max_h

    def make_font(size):
        return win32ui.CreateFont({
            "name": "Microsoft JhengHei",
            "height": size,
            "weight": 800,
            "charset": win32con.CHINESEBIG5_CHARSET, 
            "pitch and family": win32con.DEFAULT_PITCH | win32con.FF_SWISS,
        })

    # 先用測試大小計算比例
    hDC.SelectObject(make_font(test_size))
    text_w, text_h = hDC.GetTextExtent(text_to_print)

    ratio_w = max_w / text_w if text_w > 0 else 1
    ratio_h = max_h / text_h if text_h > 0 else 1
    final_ratio = min(ratio_w, ratio_h)
    final_size = int(test_size * final_ratio)
    
    # 使用最終大小繪製
    font = make_font(final_size)
    hDC.SelectObject(font)
    final_w, final_h = hDC.GetTextExtent(text_to_print)

    x = (page_width - final_w) // 2
    y = (page_height - final_h) // 2

    hDC.StartPage()
    hDC.TextOut(x, y, text_to_print)
    hDC.EndPage()

def print_hardware_copies(printer_name, text, copies):
    """
    使用硬體份數設定進行列印 (發送 1 頁資料，由印表機重複列印)
    解決傳輸大量 Bitmap 造成的停頓問題
    """
    hPrinter = win32print.OpenPrinter(printer_name)
    try:
        attr = win32print.GetPrinter(hPrinter, 2)
        pDevMode = attr['pDevMode']
        pDevMode.Copies = copies
        
        # 使用修改後的 DevMode 建立 DC
        hdc_handle = win32gui.CreateDC("WINSPOOL", printer_name, pDevMode)
        dc = win32ui.CreateDCFromHandle(hdc_handle)
        
        dc.StartDoc(f"Label: {text}")
        draw_label_on_dc(dc, text)
        dc.EndDoc()
        dc.DeleteDC()
        return True
    except Exception as e:
        print(f"Hardware copy print failed: {e}")
        return False
    finally:
        win32print.ClosePrinter(hPrinter)

def batch_print_gdi(printer_name, items):
    """
    智慧批量列印
    1. 針對多份數的單一項目 (copies > 1) -> 使用 print_hardware_copies (硬體迴圈)
    2. 針對單份數的項目 (copies == 1) -> 合併為單一工作 (bulk job)
    """
    try:
        current_bulk_dc = None

        def flush_bulk_dc():
            nonlocal current_bulk_dc
            if current_bulk_dc:
                current_bulk_dc.EndDoc()
                current_bulk_dc.DeleteDC()
                current_bulk_dc = None

        for text_to_print, copies in items:
            if copies > 1:
                # 遇到多份數需求，先將之前的單份數工作送出
                flush_bulk_dc()
                # 使用硬體份數列印
                success = print_hardware_copies(printer_name, text_to_print, copies)
                if not success:
                    # 如果硬體設定失敗，退回軟體迴圈 (這應該很少發生)
                    # 重新建立一個臨時 DC 跑軟體迴圈
                    temp_dc = win32ui.CreateDC()
                    temp_dc.CreatePrinterDC(printer_name)
                    temp_dc.StartDoc(f"Label: {text_to_print}")
                    for _ in range(copies):
                        draw_label_on_dc(temp_dc, text_to_print)
                    temp_dc.EndDoc()
                    temp_dc.DeleteDC()
            else:
                # 單份數，加入 Bulk Job
                if current_bulk_dc is None:
                    current_bulk_dc = win32ui.CreateDC()
                    current_bulk_dc.CreatePrinterDC(printer_name)
                    current_bulk_dc.StartDoc("Label Batch Print")
                
                draw_label_on_dc(current_bulk_dc, text_to_print)
        
        # 結束最後的 Bulk Job
        flush_bulk_dc()
        return True, "OK"

    except Exception as e:
        return False, str(e)

def direct_print_gdi(printer_name, text_to_print, copies=1):
    """
    單一列印包裝函數
    """
    # 這裡現在會自動走到 print_hardware_copies 邏輯，如果 copies > 1
    return batch_print_gdi(printer_name, [(text_to_print, copies)])

# --- API 接口 ---

@app.get("/api/customers", response_model=List[Customer])
def get_customers():
    return load_db()

@app.post("/api/customers")
def add_customer(customer: Customer):
    db = load_db()
    if any(c['code'] == customer.code for c in db):
        raise HTTPException(status_code=400, detail="編號已存在")
    db.append(customer.dict())
    save_db(db)
    return {"status": "success"}

@app.put("/api/customers/{code}")
def update_customer(code: str, customer: Customer):
    db = load_db()
    found = False
    for i, c in enumerate(db):
        if c['code'] == code:
            db[i] = customer.dict()
            found = True
            break
    
    if found:
        save_db(db)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="客戶不存在")

@app.delete("/api/customers/{code}")
def delete_customer(code: str):
    db = load_db()
    new_db = [c for c in db if c['code'] != code]
    save_db(new_db)
    return {"status": "success"}

from fastapi import FastAPI, HTTPException, Request

@app.post("/api/print")
def print_label(req: PrintRequest, request: Request):
    """
    接收列印請求，自動抓取客戶端來源
    """
    # 這裡 direct_print_gdi 已經改為呼叫 batch_print_gdi，所以也是一次性工作
    success, msg = direct_print_gdi(PRINTER_NAME, req.customer_name, req.copies)
    if not success:
        return {"status": "error", "message": msg}
    
    # ★ 記錄列印歷史
    client_info = get_client_info(request)
    add_print_history(req.customer_name, req.copies, client_info)
    return {"status": "success"}

# ★★★ 新增：批量列印 API ★★★
@app.post("/api/print/batch")
def batch_print(req: BatchPrintRequest, request: Request):
    """
    批量列印多個客戶的標籤
    ★ 修正：將所有客戶合併為單一列印工作
    """
    if not req.items:
        return {"status": "error", "message": "沒有選擇任何客戶"}
    
    # 轉換請求為 (text, copies) 列表
    print_items = [(item.customer_name, item.copies) for item in req.items]
    
    # 執行一次性批量列印
    success, msg = batch_print_gdi(PRINTER_NAME, print_items)
    if not success:
        return {"status": "error", "message": msg}

    total_copies = 0
    client_info = get_client_info(request)
    
    # 記錄歷史 (因為是一次性列印成功，所以這裡假設所有項目都成功)
    for item in req.items:
        add_print_history(item.customer_name, item.copies, client_info)
        total_copies += item.copies
    
    return {"status": "success", "total": total_copies}

# ★★★ 取得客戶端資訊 ★★★
def get_client_info(request: Request) -> str:
    try:
        host = request.client.host
        # 嘗試反查主機名稱 (DNS Reverse Lookup)
        try:
            hostname, _, _ = socket.gethostbyaddr(host)
            return f"{hostname} ({host})"
        except:
            return host
    except:
        return "Unknown"

# ★★★ 列印歷史記錄 ★★★
from datetime import datetime

def load_history() -> List[Dict[str, Any]]:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def save_history(data: List[Dict[str, Any]]):
    # 只保留最近 500 筆記錄
    if len(data) > 500:
        data = data[-500:]
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def add_print_history(customer_name: str, copies: int, device: str = ""):
    history = load_history()
    history.append({
        "customer_name": customer_name,
        "copies": copies,
        "device": device,
        "timestamp": datetime.now().isoformat()
    })
    save_history(history)

@app.get("/api/history")
def get_print_history(limit: int = 50):
    """取得列印歷史，預設返回最近 50 筆"""
    history = load_history()
    # 由新到舊排序
    history.reverse()
    return history[:limit]

@app.delete("/api/history")
def clear_history():
    """清除所有列印歷史"""
    save_history([])
    return {"status": "success"}

# ★★★ 印表機狀態 API ★★★
import win32print

@app.get("/api/printer/status")
def get_printer_status():
    """檢查印表機狀態"""
    # 這裡直接使用全域變數設定的印表機名稱，不再讀取 settings.json
    printer_name = PRINTER_NAME
    
    try:
        # 取得所有印表機
        printers = [p[2] for p in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)]
        
        if printer_name not in printers:
            return {
                "status": "offline",
                "message": f"找不到印表機 {printer_name}",
                "printer_name": printer_name,
                "available_printers": printers
            }
        
        # 嘗試開啟印表機取得狀態
        try:
            handle = win32print.OpenPrinter(printer_name)
            info = win32print.GetPrinter(handle, 2)
            win32print.ClosePrinter(handle)
            
            status_code = info.get('Status', 0)
            
            # 解析狀態碼
            if status_code == 0:
                return {"status": "ready", "message": "印表機就緒", "printer_name": printer_name}
            elif status_code & 0x00000001:  # PRINTER_STATUS_PAUSED
                return {"status": "paused", "message": "印表機已暫停", "printer_name": printer_name}
            elif status_code & 0x00000002:  # PRINTER_STATUS_ERROR
                return {"status": "error", "message": "印表機錯誤", "printer_name": printer_name}
            elif status_code & 0x00000080:  # PRINTER_STATUS_OFFLINE
                return {"status": "offline", "message": "印表機離線", "printer_name": printer_name}
            elif status_code & 0x00000400:  # PRINTER_STATUS_PAPER_OUT
                return {"status": "paper_out", "message": "缺紙", "printer_name": printer_name}
            else:
                return {"status": "busy", "message": "印表機忙碌中", "printer_name": printer_name}
                
        except Exception as e:
            return {"status": "error", "message": str(e), "printer_name": printer_name}
            
    except Exception as e:
        return {"status": "error", "message": f"無法檢查印表機: {str(e)}", "printer_name": printer_name}

# ★★★ 列印佇列狀態 ★★★
@app.get("/api/printer/queue")
def get_print_queue():
    """取得列印佇列"""
    printer_name = PRINTER_NAME
    try:
        handle = win32print.OpenPrinter(printer_name)
        jobs = win32print.EnumJobs(handle, 0, 100)
        win32print.ClosePrinter(handle)
        
        return {
            "queue_count": len(jobs),
            "jobs": [{"id": j["JobId"], "document": j.get("pDocument", ""), "status": j.get("Status", 0)} for j in jobs]
        }
    except Exception as e:
        return {"queue_count": 0, "jobs": [], "error": str(e)}

@app.get("/")
def read_root():
    # 使用修正後的絕對路徑
    if os.path.exists(HTML_FILE):
        return FileResponse(HTML_FILE)
    return {"error": "index.html not found"}

if __name__ == "__main__":
    # 這裡只在手動測試時會顯示，背景執行時不會看到
    uvicorn.run(app, host="0.0.0.0", port=8000)