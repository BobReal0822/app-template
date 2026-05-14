# Pricing 与 Credits 技术架构与配置清单

本文基于当前代码实现，梳理 `pricing` 与 `credits` 的技术架构、已确认的业务规则，并明确上线前仍需手动完成的配置项。

> **当前阶段：MVP**

> **运行时（2026）**：计费、credits、Stripe webhook 与定价读取均在 **Next.js**（`src/app/api/**`、`src/server/**`）与 **Neon + `@app/db`** 上运行。

---

## 1. 技术架构（已落地）

### 1.1 定价数据分层

- 后端结构化定价真源：`src/server/config/pricing.ts`
  - 维护套餐 code、月/年价格、套餐额度
  - Stripe `priceId` 通过环境变量按目标环境注入（Vercel / `.env.*` 的 `STRIPE_PRICE_*`，staging / prod 分离）
  - 不返回 comparison/faq 文案，避免与前端 i18n 冲突
- 前端展示真源：`messages/en.json`、`messages/zh.json`
  - 定价页文案（comparison、faq、按钮文案、标题文案）走 `next-intl`
- 定价读取接口：`GET /api/billing/pricing-config`
  - Route Handler：`src/app/api/billing/pricing-config/route.ts` → `src/server/handlers/billing-pricing-config.ts`

### 1.2 Stripe 支付接入（最简托管）

- `POST /api/billing/create-checkout-session`
  - 仅用于 **Free → 付费套餐的首次订阅**（新建订阅）
  - MVP 阶段不支持 credit pack，`purchaseType` 只接受 `'subscription'`
- `POST /api/billing/create-portal-session`
  - 跳转 Stripe Billing Portal
  - 用于：管理订阅、套餐升降级、支付方式管理、查看 invoice
- `POST /api/webhooks/stripe`
  - Stripe webhook 回调处理（含签名校验）
  - 监听事件：`checkout.session.completed` / `invoice.paid` / `customer.subscription.updated` / `customer.subscription.deleted`
- 路由注册：Next.js App Router `src/app/api/billing/**`、`src/app/api/webhooks/stripe/route.ts` 等

### 1.3 Credits 扣费与成本引擎

- 统一成本引擎：`src/server/services/cost-engine.ts`
  - 图片：按 `baseCredits × batchSize × pricingMultiplier` 计算
    - `pricingMultiplier` 当前为 model-aware（`nano-banana-2` 与 `nano-banana-pro` 的分辨率规则不同）
  - 视频：按 `baseCredits × (durationSeconds / 5) × pricingMultiplier` 计算
    - `pricingMultiplier` 为 model-aware，并结合 `generationType`、`resolution`、`generate_audio`
    - 已覆盖 `veo-3.1`、`veo-3.1-fast`、`sora-2-pro`、`kling-o3-standard`、`kling-o3-pro` 的差异化价格逻辑
- 已接入入口：
  - `src/server/handlers/gen-image.ts`
  - `src/server/handlers/gen-video.ts`
  - `src/server/handlers/product-to-photo.ts`
  - `src/server/handlers/url-to-video-generate.ts`
- 原子扣费与回滚：`src/server/services/credits.ts`
  - 提交任务前扣费，提交失败自动退款（`refundUserCredits`）
  - 扣费使用 Postgres 原子 `UPDATE … WHERE credits >= amount`（`packages/db/src/credits.ts` / `src/server/services/credits.ts`，防并发竞争）
  - DB 层有 `credits >= 0` 约束，余额不足时扣费自动失败

### 1.4 前端统一入口

- billing API：`src/lib/billing/api.ts`
- pricing hook：`src/hooks/use-pricing-config.ts`
- billing actions hook：`src/hooks/use-billing-actions.ts`
- 相关页面与弹窗：
  - `src/app/[locale]/(marketing)/pricing/pricing-page-content.tsx`
  - `src/components/app/upgrade-modal.tsx`
  - `src/components/app/insufficient-credits-modal.tsx`
  - `src/components/providers/error-handler-provider.tsx`
- 用户侧订阅与额度状态由 Neon `users` 表承载，前端经 `userData`（含 `subscriptionBillingCycle`）消费；字段语义与发点规则见 **§2.3、§2.3.1**。Webhook 在 `applyPlanToUser`、订阅删除等路径写入 `subscription_billing_cycle`。

