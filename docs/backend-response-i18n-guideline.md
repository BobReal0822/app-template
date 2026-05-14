# 后端响应多语言最佳实践（code + messageKey + messageParams）

## 背景

项目前端已支持多语言，且接口已使用 `code` 作为统一业务状态标识。  
为了让后端返回给用户的提示也支持多语言，推荐采用：

- 后端返回**语义标识**（`code` / `messageKey` / `messageParams`）
- 前端根据当前 locale 进行本地化渲染

不要让后端直接返回最终展示文案并由前端原样显示。

---

## 最佳方案结论

`code` 与 `messageKey` 不冲突，二者互补：

- `code`：机器可读，负责业务分类、分支判断、埋点统计
- `messageKey`：人类可读文案键，负责 i18n 展示
- `messageParams`：插值参数，负责动态文案变量

一句话：  
`code` 解决“程序怎么处理”，`messageKey + messageParams` 解决“用户看到什么语言文案”。

---

## 推荐响应结构

```ts
interface ApiResponse<T = unknown> {
  code: number; // 必填：0 成功，非 0 失败
  message?: string; // 可选：仅调试/日志，不用于 UI 直接展示
  messageKey?: string; // 可选：如 "errors.4006" 或 "videoInsight.taskQueued"
  messageParams?: Record<string, string | number | boolean>; // 可选：i18n 插值参数
  data: T;
}
```

### 字段说明

- `code`：必须稳定，不随文案变化
- `messageKey`：建议稳定且语义化，避免频繁改名
- `messageParams`：无固定全局字段，按 `messageKey` 需要定义
- `message`：不建议前端直接展示，避免安全和一致性问题

---

## 前端展示优先级（必须统一）

1. 优先使用 `messageKey + messageParams` 本地化展示
2. 若无 `messageKey`，回退到 `errors.${code}`
3. 若仍无匹配，回退 `errors.default`
4. 不直接展示后端 `message`

---

## Toast 规范

- `code === 0`：`toast.success` 或不提示
- `code !== 0`：`toast.error`
- `toast.info` 仅用于非失败状态通知（例如“任务已提交，后台处理中”）

不要把真实失败提示做成 `info`，否则会弱化用户感知。

---

## messageParams 是否必要

### 需要时

当文案包含动态信息时，`messageParams` 非常必要，例如：

- `common.retryAfter`：`{ seconds: 30 }`
- `videoInsight.taskQueued`：`{ position: 3, etaMinutes: 5 }`
- `billing.quotaExceeded`：`{ used: 120, limit: 100, resetAt: "2026-03-10" }`

### 不需要时

纯静态错误文案（例如 `errors.5001`）可仅返回 `code` 或 `messageKey`。

---

## 安全要求

- 前端禁止直接显示后端原始错误详情
- 后端响应给用户的内容应为通用可展示信息
- 详细错误仅记录在服务端日志中
- `messageParams` 中不得包含敏感信息（token、密钥、内部路径、堆栈等）

---

## 与现有项目的兼容落地

当前项目已支持 `code`，可采用渐进式迁移：

1. 保留现有 `code` 体系（不破坏已有逻辑）
2. 在响应类型中增加可选字段：`messageKey`、`messageParams`
3. 前端统一改为“`messageKey -> code -> default`”的展示策略
4. 旧接口保留 `message` 兼容，但 UI 不再直接展示

---

## 最终建议

在本项目中，推荐默认策略为：

- **必有**：`code`
- **按需有**：`messageKey`
- **动态文案时有**：`messageParams`
- **可有但不直显**：`message`

这套方案能同时满足多语言一致性、前后端解耦、可观测性和安全性。
