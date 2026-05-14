# 认证安全最佳实践

## 📋 概述

本文档记录了该项目在用户认证过程中实施的安全最佳实践，以防止常见的安全漏洞和攻击。

> **栈说明（2026）**：线上认证为 **Better Auth**（cookie 会话 + `src/app/api/auth/**`）。文中出现的 `auth/*` 错误码示例沿用常见「Identity Toolkit」风格命名，便于对照「账号枚举防护」原则；实现上请以 Better Auth / 自建 API 的**实际错误码与路由**为准，并保持「登录失败统一文案」策略不变。

---

## 🔐 1. 通用错误消息（防止账号枚举）

### 安全问题

**账号枚举攻击（Account Enumeration Attack）**：

攻击者通过尝试不同的邮箱地址，根据系统返回的错误消息判断账号是否存在。

### ❌ 不安全的做法

```typescript
// 泄露账号是否存在
'auth/user-not-found': 'No account found with this email'
'auth/wrong-password': 'Incorrect password'
```

**问题**：

- 攻击者输入 `attacker@example.com` → "No account found" → 账号不存在
- 攻击者输入 `victim@example.com` → "Incorrect password" → ✅ **账号存在！**
- 攻击者现在知道哪些邮箱已注册，可以进行针对性攻击

### ✅ 安全的做法

```typescript
// 统一使用通用错误消息
'auth/user-not-found': 'Invalid email or password'
'auth/wrong-password': 'Invalid email or password'
'auth/invalid-credential': 'Invalid email or password'
```

**优势**：

- ✅ 攻击者无法判断账号是否存在
- ✅ 防止账号枚举攻击
- ✅ 保护用户隐私

---

## 🛡️ 2. 登录错误消息策略

### 实施原则

**登录相关错误 → 使用通用消息**

| 常见认证错误码（示例）     | 安全消息                    | 原因               |
| ------------------------- | --------------------------- | ------------------ |
| `auth/invalid-email`      | `Invalid email or password` | 不泄露邮箱格式问题 |
| `auth/user-not-found`     | `Invalid email or password` | 不泄露账号是否存在 |
| `auth/wrong-password`     | `Invalid email or password` | 不泄露密码错误     |
| `auth/invalid-credential` | `Invalid email or password` | 保持一致性         |

**账号状态错误 → 可以具体提示**

| 常见认证错误码（示例） | 消息 | 原因 |
| --- | --- | --- |
| `auth/user-disabled` | `This account has been disabled. Please contact support` | 用户需要知道账号被禁用 |
| `auth/too-many-requests` | `Too many attempts. Please try again later` | 提示用户等待 |

**注册错误 → 可以具体提示**

| 常见认证错误码（示例） | 消息 | 原因 |
| --- | --- | --- |
| `auth/email-already-in-use` | `An account with this email already exists` | 注册时可以提示去登录 |
| `auth/weak-password` | `Password should be at least 6 characters` | 帮助用户创建强密码 |

---

## 🚨 3. 其他认证安全措施

### 3.1 Rate Limiting（频率限制）

**实施位置**：

- ✅ 前端：防止客户端快速重试（节流 / `disabled` 提交按钮）
- ✅ 后端：防止 API 滥用（`src/app/api/auth/**` 路由上的 rate limit）
- ✅ 基础设施：对异常流量使用 WAF / 平台级限流（按宿主配置）

**配置**：

```typescript
// 验证邮件发送限制
const RATE_LIMIT_MS = 60000; // 1 分钟
const emailSendTimestamps = new Map<string, number>();

if (lastSent && now - lastSent < RATE_LIMIT_MS) {
  return NextResponse.json(
    { error: 'Too many requests', retryAfter: remainingSeconds },
    { status: 429 },
  );
}
```

### 3.2 邮箱验证

**策略**：

```typescript
// 只允许验证过的用户登录
if (requireEmailVerification && !result.user.emailVerified) {
  await signOut(auth);
  return {
    success: false,
    error: 'Please verify your email address...',
    needsVerification: true,
  };
}
```

**优势**：

- ✅ 防止垃圾注册
- ✅ 确保邮箱真实有效
- ✅ 可以通过邮箱找回账号

### 3.3 密码强度要求

**最低长度（产品策略）**：

- 历史默认可能较宽松；生产环境建议 ≥ 8 并组合复杂度规则

**建议增强**（可在注册页面添加）：

```typescript
function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain an uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain a lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a number' };
  }
  return { valid: true };
}
```

### 3.4 会话管理

**实施**：

- ✅ 使用 HTTP-only cookies 存储会话（`src/app/api/auth/session/route.ts`）
- ✅ 登录成功后创建服务器端会话
- ✅ 登出时清除会话

```typescript
// 创建会话
const sessionCreated = await createSession(result.user);
if (!sessionCreated) {
  await signOut(auth);
  return { success: false, error: 'Failed to create session' };
}
```

### 3.5 防止重复提交

**实施**：

```typescript
// 防止表单重复提交
if (isLoading) {
  return; // 已经在处理中
}

setIsLoading(true);
// ... 处理登录
```

**优势**：

- ✅ 防止重复请求
- ✅ 避免竞态条件
- ✅ 改善用户体验

---

## 🎯 4. 完整的安全错误消息映射

### 当前实现

