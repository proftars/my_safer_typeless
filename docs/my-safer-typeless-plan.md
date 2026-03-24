# My Safer Typeless 技術規劃文件

> 版本：v1.2
> 日期：2026-03-25
> 狀態：待最終確認
> Repo：https://github.com/proftars/my_safer_typeless.git
> Versioning：Semantic Versioning (semver)

---

## 1. 專案目標

打造一個 Typeless 的開源自託管替代品。Mac Mini M4 作為 24/7 常駐伺服器，MacBook Air 透過 Tailscale 遠端使用。

**核心體驗（必須支援）：**

1. **Hold 模式**：按住快捷鍵說話 → 放開後自動轉錄 → 文字貼到游標處
2. **Toggle 模式**：按下 Ctrl+` 開始錄音 → 再按一次結束錄音 → 文字貼到游標處（預設模式）
3. **Esc 取消**：錄音過程中按 Esc 可取消當前任務
4. **高準確度中文辨識**：預設使用 Groq whisper-large-v3（雲端），本地 whisper.cpp 作為斷網 fallback
5. **AI 潤飾**：口語轉書面語，但相對保留口語感（不要過度正式化）
6. **自訂詞彙表**：確保專有名詞、技術術語正確轉錄
7. **Admin Portal**：統一管理設定、查看歷史記錄、使用統計（參考 SayIt Dashboard 風格）

**支援語言：** 繁體中文、英文

**支援裝置（v1）：** Mac Mini（本地）+ MacBook Air（透過 Tailscale 遠端）

**認證方式（v1）：** 共用密碼制（輸入指定密碼即可使用）。未來可升級為帳號系統。

---

## 2. 使用情境

```
┌──────────────────────────────────────────────────────┐
│               Mac Mini M4（24/7 常駐伺服器）            │
│                                                       │
│  ┌──────────────┐     ┌───────────────────────────┐  │
│  │  Electron     │     │  Express Server             │  │
│  │  Desktop App  │────▶│  (Port 3100)                │  │
│  │              │     │                             │  │
│  │  - Toggle 模式 │     │  - REST API                 │  │
│  │    Ctrl+` 開始 │     │  - WebSocket                │  │
│  │    Ctrl+` 結束 │     │  - Admin Portal (SPA)       │  │
│  │  - Hold 模式   │     │  - Groq/whisper.cpp STT     │  │
│  │  - Esc 取消   │     │  - Ollama 文字潤飾           │  │
│  │  - 游標處貼上  │     │                             │  │
│  │  - 系統托盤   │     │                             │  │
│  └──────────────┘     └───────────┬───────────────┘  │
│                                   │                   │
│              ┌────────────────────┼────────────────┐  │
│              ▼                    ▼                │  │
│  ┌───────────────────┐  ┌──────────────────┐      │  │
│  │ Groq Whisper API   │  │   Ollama          │      │  │
│  │ large-v3 (預設)    │  │   Qwen 2.5:7B    │      │  │
│  └───────────────────┘  │   (潤飾，保留口語)  │      │  │
│              │           └──────────────────┘      │  │
│              ▼  (fallback)                         │  │
│  ┌───────────────────┐                             │  │
│  │ whisper.cpp small  │                             │  │
│  └───────────────────┘   ┌──────────────────┐      │  │
│                          │    SQLite DB      │      │  │
│                          │  - 轉錄歷史       │◀─────┘  │
│                          │  - 自訂詞彙       │         │
│                          │  - 系統設定       │         │
│                          └──────────────────┘         │
└──────────────────────────────────────────────────────┘
       ▲
       │ Tailscale VPN
       ▼
