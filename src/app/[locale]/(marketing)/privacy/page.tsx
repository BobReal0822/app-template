import { getTranslations, setRequestLocale } from 'next-intl/server';

import { LegalDocument } from '@/components/legal-document';

import { LEGAL_CONFIG } from '@/config/legal';
import { routing, type Locale } from '@/i18n/routing';
import {
  legalMarketingAbsoluteUrl,
  legalMarketingWebPageJsonLd,
} from '@/lib/legal/legal-marketing-urls';

import { getMarketingOgImagePath } from '../_shared/seo';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const lastUpdatedDate = '2026-04-29';

const productName = LEGAL_CONFIG.productName;
const companyName = LEGAL_CONFIG.companyName;
const companyAddress = LEGAL_CONFIG.companyAddress;
const websiteUrl = `[${LEGAL_CONFIG.websiteUrl}](${LEGAL_CONFIG.websiteUrl})`;
const privacyEmail = LEGAL_CONFIG.companyEmail;

const PrivacyMarkdownEn = `
# Privacy Policy

This Privacy Policy ("Policy") explains how ${companyName} ("${companyName}", "we", "us", or "our") collects, uses, discloses, and protects information in connection with your use of ${productName}, our website at ${websiteUrl}, and any related services (collectively, the "Service"). By accessing or using the Service, you agree to the collection and use of information in accordance with this Policy and our Terms of Service.

If you do not agree with this Policy, please do not access or use the Service.


## 1. Information We Collect

We collect different types of information about you when you use the Service:

### 1.1 Information You Provide Directly

You may provide information to us when you:

- Create an account or profile  
- Subscribe to a paid plan  
- Upload or submit Content (e.g., scripts, prompts, images, videos, audio, or other media)  
- Use AI avatar or voice features  
- Request support or contact us  
- Subscribe to newsletters or marketing communications  

The information you provide may include:

- Identification and contact details: name, email address, billing address, company name, role/title  
- Account information: username, password (stored in hashed form), preferences  
- Billing information: payment method details (processed by third-party payment providers), billing address, VAT/tax ID where applicable  
- User Content: text prompts, scripts, images, videos, audio recordings, avatars, and other materials you choose to upload  
- Communications: messages and correspondence with our support team or feedback you send us

### 1.2 Information Collected Automatically

When you access or use the Service, we automatically collect certain technical information, such as:

- Usage information: pages or screens viewed, features used, actions taken, timestamps, referring URLs  
- Log data: IP address, browser type, browser language, operating system, device identifiers, access times  
- Device information: hardware model, OS version, device settings, network information  
- Cookies and similar technologies: see Section 4 (Cookies and Tracking Technologies)

### 1.3 Information from Third Parties

We may receive information about you from third parties, including:

- Authentication providers (such as single sign-on / OAuth providers), if you choose to log in through them  
- Payment processors, for payment confirmation and billing data (limited to what is necessary)  
- Analytics and marketing partners, providing aggregated or pseudonymized insights  
- Business partners or resellers, when you access the Service through a partner arrangement

We will treat any such information in accordance with this Policy.


## 2. How We Use Your Information

We use the information we collect for the following purposes:

### 2.1 To provide and operate the Service

  - Create and manage your Account  
  - Enable you to generate and manage AI-Generated Content  
  - Maintain and improve core features and functionality

### 2.2 To process payments and manage subscriptions

  - Process transactions and subscription renewals  
  - Provide invoices and payment confirmations  
  - Prevent fraud and abuse related to billing

### 2.3 To personalize and improve the Service

  - Understand how the Service is used and improve performance and user experience  
  - Develop new features, models, and services  
  - Tailor content, recommendations, and user interfaces

### 2.4 To communicate with you

  - Respond to your inquiries and support requests  
  - Send you technical notices, security alerts, and administrative messages  
  - Send you updates, product news, or marketing communications (where permitted by law and your preferences)

### 2.5 To ensure security and prevent misuse

  - Detect, investigate, and prevent fraud, abuse, and other harmful activity  
  - Enforce our Terms of Service and other policies  
  - Protect the rights, property, and safety of ${companyName}, our users, and the public

### 2.6 To comply with legal obligations

  - Respond to lawful requests from authorities  
  - Comply with applicable laws, regulations, and legal processes

Where required by applicable law, we will rely on a valid legal basis for processing your personal information, such as performance of a contract, legitimate interests, compliance with a legal obligation, or your consent.


## 3. AI, Likeness, and Sensitive Use Cases

Because ${productName} enables the creation of AI-generated videos, images, avatars, and voices, some uses may involve personal likeness and potentially sensitive data.

### 3.1 Avatars, Faces, and Voices

If you upload images, video, or audio of yourself or others (for example, to create an AI avatar, face, or voice):

- You are responsible for obtaining all necessary consents from the individuals whose likeness, image, or voice you upload.  
- You must not upload or use any content of another person without that person’s explicit consent, especially for commercial or public-facing use.  
- You must not upload or generate content involving minors without the explicit consent of their parent or legal guardian.

### 3.2 Prohibited Uses

You may not use the Service or any AI-Generated Content to:

- Create non-consensual deepfakes or impersonations  
- Mislead others about the identity of a person in a harmful or deceptive way  
- Create content that is unlawful, defamatory, discriminatory, or otherwise violates our Terms of Service

We may review or disable access to certain content where required by law or to enforce our policies, while seeking to respect your privacy and freedom of expression.

### 3.3 Model Training

We may use certain data (including prompts and outputs) to train and improve our models and the Service, as described in the Terms of Service. Where required by law, or where we offer opt-out mechanisms, we will honor your choices as described in your Account settings, data protection notices, or applicable agreements.


## 4. Cookies and Tracking Technologies

We use cookies and similar technologies to:

- Remember your preferences and settings  
- Keep you signed in to your Account  
- Monitor and analyze usage, performance, and traffic  
- Improve the Service and our marketing efforts

Types of cookies and technologies we may use include:

- **Essential cookies**: necessary for core functionality (e.g., authentication).  
- **Analytics cookies**: help us understand usage and improve the Service.  
- **Preference cookies**: remember your choices (e.g., language).  

You can usually control cookies through your browser settings. If you disable certain cookies, some features of the Service may not function properly.


## 5. How We Share Your Information

We do not sell your personal information. We may share your information in the following circumstances:

### 5.1 Service Providers

We share information with trusted third-party service providers who perform services on our behalf, such as:

- Hosting and cloud infrastructure  
- Payment processing  
- Analytics and performance monitoring  
- Customer support tools and CRM  
- Email delivery and communication tools  
- Security, anti-fraud, and abuse prevention

These providers are authorized to use your information only as necessary to provide services to us and are subject to appropriate contractual safeguards.

### 5.2 Legal and Safety

We may disclose information if we believe it is reasonably necessary to:

- Comply with any applicable law, regulation, legal process, or governmental request  
- Enforce our Terms of Service and other agreements  
- Protect the rights, property, or safety of ${companyName}, our users, or the public  
- Detect, prevent, or address fraud, security, or technical issues

### 5.3 Business Transfers

In connection with a merger, acquisition, financing, reorganization, bankruptcy, or sale of all or a portion of our assets, your information may be transferred to the relevant third party as part of the transaction. We will take reasonable steps to ensure the confidentiality of your information in such events and notify you where required by law.

### 5.4 With Your Consent

We may share your information with third parties when you give us your explicit consent to do so.


## 6. International Data Transfers

${companyName} may process and store information in countries other than the country where you are located. These countries may have data protection laws that are different from those in your jurisdiction.

Where required by applicable law, we will implement appropriate safeguards (such as standard contractual clauses or equivalent mechanisms) to ensure that your personal information receives a level of protection that is at least comparable to that provided in your jurisdiction.


## 7. Data Retention

We retain your personal information for as long as reasonably necessary to:

- Provide and maintain the Service  
- Fulfill the purposes described in this Policy  
- Comply with our legal and regulatory obligations  
- Resolve disputes and enforce our agreements

When we no longer need to retain personal information, we will take reasonable steps to delete, anonymize, or aggregate it.

If you close your Account, we may continue to retain certain information where required by law, where necessary to protect our legitimate interests, or where retention is necessary for record-keeping, security, or fraud prevention.


## 8. Children’s Privacy

The Service is not directed to children under the age of 13, and we do not knowingly collect personal information from children under 13.

If we become aware that we have collected personal information from a child under 13, we will take reasonable steps to delete such information as soon as possible. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us at ${privacyEmail} so that we can take appropriate action.

Where local laws establish a higher age threshold for child consent (e.g., under 16 in certain jurisdictions), we will treat users below that age threshold as minors and apply additional protections where required.


## 9. Your Rights and Choices

Depending on your location and applicable law, you may have some or all of the following rights regarding your personal information:

- **Right of access**: request confirmation whether we process your personal data and obtain a copy.  
- **Right to rectification**: request correction of inaccurate or incomplete data.  
- **Right to erasure**: request deletion of your personal data in certain circumstances.  
- **Right to restriction**: request restriction of processing in certain circumstances.  
- **Right to data portability**: receive certain personal data in a structured, commonly used, machine-readable format and transmit it to another controller.  
- **Right to object**: object to certain processing, including processing based on legitimate interests or for direct marketing.  
- **Right to withdraw consent**: where processing is based on consent, you may withdraw your consent at any time without affecting the lawfulness of processing before withdrawal.

To exercise your rights, you can:

- Adjust settings in your Account (where available), and/or  
- Contact us at ${privacyEmail}

We may need to verify your identity before responding to your request. We will respond within the timeframes required by applicable law.

If you are located in the European Economic Area (EEA), the United Kingdom, or other regions with comprehensive data protection laws, you may also have the right to lodge a complaint with your local data protection authority.


## 10. Security

${companyName} uses reasonable technical and organizational measures to protect your personal information against unauthorized access, loss, misuse, or alteration. These measures may include encryption in transit, access controls, monitoring, and secure development practices.

However, no method of transmission over the Internet or method of electronic storage is completely secure. We cannot guarantee absolute security of your information.

If you believe your Account or interaction with the Service is no longer secure, please contact us immediately at ${privacyEmail}.


## 11. Third-Party Services and Links

The Service may contain links to third-party websites, services, or integrations (for example, advertising platforms, analytics tools, or social media integrations). This Policy does not apply to such third-party services.

We are not responsible for the privacy practices of third parties. We encourage you to review the privacy policies of those third parties before providing any information to them or using their services.


## 12. Changes to This Privacy Policy

${companyName} may update this Privacy Policy from time to time. When we make material changes, we will update the "Last Updated" date at the top of this Policy and, where appropriate, provide additional notice (such as email or in-Service notification).

Your continued use of the Service after the effective date of any changes constitutes your acceptance of the revised Policy. If you do not agree to the changes, you should stop using the Service.


## 13. Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us:

**${companyName}**  
Address: ${companyAddress}  
Email: ${privacyEmail}  
Website: ${websiteUrl}

---

*By using ${productName}, you acknowledge that you have read and understood this Privacy Policy.*

`;