```typescript
// 示例：集中映射认证错误码 → 用户可见文案（实现位置以当前 auth 模块为准）
function getAuthErrorMessage(errorCode?: string): string {
  const errorMessages: Record<string, string> = {
    // 🔒 Login errors - Generic messages (prevent account enumeration)
    'auth/invalid-email': 'Invalid email or password',
    'auth/user-not-found': 'Invalid email or password',
    'auth/wrong-password': 'Invalid email or password',
    'auth/invalid-credential': 'Invalid email or password',

    // 🚫 Account status errors
    'auth/user-disabled':
      'This account has been disabled. Please contact support',

    // 📝 Registration errors - Can be more specific
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password should be at least 6 characters',

    // ⚙️ Operation errors
    'auth/operation-not-allowed': 'This sign-in method is not enabled',

    // 🔗 OAuth errors
    'auth/popup-closed-by-user': 'Sign-in popup was closed',
    'auth/popup-blocked': 'Sign-in popup was blocked by the browser',
    'auth/cancelled-popup-request': 'Sign-in request was cancelled',

    // 🌐 Network errors
    'auth/network-request-failed':
      'Network error. Please check your connection',
    'auth/too-many-requests': 'Too many attempts. Please try again later',

    // 📧 Email verification errors
    'auth/expired-action-code':
      'This link has expired. Please request a new one',
    'auth/invalid-action-code':
      'Invalid or expired link. Please request a new one',
  };

  return (
    errorMessages[errorCode || ''] || 'An error occurred. Please try again'
  );
}
```

---

## 📚 5. 相关资源

### OWASP 指南

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Account Enumeration Prevention](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account)

### 供应商文档（参考）

- [Better Auth 文档](https://www.better-auth.com/docs)

---

## ✅ 安全检查清单

### 认证流程

- [x] ✅ 使用通用错误消息防止账号枚举
- [x] ✅ 实施 rate limiting 防止暴力破解
- [x] ✅ 要求邮箱验证
- [x] ✅ 使用 HTTPS（生产环境）
- [x] ✅ 实施会话管理（HTTP-only cookies）
- [x] ✅ 防止表单重复提交
- [x] ✅ 记录登录日志（安全审计）

### 密码安全

- [x] ✅ 最少 6 字符（如仍兼容旧策略）
- [ ] ⚠️ 建议：最少 8 字符 + 大小写 + 数字
- [x] ✅ 使用托管认证库的密码哈希（由 Better Auth / 宿主运行时处理）
- [x] ✅ 提供忘记密码功能

### 会话安全

- [x] ✅ HTTP-only cookies
- [x] ✅ Secure flag（生产环境）
- [x] ✅ SameSite=Strict/Lax
- [x] ✅ 会话超时
- [x] ✅ 登出时清除会话

### 监控和审计

- [x] ✅ 记录登录事件（`login_logs` 表）
- [x] ✅ 记录 IP 地址和 User Agent
- [ ] 📝 TODO: 异常登录检测（不同地理位置）
- [ ] 📝 TODO: 登录失败次数监控

---

## 🔍 6. 测试验证

### 6.1 测试账号枚举防护

```bash
# 测试 1: 不存在的账号
# 输入：random123@example.com + 任意密码
# 预期：显示 "Invalid email or password"

# 测试 2: 存在的账号，错误密码
# 输入：existing@example.com + 错误密码
# 预期：显示 "Invalid email or password"（相同消息）

# 测试 3: 存在的账号，正确密码
# 预期：登录成功
```

### 6.2 测试 Rate Limiting

```bash
# 1. 快速连续登录 5 次
# 预期：前几次显示 "Invalid email or password"
#       后续显示 "Too many attempts. Please try again later"

# 2. 快速请求验证邮件
# 预期：第一次成功，1 分钟内再次请求被拒绝
```

### 6.3 测试邮箱验证

```bash
# 1. 注册新用户
# 2. 尝试登录（未验证）
# 预期：显示 "Please verify your email address..."
#       不显示具体账号信息

# 3. 验证邮箱后登录
# 预期：登录成功
```

---

## 📝 7. 未来改进建议

### 短期（1-3 个月）

- [ ] 增强密码强度要求（8+ 字符，大小写，数字）
- [ ] 添加双因素认证（2FA）选项
- [ ] 实施异常登录检测（不同 IP/设备）

### 中期（3-6 个月）

- [ ] 添加登录历史查看功能
- [ ] 实施设备管理（信任设备）
- [ ] 添加安全问题/备用邮箱

### 长期（6-12 个月）

- [ ] 实施风险评分系统
- [ ] 添加生物识别认证
- [ ] 集成专业安全服务（如 Cloudflare Access）

---

## 🎯 总结

### 核心原则

1. **最小信息泄露**：登录错误使用通用消息
2. **深度防御**：多层安全措施（rate limiting, 邮箱验证, 会话管理）
3. **安全监控**：记录和审计所有认证事件
4. **用户体验平衡**：在安全和易用性之间找到平衡

### 当前状态

该项目已实施以下安全措施：

- ✅ **通用错误消息**：防止账号枚举
- ✅ **Rate Limiting**：防止暴力破解
- ✅ **邮箱验证**：确保邮箱真实有效
- ✅ **会话管理**：HTTP-only cookies
- ✅ **登录日志**：安全审计
- ✅ **重复提交保护**：防止竞态条件

**安全等级**：🟢 **良好**（适合生产环境）

---

## 📞 安全问题报告

如果发现安全漏洞，请通过以下方式报告：

1. **不要**公开发布安全问题
2. 发送邮件到：security@example.com
3. 包含详细的复现步骤
4. 我们会在 48 小时内响应

---

**最后更新**：2026-01-09 **审查周期**：每季度 **下次审查**：2026-04-09