┌──────────────────┐
│  MacBook Air      │
│  Electron App     │
│  (連線到 Mac Mini  │
│   Server)         │
└──────────────────┘
```

---

## 3. 架構決策

> 完整 ADR 詳見 `docs/adr/ADR-001-architecture.md`

### 方案：精簡版 Electron App + 輕量 Server

**為什麼不直接 Fork OpenWhispr 整個專案？**

OpenWhispr 功能龐大（AI Agent、會議轉錄、筆記系統、雲端同步等），Fork 全部後維護負擔過重。我們只需從中參考核心模組（全域快捷鍵、游標處貼上、whisper.cpp 整合、音頻處理），自己建立精簡版。

| 考量面 | 說明 |
|--------|------|
| **易維護** | 只需 TypeScript 一種語言，程式碼量小，不需要 Rust |
| **穩定性** | Server 與 Electron App 分離，互不影響 |
| **多裝置** | Mac Mini 跑 Server，MacBook Air 跑 Electron App 透過 Tailscale 連回 |
| **體驗** | 保留全域快捷鍵 + 游標處貼上的 Typeless 核心體驗 |

### 從 OpenWhispr 參考的核心模組

| 模組 | 說明 |
|------|------|
| 全域快捷鍵 | Electron globalShortcut API，Hold/Toggle 兩種模式 |
| 游標處貼上 | macOS：clipboard + 模擬 Cmd+V（AppleScript / robotjs） |
| whisper.cpp 呼叫 | 命令列呼叫方式與音頻預處理 |
| 音頻錄製 | Electron 原生麥克風擷取 + ffmpeg 轉換 |

### 從 SayIt 參考的 Admin Portal 設計

| 參考元素 | 說明 |
|----------|------|
| Dashboard 統計卡片 | 轉錄量、使用時長視覺化 |
| HUD 狀態顯示 | 錄音中的浮動狀態提示 |
| 設定頁面佈局 | STT 引擎選擇、快捷鍵設定、API Key 管理 |
| 歷史記錄列表 | 時間軸式呈現，支援搜尋與篩選 |
| shadcn UI 風格 | 統一的設計語言 |

---

## 4. 技術選型

### 4.1 語音辨識（STT）

**策略：Groq 為主、本地為輔**

| 優先級 | 引擎 | 場景 |
|--------|------|------|
| **預設** | Groq whisper-large-v3 | 日常使用，中文準確度最高，延遲 <1 秒 |
| 可選 | Groq whisper-large-v3-turbo | 想省錢或更快時切換 |
| Fallback | 本地 whisper.cpp small | 斷網或 API 異常時自動切換 |

**Groq API 成本：**

| 模型 | 每小時音頻價格 | 每月（2hr/天） | 每月（30min/天） |
|------|---------------|---------------|-----------------|
| whisper-large-v3 | $0.111/hr | ~$6.7 | ~$1.7 |
| whisper-large-v3-turbo | $0.04/hr | ~$2.4 | ~$0.6 |

每次請求最低計費 10 秒。Free Tier 無需信用卡，有每日音頻秒數上限（RPM / ASD / ASH），可在 console.groq.com/settings/limits 查看。個人語音輸入用量下免費方案通常足夠。

### 4.2 文字潤飾（LLM）

**Ollama + Qwen 2.5:7B**

風格：**相對保留口語感**。移除明顯贅字（呃、嗯、那個），修正標點，但保留說話者的語氣和用詞習慣，不要過度書面化。

Prompt 設計：
```
你是一個繁體中文文字編輯助手。請將以下語音轉錄結果稍微整理，使其更通順易讀。

規則：
1. 移除明顯的贅字和語氣詞（呃、嗯、那個、就是說、對對對）
2. 修正標點符號
3. 保留說話者的語氣和用詞風格，不要過度正式化
4. 維持原意，不要添加或刪減實質內容
5. 使用以下自訂詞彙的正確寫法：
{custom_vocabulary}

原始轉錄：
{raw_text}

請直接輸出整理結果，不要加任何說明。
```

### 4.3 前端框架

全部統一 **React 19 + TypeScript + shadcn/ui + Tailwind CSS**。

| 元件 | 技術 |
|------|------|
| Electron App | React 19 + TypeScript |
| Admin Portal | React 19 + shadcn/ui + Tailwind |

### 4.4 後端

| 元件 | 技術 |
|------|------|
| Server | Node.js 22 + Express + TypeScript |
| 資料庫 | SQLite（better-sqlite3） |
| 即時通訊 | WebSocket（ws） |
| 認證 | 共用密碼（bcrypt hash 比對），未來可升級 JWT + 帳號系統 |
| 程序管理 | macOS LaunchAgent（生產）/ tsx（開發） |

---

## 5. 快捷鍵與操作流程

### 5.1 快捷鍵設計

| 操作 | 預設快捷鍵 | 說明 |
|------|-----------|------|
| **Toggle 錄音**（預設模式） | `Ctrl + `` | 第一次按下開始錄音，再按一次結束錄音並送出轉錄 |
| **Hold 錄音**（可選模式） | `Ctrl + `` | 按住期間持續錄音，放開後送出轉錄 |
| **取消錄音** | `Esc` | 錄音過程中按下即取消當前任務，不送出 |

快捷鍵可在 Admin Portal 設定頁面中自訂。

### 5.2 錄音狀態機

```
                    Ctrl+`                     Ctrl+`
  [IDLE] ────────────────▶ [RECORDING] ────────────────▶ [PROCESSING]
    ▲                          │                              │
    │                          │ Esc                          │
    │                          ▼                              │
    │                      [CANCELLED]                        │
    │                          │                              │
    │                          │ (auto reset)                 │
    └──────────────────────────┘◀─────────────────────────────┘
                                       (done / error)