const PrivacyMarkdownZh = `
# 隐私政策

本《隐私政策》（以下简称“本政策”）旨在说明 ${companyName}（“${companyName}”、“我们”或“我方”）在您使用 ${productName}（以下简称“本服务”）、访问我们的网站（${websiteUrl}）以及相关产品与服务时，如何收集、使用、共享和保护您的个人信息。通过访问或使用本服务，即表示您同意本政策以及《服务条款》的约束。

如您不同意本政策的任何内容，请立即停止使用本服务。


## 一、我们收集的信息

我们会在您使用本服务的过程中收集与您相关的不同类型的信息，包括但不限于：

### 1.1 您主动提供的信息

在以下情形中，您可能会主动向我们提供信息：

- 注册账户或创建个人资料；  
- 订阅付费计划或升级服务；  
- 上传或提交内容（例如脚本、提示词、图片、视频、音频或其他媒体）；  
- 使用 AI 数字人、头像或语音等功能；  
- 提交客服工单或与我们联系；  
- 订阅我们的新闻邮件或营销信息。

上述场景中，您可能会提供如下信息：

- 身份及联系信息：姓名、电子邮箱、账单地址、公司名称、职位/角色等；  
- 账户信息：用户名、密码（以哈希形式存储）、偏好设置；  
- 付款信息：用于支付的相关信息（由第三方支付机构处理）、账单地址、税号/VAT 号（如适用）；  
- 用户内容：您通过本服务上传或提交的文本提示、脚本、图片、视频、音频、头像及其他材料；  
- 通信信息：您与我们客服或支持团队之间的沟通记录及反馈信息。

### 1.2 我们自动收集的信息

当您访问或使用本服务时，我们会自动收集某些技术和使用信息，包括但不限于：

- 使用信息：您访问或浏览的页面/界面、使用的功能、执行的操作、访问时间及来源页面等；  
- 日志信息：IP 地址、浏览器类型及语言、操作系统版本、设备标识符、访问时间；  
- 设备信息：设备型号、操作系统及版本、设备设置、网络环境；  
- Cookies 及类似技术所收集的信息（详见第四节）。

### 1.3 来自第三方的信息

在法律允许的范围内，我们可能从第三方获取与您相关的信息，例如：

- 认证服务提供商（如单点登录/第三方登录），当您选择通过其登录本服务时；  
- 支付服务提供商，用于确认支付状态、处理账单相关信息（仅限必要信息）；  
- 分析和营销合作伙伴，提供统计性或经过去标识化/匿名化的分析数据；  
- 业务合作伙伴或渠道方，当您通过合作伙伴访问本服务时。

我们会按照本政策对上述信息进行处理。


## 二、我们如何使用您的信息

我们将收集到的信息用于以下目的：

### 2.1 提供和维护本服务

  - 创建和管理您的账户；  
  - 支持您生成和管理 AI 生成内容；  
  - 维持本服务的核心功能和稳定性。

### 2.2 处理付款与订阅

  - 处理交易和订阅续费；  
  - 提供发票及支付确认信息；  
  - 防范与支付相关的欺诈和滥用行为。

### 2.3 改进与个性化本服务

  - 分析本服务的使用情况，提升性能与用户体验；  
  - 设计、开发并测试新功能和新服务；  
  - 根据您的使用情况，为您提供更适合的内容或推荐。

### 2.4 与您进行沟通

  - 回应您的咨询、反馈和客服请求；  
  - 向您发送技术通知、安全提醒及重要的服务公告；  
  - 在符合法律要求且经您许可的前提下，向您发送产品更新、功能变更或营销信息。

### 2.5 保障安全与防止滥用

  - 识别、调查和防止欺诈、滥用或其他有害活动；  
  - 执行《服务条款》和其他适用政策；  
  - 保护 ${companyName}、其他用户及公众的合法权益和安全。

### 2.6 履行法律义务

  - 遵守适用法律法规及监管要求；  
  - 回应执法机关或监管机构的合法请求；  
  - 处理与法律纠纷相关的事项。

在适用法律要求的情况下，我们将基于合法的处理依据（例如履行合同、合法权益、遵守法律义务或您的同意）处理您的个人信息。


## 三、AI、肖像与敏感场景

由于 ${productName} 可以生成 AI 视频、图片、头像和语音等内容，部分使用场景可能涉及个人肖像或敏感信息。

### 3.1 头像、面部与语音数据

如果您上传或提交了您本人或他人的图像、视频或音频（例如用于创建 AI 头像、数字人或语音克隆）：

- 您需自行确保已获得相关自然人的明确同意，特别是在商业用途或公开传播的场景下；  
- 您不得在未经他人同意的情况下上传或使用其肖像、声音或其他可识别个人身份的内容；  
- 如内容涉及未成年人，您必须获得其父母或法定监护人的明确同意。

### 3.2 禁止用途

您不得利用本服务或 AI 生成内容：

- 创建未经同意的深度伪造（deepfake）或冒充他人的内容；  
- 以误导性或恶意方式歪曲他人身份或与他人的关系；  
- 创建违法、诽谤、歧视、仇恨或其他违反《服务条款》的内容。

在符合法律和监管要求的前提下，我们可能会对部分内容进行审核、限制访问或采取其他必要措施，以防止滥用，同时尽可能尊重您的隐私和表达自由。

### 3.3 用于模型训练

如我们的《服务条款》中所述，我们可能会在符合适用法律及本政策的前提下，使用部分数据（包括文本提示和生成结果）用于改进模型和本服务的性能与质量。在适用法律要求或我们提供选择机制时，我们会通过账户设置或相关提示告知您可选择的退出方式，并尊重您的选择。


## 四、Cookies 及类似技术

我们使用 Cookies 及类似技术以实现以下目的：

- 维持登录状态并验证您的身份；  
- 记住您的偏好设置（例如界面语言）；  
- 统计和分析访问量、使用模式和性能指标；  
- 改进本服务及我们的产品设计和营销效果。

常见类型包括：

- **必要类 Cookies**：用于身份验证和基本功能，实现本服务的正常运行；  
- **分析类 Cookies**：用于统计使用情况，帮助我们改进产品；  
- **偏好类 Cookies**：用于记住您的偏好设置。

您可通过浏览器或设备设置管理或删除 Cookies。但如果您禁用某些 Cookies，本服务的部分功能可能无法正常使用。


## 五、我们如何共享您的信息

我们不会出售您的个人信息。我们仅在如下情形下共享信息：

### 5.1 服务提供商

我们会与为我们提供服务的第三方服务提供商共享信息，包括但不限于：

- 云服务及基础设施托管；  
- 支付处理机构；  
- 数据分析与性能监控工具；  
- 客服系统及客户关系管理（CRM）工具；  
- 电子邮件与消息发送服务；  
- 安全、反欺诈及风控服务。

上述第三方仅在为我们提供服务所必需的范围内使用您的信息，并受保密和数据保护义务约束。

### 5.2 法律与安全

在合理必要的范围内，我们可能会披露您的信息以：

- 遵守适用法律、法规、法院判决或监管要求；  
- 执行《服务条款》及其他协议或政策；  
- 保护 ${companyName}、我们的用户或公众的权利、财产或安全；  
- 检测、预防或处理欺诈、安全或技术问题。

### 5.3 业务转让

当发生兼并、收购、融资、资产转让、重组、破产或其他类似交易时，您的信息可能作为交易的一部分转移给相关第三方。我们会在法律要求的范围内采取适当措施保护您的信息，并在必要时提供相关通知。

### 5.4 经您同意

在您明确同意的情况下，我们可能会将您的信息共享给第三方，例如在您授权使用第三方集成服务或应用时。


## 六、国际数据传输

${companyName} 及其服务提供商可能在不同国家/地区处理和存储您的信息，这些地区的数据保护法律可能与您所在司法管辖区的规定有所不同。

在适用法律要求的情况下，我们会采取适当的保护措施（例如签署标准合同条款或使用其他合法传输机制），以确保您的个人信息在跨境传输过程中享有与您所在地区大致相当的保护水平。


## 七、数据保留

我们会在实现本政策所述目的及《服务条款》约定所需的期间内保留您的个人信息，包括但不限于：

- 提供和维护本服务；  
- 遵守法律和监管要求；  
- 解决纠纷并执行我们的协议；  
- 进行安全、审计及防欺诈工作。

当我们不再需要出于上述目的保留个人信息时，我们会在合理期限内采取删除、匿名化或聚合处理等方式进行处置。

如您注销账户，我们仍可能在法律要求或为保护我们的合法权益、履行合规义务的范围内保留部分必要信息。


## 八、未成年人隐私保护

本服务并非针对 13 周岁以下儿童设计，我们亦不会有意收集 13 周岁以下儿童的个人信息。

如我们发现收集了 13 周岁以下儿童的个人信息，我们会在合理可行的范围内尽快删除相关信息。如您为家长或监护人，且认为您的孩子向我们提供了个人信息，请通过 ${privacyEmail} 联系我们，以便我们采取相应措施。

如适用法律对儿童/未成年人的年龄有更高要求（例如某些地区为 16 周岁或 14 周岁），我们将按照当地法律要求进行额外保护措施。


## 九、您的权利与选择

根据您所在地区的法律规定，您可能享有部分或全部以下权利：

- **访问权**：有权请求确认我们是否处理与您相关的个人信息，并获得相应副本；  
- **更正权**：有权请求更正不准确或不完整的个人信息；  
- **删除权**：在特定情况下，有权请求删除您的个人信息；  
- **限制处理权**：在特定情况下，有权请求限制对您的个人信息进行处理；  
- **数据可携权**：在符合法律规定时，有权以结构化、通用、机器可读的格式获取部分个人信息，并将其转移给第三方；  
- **反对权**：在处理基于合法权益或用于直接营销时，有权提出反对；  
- **撤回同意权**：如处理基于您的同意，您有权随时撤回同意，但撤回前基于同意所进行的处理不受影响。

您可以通过以下方式行使上述权利：

- 在本服务的账户设置中进行相应操作（如适用）；  
- 或通过 ${privacyEmail} 联系我们。

为保护您的隐私和安全，我们可能会在处理请求前对您的身份进行验证。我们将在适用法律规定的时限内答复您的请求。

如您位于欧盟、欧洲经济区、英国或其他具有全面数据保护法律的地区，您亦有权向当地数据保护监管机构提出投诉。


## 十、安全措施

${companyName} 采取合理的技术和组织措施保护您的个人信息免遭未经授权的访问、泄露、丢失、滥用或篡改，这些措施可能包括但不限于传输加密、访问控制、日志审计以及安全开发流程等。

然而，任何通过互联网进行的数据传输和电子存储方式都无法保证绝对安全。尽管我们会尽力保护您的个人信息，但无法完全排除安全风险。

如您认为您的账户或与本服务的交互可能存在安全风险，请立即通过 ${privacyEmail} 联系我们。


## 十一、第三方服务与链接

本服务可能包含指向第三方网站、应用或服务的链接（例如广告平台、分析工具、社交媒体集成等）。本政策不适用于这些第三方服务。

我们无法控制第三方的隐私实践，也不对其隐私政策或内容负责。建议您在使用任何第三方服务前，先阅读其隐私政策。


## 十二、本隐私政策的变更

${companyName} 可能会不时更新本政策。如本政策发生重大变更，我们将更新本政策顶部的“最后更新日期”，并在适当情况下通过电子邮件或本服务内通知等方式向您发出额外通知。

在修订版本生效后继续使用本服务，即表示您接受修订后的本政策。如您不同意更新内容，应停止使用本服务。


## 十三、联系我们

如您对本隐私政策或我们的隐私实践有任何疑问、意见或请求，请通过以下方式联系我们：

**${companyName}**  
地址：${companyAddress}  
电子邮箱：${privacyEmail}  
网站：${websiteUrl}

---

*您使用 ${productName} 即表示您已阅读并理解本隐私政策的内容。*

`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'privacy' });
  const title = t('title');
  const description = t('description');
  const keywords = t('keywords');
  const url = legalMarketingAbsoluteUrl(locale, 'privacy');
  const ogImage = getMarketingOgImagePath('privacy');

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: locale === 'en' ? '/privacy' : `/${locale}/privacy`,
      languages: {
        en: '/privacy',
        zh: '/zh/privacy',
        'x-default': '/privacy',
      },
    },
    openGraph: {
      title,
      description,
      url,
      keywords,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      keywords,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function PrivacyPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  setRequestLocale(locale as Locale);

  const tLegal = await getTranslations({ locale: locale as Locale, namespace: 'legalDocument' });

  const jsonLd = legalMarketingWebPageJsonLd({
    name: 'Privacy Policy',
    description: 'Privacy Policy for App Template',
    segment: 'privacy',
    locale,
  });

  return (
    <LegalDocument
      locale={locale}
      jsonLd={jsonLd}
      lastUpdatedLine={tLegal('lastUpdatedLabel', { date: lastUpdatedDate })}
      content={locale === 'zh' ? PrivacyMarkdownZh : PrivacyMarkdownEn}
    />
  );
}