### 1.5 定价页结构（marketing 组件化）

`pricing-page-content.tsx` 已拆分为 section 组件：

- `_components/hero-section.tsx`
- `_components/plans-section.tsx`
- `_components/comparison-section.tsx`
- `_components/faq-section.tsx`
- `_components/cta-section.tsx`

---

## 2. 业务规则（已确认）

### 2.1 套餐结构

真源：`src/server/config/pricing.ts`（金额、月额度、Stripe `priceId`）。对外文案以定价页 i18n 为准。

| 套餐       | 月付参考（USD） | 年付月均参考（USD） | 每月 Credits（发放粒度） |
| ---------- | --------------- | ------------------- | ------------------------ |
| Free       | $0              | —                   | 15                       |
| Starter    | $27             | $19                 | 150                      |
| Pro S      | $79             | $56                 | 500                      |
| Pro M      | $149            | $105                | 1,000                    |
| Pro L      | $279            | $199                | 2,000                    |
| Enterprise | 定制            | 定制                | 定制                     |

**年付与点数：** Stripe 侧为 **年付账单**（`subscription_billing_cycle = yearly`），但 **Credits 按「每月额度」按月 SET 发放**（见 §2.3），不再采用「年付一次性发放 12× 月额度」模型。调度与 webhook 协同见 `src/app/api/cron/grant-yearly-monthly-credits/route.ts` 与 `stripe-webhook-support.ts` 中的 `applyPlanToUser`。

### 2.2 订阅流程规则

**新订阅（Free → 付费）：**

- 走 Stripe Checkout Session（`mode: 'subscription'`）
- `checkout.session.completed` webhook 触发 → 更新套餐 + 重置 credits

**套餐变更（付费 → 更高付费）：**

- 走 Stripe Billing Portal
- Stripe 自动处理差价 proration，**账单日不变**
- `invoice.paid` webhook 触发（proration invoice）→ 更新套餐 + 重置 credits

**取消订阅：**

- 走 Stripe Billing Portal
- 若 Portal 配置为 **本计费周期结束时取消**（非立即取消）：在周期结束前会收到 `customer.subscription.updated`（同步「待取消」与周期结束时间，见下文 Customer Portal 与 `cancel_at` / `cancel_at_period_end`）；周期真正结束后收到 `customer.subscription.deleted` → 降回 Free，planCredits 清零
- 若配置为 **立即取消**：通常更快进入 `customer.subscription.deleted`，中间状态以 Stripe 实际事件为准
- Credits 余额不做特殊处理（保留至自然耗尽）

**不支持同等级重新订阅：**

- 订阅每月自动续费，`invoice.paid` 自动重置 credits，无需用户手动操作

### 2.3 Credits 重置规则

所有订阅相关事件在 **发放/重置** 用户余额时，统一使用 **SET（整段替换）** 到当期应得额度，而非 **ADD（累加）**，避免续费叠加导致余额无限增长。

**当前产品约定（与代码一致）：**

- **月付订阅（`subscription_billing_cycle = monthly`）**：每个计费周期（通常与 `invoice.paid` 对齐）将 `credits` **SET** 为当套餐的 **月额度**（即 `planCredits` 对应的数值）。
- **年付订阅（`subscription_billing_cycle = yearly`）**：Stripe 仍按 **年** 开票，但 **Credits 按「每月额度」按月 SET**（与月付同一数字来源：`getSubscriptionPlanCredits(planCode)`）。具体由 **`invoice.paid`、套餐变更 webhook** 以及 **`grantYearlyMonthlyCredits` 定时任务**（按订阅 metadata 中的发点节奏）触发 `applyPlanToUser` / `resetUserCredits`，**不再**在年付续费时一次性 SET `planCredits × 12`。

实现入口：`src/server/handlers/webhooks/stripe/support.ts` → `applyPlanToUser`；年付按月发放：`src/app/api/cron/grant-yearly-monthly-credits/route.ts`。调度时间（UTC）：`grantFreeMonthlyCredits` **01:00**，`grantYearlyMonthlyCredits` **01:30**，避免同一时刻叠加载。

**触发时机与典型 credits 值（示意）：**