狀態說明：
  IDLE        → 待命，等待使用者觸發
  RECORDING   → 錄音中，HUD 顯示錄音指示
  CANCELLED   → 使用者按 Esc 取消，丟棄音頻，回到 IDLE
  PROCESSING  → 音頻已送出，等待 STT + LLM 結果
  (完成後)     → 貼上文字到游標處，回到 IDLE
```

### 5.3 HUD 浮動狀態顯示

參考 SayIt 的 HUD 設計，在螢幕角落顯示小型浮動視窗：

| 狀態 | HUD 顯示 |
|------|---------|
| IDLE | 隱藏 |
| RECORDING | 紅色圓點 + "錄音中..." + 時間計數 |
| PROCESSING | 旋轉圖示 + "處理中..." |
| 完成 | 綠色勾勾 + 短暫顯示後淡出 |
| 錯誤 | 紅色叉叉 + 錯誤訊息 + 短暫顯示後淡出 |
| CANCELLED | "已取消" + 短暫顯示後淡出 |

---

## 6. 功能清單與開發優先級

### Phase 1：Server 核心 MVP（v0.1.0）

**目標：Server 能接收音頻、轉錄、潤飾、回傳結果**

- [ ] 專案初始化（monorepo 結構、TypeScript、ESLint、prettier）
- [ ] Server 基礎框架（Express + SQLite + 共用密碼認證）
- [ ] Groq Whisper API 整合（主要 STT 引擎）
- [ ] whisper.cpp 整合（fallback STT 引擎，自動切換邏輯）
- [ ] Ollama 整合（轉錄後文字潤飾，保留口語感）
- [ ] 自訂詞彙表 CRUD API
- [ ] 轉錄歷史 API（列表、詳情、刪除）
- [ ] 系統設定 API

### Phase 2：Electron 桌面 App（v0.2.0）

**目標：Mac Mini 和 MacBook Air 上都能像 Typeless 一樣使用**

- [ ] Electron App 基礎框架（main process + preload + React renderer）
- [ ] Toggle 模式：Ctrl+` 開始/結束錄音
- [ ] Hold 模式：Ctrl+` 按住錄音
- [ ] Esc 取消當前錄音任務
- [ ] 游標處自動貼上轉錄結果
- [ ] 系統托盤常駐（啟動/停止/模式切換/設定）
- [ ] 錄音 HUD 浮動視窗
- [ ] Server 連線設定（指向本地或遠端 Mac Mini）
- [ ] 音頻串流（WebSocket 邊錄邊傳，降低延遲）

### Phase 3：Admin Portal + 進階功能（v0.3.0）

- [ ] Admin Portal SPA（React + shadcn/ui，由 Server 靜態託管）
  - 登入頁（共用密碼）
  - Dashboard 總覽（統計卡片）
  - 轉錄歷史列表（搜尋、篩選）
  - 自訂詞彙管理（CRUD + 匯入匯出）
  - 系統設定（STT 引擎、LLM 模型、快捷鍵、API Key）
- [ ] 轉錄歷史全文搜尋（FTS5）
- [ ] 使用統計 API（每日/每週/每月轉錄量、延遲趨勢）

### Phase 4：部署打磨（v1.0.0）

- [ ] macOS LaunchAgent 自動啟動
- [ ] Electron App 打包為 .dmg
- [ ] Tailscale 遠端存取設定指南
- [ ] 錯誤處理與自動重試（Groq 失敗 → 本地 fallback）
- [ ] 效能優化（Ollama 記憶體管理）
- [ ] README 與使用說明文件

---

## 7. 專案結構

```
my_safer_typeless/
├── docs/                         # 文件
│   ├── adr/                      # 架構決策記錄
│   │   └── ADR-001-architecture.md
│   ├── setup-guide.md            # Mac Mini 部署指南
│   └── tailscale-guide.md        # Tailscale 遠端存取指南
│
├── server/                       # Express Server（Mac Mini 常駐）
│   ├── src/
│   │   ├── index.ts              # 進入點，啟動訊息
│   │   ├── config.ts             # 環境變數與設定
│   │   ├── routes/
│   │   │   ├── auth.ts           # 共用密碼認證
│   │   │   ├── transcribe.ts     # 轉錄 API（核心）
│   │   │   ├── vocabulary.ts     # 自訂詞彙 CRUD
│   │   │   ├── history.ts        # 歷史記錄
│   │   │   ├── settings.ts       # 系統設定
│   │   │   └── stats.ts          # 使用統計
│   │   ├── services/
│   │   │   ├── stt-groq.ts       # Groq Whisper API
│   │   │   ├── stt-local.ts      # whisper.cpp
│   │   │   ├── stt-manager.ts    # STT 引擎管理（主/fallback 切換）
│   │   │   ├── ollama.ts         # Ollama 文字潤飾
│   │   │   └── vocabulary.ts     # 詞彙比對與替換邏輯
│   │   ├── db/
│   │   │   ├── index.ts          # DB 連線與初始化
│   │   │   ├── schema.ts         # Table 定義
│   │   │   └── migrations/       # 版本遷移
│   │   ├── middleware/
│   │   │   └── auth.ts           # 密碼驗證中間件
│   │   └── ws/
│   │       └── handler.ts        # WebSocket 串流轉錄
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── electron/                     # Electron 桌面 App
│   ├── src/
│   │   ├── main/
│   │   │   ├── index.ts          # 主程序進入點
│   │   │   ├── tray.ts           # 系統托盤
│   │   │   ├── hotkey.ts         # 全域快捷鍵（Toggle/Hold/Esc）
│   │   │   ├── paste.ts          # 游標處貼上
│   │   │   ├── recorder.ts       # 麥克風錄音
│   │   │   └── state-machine.ts  # 錄音狀態機
│   │   ├── preload/
│   │   │   └── index.ts          # IPC 安全橋接
│   │   └── renderer/             # React UI
│   │       ├── hud/              # 錄音狀態 HUD
│   │       │   └── HudWindow.tsx
│   │       ├── settings/         # 設定視窗
│   │       │   └── SettingsWindow.tsx
│   │       └── App.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── electron-builder.json
│
├── admin-portal/                 # Admin Dashboard (React + shadcn/ui)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── HistoryPage.tsx
│   │   │   ├── VocabularyPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui 元件
│   │   │   ├── StatsCard.tsx
│   │   │   ├── TranscriptList.tsx
│   │   │   └── VocabularyEditor.tsx
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── shared/                       # 跨專案共用
│   ├── types.ts                  # TypeScript 型別
│   ├── constants.ts              # 共用常數
│   └── api-client.ts             # API 呼叫封裝
│
├── .github/
│   └── workflows/                # CI/CD（未來）
│
├── CHANGELOG.md                  # 版本變更日誌
├── package.json                  # Root（workspaces）
├── LICENSE
└── README.md
```

---

## 8. 資料庫設計 (SQLite)

```sql
-- 轉錄歷史
CREATE TABLE transcriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_text TEXT NOT NULL,                -- STT 原始輸出
  refined_text TEXT,                     -- LLM 潤飾後
  language TEXT DEFAULT 'zh-TW',         -- 'zh-TW' | 'en'
  duration_ms INTEGER,                   -- 音頻時長（毫秒）
  stt_engine TEXT DEFAULT 'groq',        -- 'groq' | 'groq-turbo' | 'local'
  stt_latency_ms INTEGER,               -- STT 處理延遲
  llm_latency_ms INTEGER,               -- LLM 潤飾延遲
  audio_path TEXT,                       -- 可選：原始音頻路徑
  source TEXT DEFAULT 'mac-mini',        -- 'mac-mini' | 'macbook-air'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 全文搜尋索引
