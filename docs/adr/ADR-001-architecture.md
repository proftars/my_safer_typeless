# ADR-001: 系統架構選型

**Status:** Accepted
**Date:** 2026-03-25
**Deciders:** Kevin (Owner)

## Context

我們要打造一個 Typeless（語音轉文字 SaaS）的開源自託管替代品。核心需求是：全域快捷鍵按下即錄音、轉錄後自動貼到游標處、支援自訂詞彙、AI 潤飾。Mac Mini M4 作為 24/7 主伺服器，MacBook Air 透過 Tailscale 遠端使用。

市面上有幾個開源專案可作為起點：OpenWhispr（Electron + React，功能豐富）和 SayIt（Tauri + Vue + Rust，介面精美）。我們需要決定是 Fork 現有專案還是自建。

**約束條件：**
- 維護者為個人開發者，技術能力以 TypeScript/JavaScript 為主
- 優先級：易維護 > 穩定性 > 擴展性
- 硬體：Mac Mini M4 16 GB RAM
- 目標裝置（v1）：Mac Mini + MacBook Air

## Decision

採用**精簡版 Electron App + 輕量 Express Server** 架構，參考 OpenWhispr 的核心模組和 SayIt 的 Admin Portal 設計，但不直接 Fork 任一專案。

## Options Considered

### Option A: Fork OpenWhispr 全部

| Dimension | Assessment |
|-----------|------------|
| Complexity | High - 龐大的 codebase 含 AI Agent、會議轉錄、筆記系統、雲端同步 |
| Cost | Free - 開源 MIT |
| Scalability | High - 已有多平台支援 |
| Team familiarity | Medium - Electron + React 熟悉，但需學習其內部架構 |
| Maintenance | High - 追蹤上游更新困難，大量無關功能需維護 |

**Pros:** 功能最完整，最快能跑起來，已有成熟的快捷鍵和貼上邏輯
**Cons:** 功能太多導致維護負擔重，客製化困難，無 Server 模式（純桌面 App）

### Option B: 精簡版 Electron App + Express Server（選定方案）

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium - 只寫需要的功能 |
| Cost | Free |
| Scalability | Medium-High - Server 模式天然支援多裝置 |
| Team familiarity | High - 純 TypeScript/JavaScript |
| Maintenance | Low - 程式碼量小，只有自己寫的東西 |

**Pros:** 程式碼量最小，只需一種語言，好維護，Server 與 App 分離穩定性好，天然支援多裝置
**Cons:** 初始開發量比 Fork 稍大，需要自己實作快捷鍵和貼上邏輯

### Option C: Tauri + Vue（類 SayIt 架構）

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium-High - 需要 Rust 後端 |
| Cost | Free |
| Scalability | Low - Tauri 是純桌面 App，不支援 Server 模式 |
| Team familiarity | Low - 需要學 Rust |
| Maintenance | High - Rust + Vue 兩種技術棧 |

**Pros:** App 體積最小（<10 MB vs Electron 200+ MB），效能最好
**Cons:** 需要 Rust（維護門檻高），不支援 Server 模式（無法讓其他裝置透過網路存取），Vue 與 Electron 共用元件困難

### Option D: 純 Server + Web Client（無桌面 App）

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low - 只需 Web 技術 |
| Cost | Free |
| Scalability | High - 任何裝置都能用 |
| Team familiarity | High - 純 Web |
| Maintenance | Lowest |

**Pros:** 最簡單，任何有瀏覽器的裝置都能用
**Cons:** 無法做全域快捷鍵、無法做游標處自動貼上（瀏覽器限制），體驗與 Typeless 差距最大

## Trade-off Analysis

核心取捨在於**開發便利性** vs. **Typeless 體驗還原度**：

Option D 最簡單但體驗差距太大（無全域快捷鍵和游標處貼上）。Option A 體驗最好但維護負擔重。Option C 技術門檻太高（Rust）。

Option B 在易維護和體驗之間取得平衡：用 Electron 保留桌面級體驗（快捷鍵 + 貼上），用 Server 支援多裝置，只寫需要的功能保持程式碼精簡。

**關鍵決策：參考而非 Fork**
OpenWhispr 的快捷鍵、貼上、whisper.cpp 整合邏輯是公開的且寫得好，我們可以直接參考其實作方式，但在自己的程式碼中重新撰寫。這比 Fork 後刪功能更乾淨、更好維護。

## Consequences

**變得更容易的事：**
- 日常維護：程式碼量小，只有自己寫的東西
- 客製化：想改什麼改什麼，不用擔心上游衝突
- 除錯：架構簡單，出問題容易定位
- 多裝置：MacBook Air 天然可透過 Tailscale 存取 Server

**變得更難的事：**
- 初始開發：比直接 Fork 慢，需要從零建立框架
- 新功能追加：OpenWhispr 已有的功能（會議轉錄、筆記等）要用時需自己實作

**未來需要重新審視的事：**
- 如果未來要支援 iPhone / Android，需要評估是否加入 Web Client 或原生 App
- 如果使用者增加（不只家人），認證系統需從共用密碼升級為帳號系統
- 如果 Groq API 價格變動或服務中斷，需要評估其他雲端 STT 供應商

## Action Items

1. [x] 完成技術規劃文件 v1.2
2. [ ] Kevin 註冊 Groq API Key
3. [ ] 確認 GitHub repo 存取權限
4. [ ] 開始 Phase 1：Server 核心 MVP (v0.1.0)
