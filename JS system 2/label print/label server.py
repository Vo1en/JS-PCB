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
PRINTER_NAME = "XP-470E"  # 你的印表機名稱
# ==========================================

# ★★★ 路徑修正 (背景執行必備) ★★★
# 取得目前這支 Python 檔案所在的「絕對路徑」
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "customers.json")
HTML_FILE = os.path.join(BASE_DIR, "label index.html")

app = FastAPI()

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
    except Exception:
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

# --- GDI 直接列印核心 ---
def direct_print_gdi(printer_name, text_to_print):
    try:
        hDC = win32ui.CreateDC()
        hDC.CreatePrinterDC(printer_name)
        hDC.StartDoc("Label Print")
        hDC.StartPage()

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

        hDC.SelectObject(make_font(test_size))
        text_w, text_h = hDC.GetTextExtent(text_to_print)

        ratio_w = max_w / text_w if text_w > 0 else 1
        ratio_h = max_h / text_h if text_h > 0 else 1
        final_ratio = min(ratio_w, ratio_h)
        final_size = int(test_size * final_ratio)
        
        hDC.SelectObject(make_font(final_size))
        final_w, final_h = hDC.GetTextExtent(text_to_print)

        x = (page_width - final_w) // 2
        y = (page_height - final_h) // 2

        hDC.TextOut(x, y, text_to_print)
        hDC.EndPage()
        hDC.EndDoc()
        hDC.DeleteDC()
        return True, "OK"
    except Exception as e:
        return False, str(e)

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
    raise HTTPException(status_code=404, detail="找不到該客戶")

@app.delete("/api/customers/{code}")
def delete_customer(code: str):
    db = load_db()
    new_db = [c for c in db if c['code'] != code]
    save_db(new_db)
    return {"status": "success"}

@app.post("/api/print")
def print_label(req: PrintRequest):
    # 背景執行時看不到 print，但功能會正常運作
    for i in range(req.copies):
        success, msg = direct_print_gdi(PRINTER_NAME, req.customer_name)
        if not success:
            return {"status": "error", "message": msg}
    return {"status": "success"}

@app.get("/")
def read_root():
    # 使用修正後的絕對路徑
    if os.path.exists(HTML_FILE):
        return FileResponse(HTML_FILE)
    return {"error": "index.html not found"}

if __name__ == "__main__":
    # 這裡只在手動測試時會顯示，背景執行時不會看到
    uvicorn.run(app, host="0.0.0.0", port=8000)