CREATE VIRTUAL TABLE transcriptions_fts USING fts5(
  raw_text, refined_text,
  content=transcriptions, content_rowid=id
);

-- 自訂詞彙
CREATE TABLE vocabulary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,                    -- 正確寫法（如：Anthropic）
  alternatives TEXT,                     -- 可能的誤聽 JSON（如：["安索匹克"]）
  category TEXT DEFAULT 'other',         -- person / place / tech / brand / other
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 系統設定（key-value store）
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 預設設定
INSERT INTO settings (key, value) VALUES
  ('stt_engine', 'groq'),
  ('stt_fallback', 'local'),
  ('whisper_model', 'small'),
  ('ollama_model', 'qwen2.5:7b'),
  ('language', 'zh-TW'),
  ('hotkey_mode', 'toggle'),
  ('hotkey_key', 'ctrl+`'),
  ('auto_paste', 'true'),
  ('ai_refinement', 'true'),
  ('groq_api_key', ''),
  ('server_url', 'http://localhost:3100'),
  ('shared_password_hash', '');
```

> 注意：v1 不設 users 表。認證採共用密碼制，password hash 存在 settings 表中。未來升級帳號系統時再加 users 表。

---

## 9. API 設計

### 認證

| Method | Path | 說明 |
|--------|------|------|
| POST | /api/auth/verify | 驗證共用密碼，回傳 session token |
| POST | /api/auth/set-password | 設定/修改共用密碼（首次使用時） |

### 轉錄（核心）

| Method | Path | 說明 |
|--------|------|------|
| POST | /api/transcribe | 上傳音頻，回傳轉錄 + 潤飾結果 |
| WS | /ws/transcribe | WebSocket 即時串流轉錄 |

Response 範例：
```json
{
  "id": 42,
  "raw_text": "欸我跟你說喔那個專案好像要延期了因為工程師那邊還沒搞定",
  "refined_text": "我跟你說，那個專案好像要延期了，因為工程師那邊還沒搞定。",
  "stt_engine": "groq",
  "stt_latency_ms": 320,
  "llm_latency_ms": 850,
  "total_latency_ms": 1170,
  "language": "zh-TW"
}
```

> 注意潤飾後的文字保留了口語感（「我跟你說」而非「該專案可能需要延期」）。

### 歷史

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/history?q=&page=&limit= | 轉錄歷史（分頁 + 全文搜尋） |
| GET | /api/history/:id | 單筆詳情 |
| DELETE | /api/history/:id | 刪除單筆 |

### 詞彙

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/vocabulary | 列出所有 |
| POST | /api/vocabulary | 新增 |
| PUT | /api/vocabulary/:id | 修改 |
| DELETE | /api/vocabulary/:id | 刪除 |
| POST | /api/vocabulary/import | 批次匯入 |
| GET | /api/vocabulary/export | 批次匯出 |

### 設定

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/settings | 取得所有設定 |
| PUT | /api/settings | 更新設定 |

### 統計

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/stats/overview | 今日/本週/本月總覽 |
| GET | /api/stats/daily?range=30 | 每日趨勢 |

### 健康檢查

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/health | Server 狀態 + Ollama 連線 + Groq 可用性 |

---

## 10. 核心流程

### 語音轉錄流程

```
使用者在 Electron App 操作
    │
    ├── Toggle 模式：按 Ctrl+` 開始
    │   └── 再按 Ctrl+` 結束（或按 Esc 取消）
    │
    └── Hold 模式：按住 Ctrl+` 開始
        └── 放開結束（或按 Esc 取消）
    │
    ▼ [未被 Esc 取消]
    │
錄音 → 音頻編碼 WAV 16kHz mono
    │
    ▼
發送至 Server（POST /api/transcribe 或 WebSocket）
    │
    ▼
STT Manager
    │
    ├── [正常] Groq whisper-large-v3
    │   POST https://api.groq.com/openai/v1/audio/transcriptions
    │   Body: { file, model: "whisper-large-v3", language: "zh" }
    │
    └── [Groq 失敗] 自動 fallback → whisper.cpp small
        whisper-cpp -m ggml-small.bin -l zh -f audio.wav
    │
    ▼
原始轉錄文字
    │
    ▼ [AI 潤飾啟用時]
    │
Ollama (qwen2.5:7b) 潤飾（保留口語感）
    │
    ▼
儲存至 SQLite → 回傳結果
    │
    ▼
Electron App：寫入剪貼簿 → 模擬 Cmd+V → 貼到游標處
```