| 事件                | 路径 / webhook                                     | credits 变更（典型）                                |
| ------------------- | -------------------------------------------------- | --------------------------------------------------- |
| Free → 付费首次订阅 | `checkout.session.completed` / 后续 `invoice.paid` | SET = 当月套餐 **月额度**                           |
| 月付周期续费        | `invoice.paid`                                     | SET = **月额度**                                    |
| 年付（按月发点）    | 定时任务 + `applyPlanToUser` 等                    | SET = **月额度**（非 12×）                          |
| 套餐升级（Portal）  | `invoice.paid`（proration）等                      | SET = 新套餐 **月额度**（以当次逻辑为准）           |
| 取消订阅            | `customer.subscription.deleted`                    | `planCredits` 清零；`credits` 不强制清零（见 §2.2） |

#### 2.3.1 `users` 表：`planCredits` 与 `subscriptionBillingCycle`

| 字段（DB）                 | 含义                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planCredits`              | 当前套餐的 **每月权益额度**（与 `pricing.ts` 的 `monthlyCredits` 一致）：发点时 SET 的目标值、设置页「本周期用量」进度条的 **分母**（与余额 `credits` 对比）。 |
| `subscriptionBillingCycle` | **Stripe 计费周期**：`monthly` \| `yearly`（年付只表示 **如何向 Stripe 付款**，与 §2.3 的按月发点配合）。                                                      |

扣费只减少 `credits`，**不**修改 `planCredits`。`customer.subscription.updated` 若仅同步周期结束、取消标志等，会 **原样保留** `planCredits`（见 `handle-subscription-updated.ts`）；改套餐与发点仍以 `invoice.paid` / `applyPlanToUser` 为准。

历史说明：曾单独存在 `period_credits_cap`，与 `plan_credits` 在实现中始终同值写入，已移除，统一用 `planCredits`。

**SET 而非 ADD 的设计依据：**

- 使用 ADD 会导致 credits 累积（月度续费叠加，无限增长的 Bug）
- SET 保证用户始终清楚自己有多少 credits，与套餐描述一致
- 升级时给满额（而非按剩余天数 proration）是行业惯例，实现简单且对用户更友好
- 实现：`src/server/services/credits.ts` → `resetUserCredits()`，通过 Drizzle / SQL 直接 `SET` credits（`resetUserCredits`）

### 2.4 Credits 耗尽规则

- Credits 耗尽后：**硬停止**，任务提交被拒绝，不自动超额计费
- 触发 `InsufficientCreditsModal`，按用户当前套餐等级展示不同内容：

| 用户套餐                     | 弹窗行为                                                |
| ---------------------------- | ------------------------------------------------------- |
| Free / Starter               | 引导升级 → 打开 `UpgradeModal`                          |
| Pro L / Enterprise（最高档） | 显示 credits 重置日期 + "Contact Sales" 联系 Enterprise |

- 不提供 credit 加油包（MVP 阶段）

### 2.5 套餐升级弹窗规则（UpgradeModal）

升级弹窗根据用户当前套餐等级，对每个套餐卡片的按钮行为进行分叉：

| 场景                     | 按钮文案              | 行为                                         |
| ------------------------ | --------------------- | -------------------------------------------- |
| 当前套餐                 | "Current Plan"        | 禁用                                         |
| 低于当前套餐             | "Manage Subscription" | 跳转 Stripe Portal（降级走 Portal）          |
| 高于当前，用户是 Free    | "Subscribe"           | 走 Checkout（新建订阅）                      |
| 高于当前，用户是付费用户 | "Switch to [Plan]"    | 跳转 Stripe Portal（保留账单日 + proration） |
| Enterprise               | "Contact Sales"       | 打开 `mailto:` 邮件                          |

**付费用户升级走 Portal 的原因：**

- Checkout 会创建新订阅，导致同一用户存在两个并行订阅被双重扣款
- Portal 使用 `subscriptions.update()` 变更现有订阅，账单日不变，Stripe 自动 proration

### 2.6 Invoice 历史记录

- MVP 阶段：点击相关按钮跳转 Stripe Billing Portal，由 Stripe 托管 invoice 展示与 PDF 下载
- 无需额外开发

---

## 3. 上线前必须完成的配置

### 3.1 Stripe Dashboard 配置

1. 创建产品与价格（**每个套餐一个 Product**，内含月付 + 年付两条 Price；见 `docs/stripe-product-catalog-copy.md`）：
   - Starter（月付/年付）
   - Pro S / Pro M / Pro L（各：月付/年付）
2. 配置 **Customer / Billing Portal**（Dashboard → **Settings → Billing → Customer portal**），至少启用：套餐管理、支付方式更新、查看 invoice。并与下列业务选项对齐（与当前产品/代码假设一致）：

   **Cancellations（取消订阅）**
   - 开启 **Cancel subscriptions**。
   - 建议选择 **Cancel at end of billing period**（而非 _Cancel immediately_），与「本周期仍可使用已付费权益」一致。
   - 用户确认取消后，Stripe 会**排程**在周期末终止订阅；Subscription 对象上可能体现为 `cancel_at`（周期结束时间戳）、`cancel_at_period_end`，或依 [API 版本](https://docs.stripe.com/api/subscriptions/object) 出现仅设置 `cancel_at` 而 `cancel_at_period_end` 为 `false` 等情况。
   - 代码侧用 `subscriptionPendingCancellation()` 统一识别「待取消」：`cancel_at_period_end === true` **或**（非终态 `status` 且已设置 `cancel_at`）。实现：`src/server/handlers/webhooks/stripe/support.ts`。

   **When customers change plans or quantities（变更套餐/数量时的计费）**
   - 当前推荐与截图一致：**Charge or credit the full difference**，且 **Invoice prorations immediately at the time of the update**（升级或加价时立即开票结算差价）。

   **Downgrades（降级）**
   - **When switching to a cheaper plan**：**Wait until end of billing period to update**
   - **When switching to a shorter interval period**：**Wait until end of billing period to update**
   - Dashboard 可能提示「周期末更新需集成支持 subscription schedules」；我们仍依赖 `customer.subscription.updated` / `invoice.paid` 同步套餐与 credits，**变更此类选项后务必在测试模式完整跑一遍降级与续费**。

   官方入口：[Subscriptions API](https://docs.stripe.com/api/subscriptions)、[Update subscription](https://docs.stripe.com/api/subscriptions/update)（`cancel_at` / `cancel_at_period_end` 参数说明）。

3. 为当前环境配置以下环境变量（不要硬编码到代码；Vercel Dashboard → Environment Variables）：
   - `STRIPE_PRICE_STARTER_MONTHLY`
   - `STRIPE_PRICE_STARTER_YEARLY`
   - `STRIPE_PRICE_PRO_S_MONTHLY`
   - `STRIPE_PRICE_PRO_S_YEARLY`
   - `STRIPE_PRICE_PRO_M_MONTHLY`
   - `STRIPE_PRICE_PRO_M_YEARLY`
   - `STRIPE_PRICE_PRO_L_MONTHLY`
   - `STRIPE_PRICE_PRO_L_YEARLY`

   > 说明：`src/server/config/pricing.ts` 会在运行时读取以上 params，并对缺失值做 fail-fast 校验（缺失会直接报错，避免错配环境）。

### 3.2 Stripe 密钥（Sensitive）

在 Vercel（或你使用的宿主）将以下变量标记为 **Sensitive**，仅服务端可读：

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### 3.2.1 Stripe Price ID 环境变量（非 Secret）

Stripe Price IDs 为环境特定配置（staging/prod 不同），用普通环境变量管理即可，不要写入源码。

- 建议在每个环境分别维护一套值。
- 部署前确认 8 个 `STRIPE_PRICE_*` 参数都已存在且对应当前 Stripe 环境（test/live）账号。

### 3.3 Stripe Webhook Endpoint 配置

Stripe Webhook 应指向 **部署了本 Next.js 应用的公开 HTTPS 域名** 下的 Route Handler：

- **Path**：`POST /api/webhooks/stripe`（实现：`src/app/api/webhooks/stripe/route.ts` → `src/server/handlers/webhooks/stripe-webhook.ts`）。

**按环境填写（示例）：**

| 环境       | Webhook 地址（推荐） |
| ---------- | -------------------- |
| Staging    | `https://<your-staging-host>/api/webhooks/stripe` |
| Production | `https://<your-prod-host>/api/webhooks/stripe` |

