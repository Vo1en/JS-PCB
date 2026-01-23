Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 取得目前 VBS 檔案所在的資料夾路徑
CurrentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' 設定工作目錄為該資料夾 (這很重要，不然會找不到 index.html)
WshShell.CurrentDirectory = CurrentDir

' 執行 Python，參數 0 代表隱藏視窗
' 請確認你的 python 檔名是 "label server.py" (包含空白要用引號)
WshShell.Run "python ""label server.py""", 0, False