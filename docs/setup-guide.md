# Mac Mini M4 部署指南

> 適用機型：Mac Mini M4 基本款（10 核 CPU / 10 核 GPU / 16 GB RAM）
> 預估總磁碟佔用：約 7-8 GB（含所有模型與依賴）
> 預估總安裝時間：約 15-20 分鐘

---

## 第一部分：基礎環境安裝

### 1. 安裝 Homebrew（如未安裝）

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. 安裝系統依賴

```bash
brew install node ffmpeg git
```

驗證：

```bash
node --version    # 應 >= 22.x
ffmpeg -version   # 應顯示版本號
```

---

## 第二部分：Ollama 安裝與設定

### 3. 安裝 Ollama

```bash
brew install ollama
```

### 4. 啟動 Ollama 服務（常駐背景）

```bash
# 首次啟動
ollama serve

# 或設為開機自動啟動
brew services start ollama
```

### 5. 下載 Qwen 2.5:7B 模型

```bash
ollama pull qwen2.5:7b
```

> 下載大小：約 4.7 GB，依網速需 5-15 分鐘

驗證模型是否可用：

```bash
ollama list
# 應顯示 qwen2.5:7b
```

快速測試：

```bash
echo "請幫我把這段口語化的文字改寫成正式書面語：欸我跟你說喔那個專案好像要延期了因為工程師那邊還沒搞定" | ollama run qwen2.5:7b
```

---

## 第三部分：whisper.cpp 安裝

### 6. 安裝 whisper.cpp

```bash
brew install whisper-cpp
```

### 7. 下載語音辨識模型

```bash
# 基本模型（推薦，142 MB，速度與品質平衡）
whisper-cpp-download-model base

# 如果想要更高準確度（可選，466 MB）
# whisper-cpp-download-model small
```

驗證：

```bash
whisper-cpp --help
# 應顯示使用說明
```

---

## 第四部分：部署 My Safer Typeless

### 8. 取得專案

```bash
cd ~/Projects  # 或你偏好的目錄
git clone <your-repo-url> my-safer-typeless
cd my-safer-typeless
```

### 9. 安裝與啟動 Server

```bash
cd server
cp .env.example .env
# 編輯 .env，修改 JWT_SECRET 為一個安全的隨機字串
nano .env

npm install
npm run dev
```

啟動後你應該看到：

```
  My Safer Typeless Server
  ========================
  Server:       http://0.0.0.0:3100
  Admin Portal: http://0.0.0.0:3100/admin
  Web Client:   http://0.0.0.0:3100
  WebSocket:    ws://0.0.0.0:3100/ws

  Default admin account created:
  Username: admin
  Password: admin123
  Please change the password after first login!
```

### 10. 建置 Admin Portal

```bash
cd ../admin-portal
npm install
npm run build
```

### 11. 建置 Web Client

```bash
cd ../client-web
npm install
npm run build
```

### 12. 從其他裝置連線

在同一區域網路的其他裝置，開啟瀏覽器：

- Admin Portal：`http://<mac-mini-ip>:3100/admin`
- Web Client：`http://<mac-mini-ip>:3100`

查看 Mac Mini 的 IP：

```bash
ipconfig getifaddr en0
```

---

## 第五部分：設為開機自動啟動

### 13. 建立 LaunchAgent

```bash
cat > ~/Library/LaunchAgents/com.safer-typeless.server.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.safer-typeless.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>--import</string>
        <string>tsx</string>
        <string>src/index.ts</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USERNAME/Projects/my-safer-typeless/server</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/safer-typeless.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/safer-typeless.error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
EOF

# 記得把 YOUR_USERNAME 改成你的 macOS 使用者名稱
# 啟動服務
launchctl load ~/Library/LaunchAgents/com.safer-typeless.server.plist
```

---

## 第六部分：Ollama 日常多用途使用

Ollama 不只服務語音轉錄，你可以同時拿來做以下事情：

### 日常聊天

```bash
# 直接在 terminal 互動聊天
ollama run qwen2.5:7b

# 帶系統提示的聊天
ollama run qwen2.5:7b "你是一個繁體中文助手。請用簡潔的方式回答問題。"
```

### Coding 輔助

```bash
# 安裝一個專為 coding 優化的模型（可選）
ollama pull qwen2.5-coder:7b

# 使用
ollama run qwen2.5-coder:7b "幫我寫一個 Python 函式，接收一個列表並回傳去重後的結果"
```

### VS Code 整合（本地 Copilot）

1. 安裝 VS Code 擴充套件「Continue」
2. 設定 `~/.continue/config.json`：

```json
{
  "models": [
    {
      "title": "Qwen 2.5 Coder",
      "provider": "ollama",
      "model": "qwen2.5-coder:7b"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Qwen Coder",
    "provider": "ollama",
    "model": "qwen2.5-coder:7b"
  }
}
```

### Open WebUI（ChatGPT 風格網頁介面）

```bash
# 一行指令啟動
docker run -d -p 3000:8080 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -v open-webui:/app/backend/data \
  --name open-webui \
  --restart always \
  ghcr.io/open-webui/open-webui:main
```

然後開瀏覽器 `http://localhost:3000`，首次使用需建立帳號。

### 管理多個模型

```bash
# 查看已安裝模型
ollama list

# 安裝其他模型
ollama pull gemma3:4b        # Google Gemma 3，輕量快速
ollama pull llama3.2:3b      # Meta Llama，英文特強
ollama pull qwen2.5-coder:7b # Coding 專用

# 刪除不需要的模型
ollama rm <model-name>

# 查看模型資訊
ollama show qwen2.5:7b
```

### Ollama API（供其他應用接入）

Ollama 預設在 `http://localhost:11434` 提供 OpenAI 相容 API：

```bash
# 範例：用 curl 呼叫
curl http://localhost:11434/api/generate \
  -d '{"model":"qwen2.5:7b","prompt":"什麼是量子計算？","stream":false}'
```

任何支援 OpenAI API 的工具都可以把 base URL 改成 `http://localhost:11434/v1` 直接使用。

---

## 記憶體使用參考（M4 16 GB）

| 元件 | RAM 佔用 | 說明 |
|------|---------|------|
| macOS 系統 | ~3-4 GB | 背景服務 |
| Ollama + Qwen 2.5:7B | ~5 GB | 載入模型後 |
| whisper.cpp (base) | ~0.3 GB | 轉錄時 |
| Node.js Server | ~0.1 GB | 常駐 |
| 剩餘可用 | ~6-7 GB | 瀏覽器等其他應用 |

> Ollama 在模型閒置一段時間後會自動卸載記憶體，不會一直佔用。

---

## 常見問題排除

**Q: Ollama 啟動後無法連線？**
```bash
# 確認服務在執行
curl http://localhost:11434/api/tags
# 如果失敗，重啟
brew services restart ollama
```

**Q: whisper.cpp 找不到模型？**
```bash
# 確認模型路徑
ls ~/.cache/whisper-cpp/
# 或手動指定路徑到 .env 的 WHISPER_MODEL_PATH
```

**Q: 其他裝置連不上？**
```bash
# 確認防火牆設定
# macOS > 系統設定 > 網路 > 防火牆 > 允許傳入連線
# 確認同一網路
ping <mac-mini-ip>
```

**Q: 想用更好的 Coding 模型？**
```bash
# Qwen 2.5 Coder 7B 是 16 GB 上最佳的 Coding 模型
ollama pull qwen2.5-coder:7b
# 不建議同時載入兩個 7B 模型（會超過 RAM）
# Ollama 會自動管理，閒置模型會被卸載
```