必须启用以下事件：

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`（同步 `plan_expired_at`；DB `cancelAtPeriodEnd` = `cancel_at_period_end` **或** 已设置 `cancel_at` 且订阅仍为 active——Clover API 常出现仅设 `cancel_at` 而 `cancel_at_period_end` 为 false）
- `customer.subscription.deleted`

**签名校验与原始 body：** Stripe 验签必须使用请求体的 **原始字节**（在 Next.js 中通过 `request.text()` 或项目内 helper 传入验签逻辑）。编排见 `src/server/handlers/webhooks/stripe/support.ts` 与 `src/server/handlers/webhooks/stripe-webhook.ts`。

---

## 4. 推荐部署与联调顺序

1. 配置 Stripe 产品与 Price IDs
2. 在宿主平台配置 `STRIPE_*` 与 `STRIPE_WEBHOOK_SECRET`
3. 部署 Next.js 应用（使 `/api/webhooks/stripe` 可达）
4. 配置 Stripe webhook endpoint 与事件
5. 走测试链路验证：
   - Free 用户首次订阅（Checkout）
   - 付费用户升级（Billing Portal）
   - Credits 重置验证（订阅成功或周期发点后，`credits` 是否被 SET 为当期月额度，且与 `planCredits` 一致）
   - Credits 耗尽弹窗（低档套餐用户 vs Pro 高档 / Enterprise 用户的不同展示）
   - Billing Portal 跳转（管理订阅、invoice 查看）
   - 取消订阅后用户降回 Free

---

## 5. Credits 计费规则与毛利分析

### 5.1 定价锚点

真源：`monthlyPriceUsd / monthlyCredits` 与 `yearlyMonthlyPriceUsd / monthlyCredits`（`src/server/config/pricing.ts`）。年付列表示 **折合每月单价** 下的 per-credit（与 §2.3「年付仍按月发点」一致）。

| 方案         | 每 credit 收入（约）      | 约束角色                                       |
| ------------ | ------------------------- | ---------------------------------------------- |
| 月付 Starter | $27 / 150 ≈ **$0.18**     | 上限（最高 per-credit 收入）                   |
| 月付 Pro S   | $79 / 500 ≈ **$0.158**    | —                                              |
| 月付 Pro M   | $149 / 1,000 ≈ **$0.149** | —                                              |
| 月付 Pro L   | $279 / 2,000 ≈ **$0.140** | —                                              |
| 年付 Starter | $19 / 150 ≈ **$0.127**    | —                                              |
| 年付 Pro S   | $56 / 500 ≈ **$0.112**    | 视频场景曾用作「订阅档」保守下限（非全局最低） |
| 年付 Pro M   | $105 / 1,000 ≈ **$0.105** | —                                              |
| 年付 Pro L   | $199 / 2,000 ≈ **$0.100** | **全局最低 per-credit 收入**（最保守毛利边界） |

MVP 阶段：**视频生成**在文档中曾以 **年付 Pro S**（$0.112/credit）为对照下限；若要以 **全套餐最保守** 边界复核毛利，应改用 **年付 Pro L**（$0.100/credit）。关键场景目标毛利率 **≥ 20%**（见 §5.4）；图片模型仍按 §5.2 表格单独审视。

§5.2、§5.4 各格毛利率按 §5.1 的 per-credit 与 `毛利率 = 1 − API成本 / (Credits × per-credit)` 自 `src/server/config/pricing.ts` 当前数值重算；定价变更后请同步复核两表。

### 5.2 图片模型计费规则

**Credits per image（基线单张，批量按 `batchSize` 线性放大）：**

| 模型            | Credits/张 | API 成本/张      | 分辨率系数                              |
| --------------- | ---------- | ---------------- | --------------------------------------- |
| flux-2-pro      | 1          | $0.03（首个 MP） | T2I=1×；I2I=2×（覆盖输入+输出处理成本） |
| flux-2-max      | 1          | $0.07（首个 MP） | T2I: `square`=1×、其他 size=2×；I2I=2×  |
| seedream-4.5    | 1          | $0.04            | 1×（固定单价）                          |
| seedream-5-lite | 1          | $0.035           | 1×（固定单价）                          |
| nano-banana-2   | 2          | $0.08            | 0.5K=0.75×，1K=1×，2K=1.5×，4K=2×       |
| nano-banana-pro | 3          | $0.15            | 1K=1×，2K=1.5×，4K=2×                   |

> 说明：`wan-2.6` 已从当前 FAL 图片能力集中移除，不再参与本节计费表。
>
> `flux-2-pro` / `flux-2-max` 的 API 价格按像素（MP）递增；当前 credits 规则采用 model-aware multiplier（后端真源与前端估算同步），在不引入像素级实时估算的前提下覆盖主要成本差异。

**图片模型毛利率（按基线单张成本）：**

| 模型            | Credits/张                | API 成本     | 月付 Starter | 月付 Pro S | 月付 Pro M | 月付 Pro L | 年付 Starter | 年付 Pro S | 年付 Pro M | 年付 Pro L |
| --------------- | ------------------------- | ------------ | ------------ | ---------- | ---------- | ---------- | ------------ | ---------- | ---------- | ---------- |
| flux-2-pro      | 1（T2I）/2（I2I）         | $0.03~$0.075 | 79%~83%      | 76%~81%    | 75%~80%    | 73%~78%    | 70%~76%      | 67%~73%    | 64%~71%    | 62%~70%    |
| flux-2-max      | 1（square T2I）/2（其他） | $0.07~$0.16  | 56%~61%      | 49%~56%    | 46%~53%    | 43%~50%    | 37%~45%      | 29%~38%    | 24%~33%    | 20%~30%    |
| seedream-4.5    | 1                         | $0.04        | 78%          | 75%        | 73%        | 71%        | 68%          | 64%        | 62%        | 60%        |
| seedream-5-lite | 1                         | $0.035       | 81%          | 78%        | 77%        | 75%        | 72%          | 69%        | 67%        | 65%        |
| nano-banana-2   | 2                         | $0.08        | 78%          | 75%        | 73%        | 71%        | 68%          | 64%        | 62%        | 60%        |
| nano-banana-pro | 3                         | $0.15        | 72%          | 68%        | 66%        | 64%        | 61%          | 55%        | 52%        | 50%        |

### 5.3 视频模型计费规则

**Base credits（最终扣费为 `ceil(base × durationMultiplier × pricingMultiplier)`）：**

| 模型              | Base Credits |
| ----------------- | ------------ |
| kling-o3-standard | 10           |
| kling-o3-pro      | 12           |
| veo-3.1-fast      | 12           |
| veo-3.1           | 26           |
| sora-2-pro        | 20           |

**时长系数（统一线性）：**

| 公式                                       | 示例                               |
| ------------------------------------------ | ---------------------------------- |
| `durationMultiplier = durationSeconds / 5` | 4s=0.8×，8s=1.6×，15s=3×，28s=5.6× |

**pricingMultiplier（model-aware，结合 generationType/resolution/audio）：**

| 模型                | 规则（与 `VIDEO_MODEL_CAPABILITIES` 的 Price logic 对齐）                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `veo-3.1`           | 基线：720p/1080p + audio on = 1×；720p/1080p + audio off = 0.5×；4k + audio on = 1.5×；4k + audio off = 1×                 |
| `veo-3.1-fast`      | extend：audio on = 1×，audio off = 2/3×；T2V/I2V：4k + audio on = 7/3×，4k + audio off = 2×；720p/1080p + audio off = 2/3× |
| `sora-2-pro`        | 720p = 1×；1080p = 5/3×（$0.50/s vs $0.30/s）                                                                              |
| `kling-o3-standard` | T2V/I2V: audio on = 1×，audio off = 0.75×；V2V 固定 1.125×（$0.126/s 相对 $0.112/s）                                       |
| `kling-o3-pro`      | T2V/I2V: audio on = 1×，audio off = 2/3×；V2V 固定 1×（与 $0.168/s 基线一致）                                              |

> 说明：最终扣费使用 `Math.ceil`，在边界时长下可能出现 1 credit 的离散误差。

### 5.4 视频模型毛利率（关键场景）

> per-credit 收入见 §5.1（勿与下表各格混用旧常数）。

| 模型                        | 场景                 | API 成本 | Credits | 月付 Starter | 月付 Pro S | 月付 Pro M | 月付 Pro L | 年付 Starter | 年付 Pro S | 年付 Pro M | 年付 Pro L |
| --------------------------- | -------------------- | -------- | ------- | ------------ | ---------- | ---------- | ---------- | ------------ | ---------- | ---------- | ---------- |
| **kling-o3-std**（base 10） | 5s T2V, audio        | $0.56    | 10      | 69%          | 65%        | 62%        | 60%        | 56%          | 50%        | 47%        | 44%        |
|                             | 10s T2V, audio       | $1.12    | 20      | 69%          | 65%        | 62%        | 60%        | 56%          | 50%        | 47%        | 44%        |
|                             | 15s T2V, audio       | $1.68    | 30      | 69%          | 65%        | 62%        | 60%        | 56%          | 50%        | 47%        | 44%        |
|                             | 15s V2V              | $1.89    | 34      | 69%          | 65%        | 62%        | 60%        | 56%          | 50%        | 47%        | 44%        |
| **kling-o3-pro**（base 12） | 5s T2V, audio        | $0.84    | 12      | 61%          | 56%        | 53%        | 50%        | 45%          | 38%        | 33%        | 30%        |
|                             | 10s T2V, audio       | $1.68    | 24      | 61%          | 56%        | 53%        | 50%        | 45%          | 38%        | 33%        | 30%        |
|                             | 15s T2V/V2V          | $2.52    | 36      | 61%          | 56%        | 53%        | 50%        | 45%          | 38%        | 33%        | 30%        |
| **veo-3.1-fast**（base 12） | 4s T2V, 720p, audio  | $0.60    | 10      | 67%          | 62%        | 60%        | 57%        | 53%          | 46%        | 43%        | 40%        |
|                             | 8s T2V, 4K, audio    | $2.80    | 45      | 65%          | 61%        | 58%        | 56%        | 51%          | 44%        | 40%        | 37%        |
| **veo-3.1**（base 26）      | 4s T2V, 720p, audio  | $1.60    | 21      | 58%          | 52%        | 49%        | 45%        | 40%          | 32%        | 27%        | 23%        |
|                             | 8s T2V, 720p, audio  | $3.20    | 42      | 58%          | 52%        | 49%        | 45%        | 40%          | 32%        | 27%        | 23%        |
|                             | 8s T2V, 4K, audio    | $4.80    | 63      | 58%          | 52%        | 49%        | 45%        | 40%          | 32%        | 27%        | 23%        |
|                             | 7s V2V, 720p, audio  | $2.80    | 37      | 58%          | 52%        | 49%        | 46%        | 40%          | 32%        | 28%        | 24%        |
|                             | 28s V2V, 720p, audio | $11.20   | 146     | 57%          | 51%        | 49%        | 45%        | 39%          | 32%        | 27%        | 23%        |
| **sora-2-pro**（base 20）   | 4s T2V, 720p         | $1.20    | 16      | 58%          | 53%        | 50%        | 46%        | 41%          | 33%        | 29%        | 25%        |
|                             | 4s T2V, 1080p        | $2.00    | 27      | 59%          | 53%        | 50%        | 47%        | 42%          | 34%        | 29%        | 26%        |
|                             | 8s T2V, 1080p        | $4.00    | 54      | 59%          | 53%        | 50%        | 47%        | 42%          | 34%        | 29%        | 26%        |
|                             | 12s T2V, 1080p       | $6.00    | 81      | 59%          | 53%        | 50%        | 47%        | 42%          | 34%        | 29%        | 26%        |

> 毛利率 = `1 − API成本 / (Credits × 该列 per-credit 收入)`；Credits 为 `ceil(base × durationMultiplier × pricingMultiplier)`。per-credit 取自 §5.1（与 `pricing.ts` 一致）。若以 **年付 Pro S** 为对照，视频关键场景目标 **≥ 20%**；若以 **年付 Pro L**（全表最低 per-credit）复核，部分重负载场景会再低一截（受 `ceil` 离散影响时个别单元格可能略低于表内四舍五入值）。

### 5.5 自动化对齐校验（已落地）

- 成本逻辑相关测试：见 `src/server/handlers/__tests__/*` 中对 `cost-engine` 的 mock / 断言
- 覆盖范围：
  - 图片模型分辨率倍率：`nano-banana-2`（0.5K/2K/4K）与 `nano-banana-pro`（2K/4K 溢价）
  - 新增图片模型倍率分档：`flux-2-pro` / `flux-2-max`（含 T2I/I2I 与 `image_size` 档位）
  - 新增图片模型基线 credits：`seedream-5-lite`
  - 时长线性缩放（`seconds / 5`）
  - `veo-3.1` / `veo-3.1-fast` 的分辨率 + 音频组合比例（含 fast 的 extend 分支）
  - `sora-2-pro` 的 720p/1080p 比例
  - `kling-o3-standard` / `kling-o3-pro` 的 T2V/I2V 音频比例与 V2V 固定费率
- 运行方式（functions 目录）：
  - `npm run build && node --test lib/services/cost-engine.test.js`
- 当前结果：`12/12` 通过，说明实现与图片/视频能力定义中的 **Price logic** 规则保持一致。

---

## 6. Post-MVP 迭代规划

### 6.1 Credit 加油包（Phase 2）

当出现以下数据信号时引入：

- 大量付费用户月中耗尽 credits 但不愿升级（套餐价格跳跃过大）
- 用户有突发性批量使用需求（如电商大促）

引入时参考 Runway / Pika 行业最佳实践：

| 规则                  | 说明                                 |
| --------------------- | ------------------------------------ |
| 仅付费用户可购买      | Free 用户不能买，必须先升级          |
| 购买的 credits 不过期 | 区别于月度 credits 的每月重置        |
| 消费优先级            | 先扣月度 credits，再扣购买的 credits |
| 定价略高于订阅单价    | 防止 cannibalize 订阅收入            |

### 6.2 Invoice 内嵌展示（Phase 2）

在 Settings 页内直接展示最近 5 条 invoice，对齐 Vercel / Linear 体验。

**已完成（1、2 已落地）：**

1. ✅ `packages/db` schema：`users.stripeCustomerId`（nullable，与 Stripe Customer 对齐）
2. ✅ `stripeCustomerId` 在 `create-portal-session` / `create-checkout-session` 首次调用时写入 DB
   - 实现：`src/server/services/billing/customer.ts` → `resolveStripeCustomer(uid, email)`
   - 逻辑：优先读 DB（`GetUserStripeCustomerId`）；未命中时 Stripe search/create → 写回 DB（`UpdateStripeCustomerId`）→ lazy backfill 处理老用户
   - `stripeCustomerId` 唯一且不可变（`cus_xxx` 终身绑定），只写一次；webhook **不参与**写入

**已知边界（特殊情况，MVP 暂不考虑）：**

1. **其它支付入口未走 `resolveStripeCustomer`**：若将来存在不经过 Portal / Checkout Handler 的建单路径（例如 Stripe Payment Link、后台手动操作），DB 可能长期没有 `stripeCustomerId`。可选兜底：在 `checkout.session.completed`（或其它相关 webhook）中，当 `session.customer` 存在且 DB 仍为空时补写一次。**当前仅有一条标准入口，无需实现。**
2. **`users` 行必须先存在**：`UpdateStripeCustomerId` 更新的是已有用户行。新用户通常由 `beforeUserCreated` 中 `upsertUser` 创建；若账号无邮箱，该触发器会提前 `return`，**可能**没有对应 `users` 行，此时写 `stripeCustomerId` 会失败。**计费场景默认要求邮箱与正常注册流程，此类边界暂不处理。**

**待完成（Phase 2）：**

3. 新增 `GET /billing/invoices` 接口，读取 DB 中 `stripeCustomerId` 后调用 `stripe.invoices.list()`
4. 前端 `subscription-info-tab.tsx` 新增 invoice 列表组件，PDF 下载使用 `hosted_invoice_url`

### 6.3 Credits Proration（Phase 2，可选）

当有足够用户量且数据显示升级场景复杂时，可引入精确 proration credits：

- 套餐升级时，credits 按剩余天数比例补充差额，而非给满额
- 需要从 `invoice` 的 `period_start/end` 计算 proration 比例
- 当前 MVP 选择给满额（更简单，行业惯例，用户体验更好）
