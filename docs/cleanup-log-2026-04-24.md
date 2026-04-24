# 版本與文件同步清理紀錄

**日期**：2026-04-24
**執行者**：Claude Code
**Baseline commit**：`fd5d332` (feat: add recorder window HTML for Electron audio capture)
**目標**：在開始端到端驗收之前，把散亂的版本號、CHANGELOG、過時文件、廢棄依賴統一清理

---

## 決定

採用「方案 A — 回歸 plan 文件精神」。全專案統一為 **v0.3.0**，Phase 4 打包完成後才發 **v1.0.0**。

### 版本號對應

| 版本 | 對應內容 | 日期（git commit 日） |
|---|---|---|
| v0.1.0 | Server MVP (API + STT + LLM + 詞彙表 + 歷史 + 設定 + 統計) | 2026-03-25 |
| v0.1.1 | Node.js 24 相容 + Qwen3 升級 + FormData 修復 | 2026-03-25 |
| v0.2.0 | Admin Portal (React + Tailwind, Login/Dashboard/History/Vocabulary/Settings) | 2026-03-25 |
| v0.3.0 | Electron Menu Bar Client (Hotkey/Tray/Recorder/Clipboard) | 2026-03-26 |

> 註：原 plan 文件第 14 章路線圖預計 v0.2.0=Electron、v0.3.0=Admin Portal，但實際開發順序相反（Admin Portal 先完成）。CHANGELOG 依 git 實際順序排，plan 文件保留原始規劃不動（它描述的是原始計畫意圖，不是歷史紀錄）。

---

## 變更清單

### 1. 版本號統一（5 個 package.json）

| 檔案 | 變更前 | 變更後 |
|---|---|---|
| `package.json`（root） | `0.1.0` | `0.3.0` |
| `shared/package.json` | `0.1.0` | `0.3.0` |
| `server/package.json` | `1.0.0` | `0.3.0` |
| `admin-portal/package.json` | `1.0.0` | `0.3.0` |
| `electron/package.json` | `1.0.0` | `0.3.0` |

### 2. Server 程式碼：移除寫死的版本號

`server/src/index.ts` 改為從 `package.json` 讀取版本：
- 第 49 行 `version: '1.0.0'` → `version: APP_VERSION`
- 第 75 行 `My Safer Typeless Server v1.0.0` → 動態版本
- 新增：啟動時讀取 `package.json` 的 version 欄位

### 3. Electron 廢棄依賴移除

`electron/package.json` 移除未使用的依賴（已確認全專案無 import）：
- `node-record-lpcm16: ^1.0.0`
- `wav: ^1.0.2`

> 現況：Electron 錄音改用 Web Audio API（在 hidden BrowserWindow 裡），這兩個 Node 原生模組從未被使用。

### 4. CHANGELOG 重寫

原 CHANGELOG 只有 `v1.0.0` 跟 `v1.1.0`，且只涵蓋 server。
改寫後包含 v0.1.0 / v0.1.1 / v0.2.0 / v0.3.0 四個版本。

### 5. README.md 修正過時描述

- 第 71 行 `Electron + React (coming in v0.2.0)` → 改為已完成
- 第 72 行 `React + shadcn/ui (coming in v0.3.0)` → 改為已完成（另：實際用 Tailwind，不是 shadcn/ui）

### 6. docs/setup-guide.md 修正

- 移除 `第五部分：建置 Web Client`（client-web 資料夾不存在，專案實際是 electron/）
- 第 127-135 行的啟動訊息範本已過時（顯示 "Web Client" + "WebSocket"），改為實際輸出格式

### 7. docs/adr/ADR-001-architecture.md Action Items 更新

- `[ ] 開始 Phase 1：Server 核心 MVP (v0.1.0)` → `[x] 完成 Phase 1/2/3`
- 新增 `[ ] Phase 4 打包與部署` 項目

---

## 回滾方式

所有變更都在單一工作區進行，尚未 commit。回滾方式（任選）：

### 全部回滾（所有變更）
```bash
cd /Users/tars/Documents/My_Safer_Typeless/.claude/worktrees/dazzling-banzai-38ad78
git restore .
# 刪除本清理紀錄檔
rm docs/cleanup-log-2026-04-24.md
```

### 單檔回滾
```bash
git restore <file-path>
```

### 已 commit 之後的回滾
若之後 commit 了再想回滾：
```bash
# 查看變更 commit
git log --oneline

# 回滾到清理前（baseline: fd5d332）
git reset --hard fd5d332
```

---

## 未觸及項目（供驗收後另外處理）

- `docs/my-safer-typeless-plan.md` 的路線圖（v0.2.0=Electron, v0.3.0=Admin Portal）保持原狀，因為它描述原始計畫意圖
- 任何實際業務邏輯（STT / Ollama / 錄音 / UI 元件 / API 路由 / DB schema）完全未動
- `.env.example`、tsconfig、vite.config 等設定檔未動