---

## 11. 遠端存取

**方案：Tailscale**

Mac Mini 和 MacBook Air 都安裝 Tailscale，自動組成私有網路。MacBook Air 上的 Electron App 設定 Server URL 為 Mac Mini 的 Tailscale IP（如 `http://100.x.x.x:3100`）。

設定步驟：
1. Mac Mini 和 MacBook Air 各自安裝 Tailscale
2. 用同一帳號登入
3. 在 MacBook Air 的 Electron App 設定中，將 Server URL 改為 Mac Mini 的 Tailscale IP

---

## 12. 環境需求

| 元件 | 版本/規格 | 安裝方式 |
|------|----------|----------|
| macOS | M4 Mac Mini | 預裝 |
| Node.js | >= 22.x | brew install node |
| ffmpeg | 最新 | brew install ffmpeg |
| Ollama | 最新 | brew install ollama |
| whisper.cpp | 最新 | brew install whisper-cpp |
| Qwen 2.5:7B | ~4.7 GB | ollama pull qwen2.5:7b |
| whisper small | ~466 MB | whisper-cpp-download-model small |
| Groq API Key | 免費註冊 | console.groq.com |
| Tailscale | 免費 | tailscale.com |

**記憶體（M4 16 GB）：**

| 元件 | RAM |
|------|-----|
| macOS 系統 | ~3-4 GB |
| Ollama + Qwen 2.5:7B | ~5 GB（閒置自動卸載） |
| whisper.cpp small | ~0.5 GB（僅 fallback 時） |
| Node.js Server | ~0.1 GB |
| 剩餘可用 | ~6-7 GB |

