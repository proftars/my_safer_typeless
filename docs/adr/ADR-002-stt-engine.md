# ADR-002: STT 引擎選型

**Status:** Accepted
**Date:** 2026-03-25
**Deciders:** Kevin (Owner)

## Context

語音轉文字（STT）是本專案的核心功能。需要在中文辨識準確度、延遲、成本、離線能力之間做取捨。使用者網路環境穩定，不常斷網，對中文口語辨識準確度要求高。

## Decision

採用 **Groq whisper-large-v3 為預設引擎、本地 whisper.cpp small 為 fallback** 的混合策略。

## Options Considered

### Option A: 純本地 whisper.cpp

| Dimension | Assessment |
|-----------|------------|
| 中文準確度 | Medium - base 模型約 70-80%，small 約 85% |
| 延遲 | 1-5 秒（依模型大小） |
| 成本 | $0 |
| 離線 | 完全支援 |
| RAM 佔用 | 0.3-0.5 GB |

**Pros:** 完全免費、隱私最好、永不斷線
**Cons:** 中文準確度明顯低於雲端方案

### Option B: Groq API 為主 + 本地 fallback（選定方案）

| Dimension | Assessment |
|-----------|------------|
| 中文準確度 | High - large-v3 約 95%+ |
| 延遲 | <1 秒（Groq）/ 2-5 秒（fallback） |
| 成本 | $0.6-6.7/月（依用量） |
| 離線 | 支援（自動切換） |
| RAM 佔用 | 0.5 GB（僅 fallback 時） |

**Pros:** 中文準確度最高，延遲最低，斷網有 fallback
**Cons:** 依賴外部服務（但有 fallback），有月費（但極低）

### Option C: OpenAI Whisper API

| Dimension | Assessment |
|-----------|------------|
| 中文準確度 | High - 約 95% |
| 延遲 | 1-2 秒 |
| 成本 | $0.006/分鐘 ≈ $10-20/月 |
| 離線 | 不支援 |

**Pros:** 準確度高、穩定
**Cons:** 比 Groq 慢且貴 3-5 倍

## Consequences

- Groq API 成為外部依賴，需要網路和 API Key
- STT Manager 需實作自動切換邏輯和重試機制
- 未來如果 Groq 價格上漲或服務中斷，可快速切換到 OpenAI 或其他供應商（介面相容）