---

## 13. 版本管理

### Semantic Versioning

| 類型 | 版本格式 | 範例 |
|------|---------|------|
| Patch | 1.0.X | Bug 修復、文件微調 |
| Minor | 1.X.0 | 新功能（向下相容） |
| Major | X.0.0 | 破壞性變更、重大重構 |

### 版本里程碑

| 版本 | 階段 | 內容 |
|------|------|------|
| v0.1.0 | Phase 1 | Server 核心 MVP（API + STT + LLM） |
| v0.2.0 | Phase 2 | Electron App（快捷鍵 + 貼上 + HUD） |
| v0.3.0 | Phase 3 | Admin Portal + 歷史搜尋 + 統計 |
| v1.0.0 | Phase 4 | 生產就緒（打包 + 部署 + 文件） |

### Git 慣例

- 分支策略：`main`（穩定）+ `develop`（開發）+ `feature/*`（功能分支）
- Commit 訊息：Conventional Commits（`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`）
- Release tag：`v0.1.0`, `v0.2.0`, ...

---

## 14. 開發路線圖

```
Week 1-2:   Phase 1 → v0.1.0
            Server 核心 + Groq API + whisper.cpp fallback + Ollama 潤飾 + 詞彙表

Week 3-4:   Phase 2 → v0.2.0
            Electron App (Toggle/Hold 快捷鍵 + Esc 取消 + 貼上 + HUD + 托盤)

Week 5-6:   Phase 3 → v0.3.0
            Admin Portal + 全文搜尋 + 統計

Week 7-8:   Phase 4 → v1.0.0
            打包 .dmg + LaunchAgent + Tailscale 指南 + README
```

---

## 15. 已確認事項

| 項目 | 決策 |
|------|------|
| GitHub Repo | https://github.com/proftars/my_safer_typeless.git |
| 架構 | 精簡 Electron App + Express Server |
| STT 引擎 | Groq large-v3 為主，whisper.cpp small 為 fallback |
| LLM | Ollama + Qwen 2.5:7B |
| 潤飾風格 | 相對保留口語感 |
| 快捷鍵 | Toggle Ctrl+`（預設）/ Hold 可選 / Esc 取消 |
| 支援語言 | 繁體中文 + 英文 |
| 認證 | 共用密碼制（v1） |
| 遠端 | Tailscale |
| 裝置（v1） | Mac Mini + MacBook Air |
| 版本管理 | Semantic Versioning |
| Groq 帳號 | Kevin 自行註冊中 |

---

## 16. 下一步

1. Kevin 完成 Groq 帳號註冊，取得 API Key
2. 確認 GitHub repo 可存取（public/private、push 權限）
3. Kevin 確認本文件無誤後，開始 Phase 1 開發
