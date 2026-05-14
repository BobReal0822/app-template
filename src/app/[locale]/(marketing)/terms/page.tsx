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
const supportEmail = LEGAL_CONFIG.companyEmail;
const copyrightEmail = LEGAL_CONFIG.companyEmail;
const privacyPolicyLinkEn = '[Privacy Policy](/privacy)';
const privacyPolicyLinkZh = '[《隐私政策》](/zh/privacy)';

const TermsMarkdownEn = `
# Terms of Service

These Terms of Service (the "Terms") govern your access to and use of ${productName} (the "Service"), provided and operated by ${companyName}, registered at ${companyAddress}. By accessing or using the Service, creating an account, or clicking "I Agree," you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.


## 1. Definitions

- **"Account"** means a registered user account on the Service.
- **"AI-Generated Content"** means any video, image, audio, text, or other content generated through the Service using artificial intelligence technology.
- **"Content"** means any text, images, videos, audio, scripts, prompts, data, or other materials uploaded, submitted, or otherwise provided by a User through the Service.
- **"Credits"** means the units of service entitlement associated with a Subscription, which may be used to generate AI-Generated Content through the Service.
- **"Subscription"** means a paid plan purchased by a User that provides access to certain features, functionalities, and Credits.
- **"User," "you," or "your"** means any individual or entity that accesses or uses the Service.


## 2. Eligibility

**2.1** You represent, acknowledge, and agree that you are of legal age in your jurisdiction to form a binding contract. If you are not of legal age, you may only use the Service with the express consent of a parent or legal guardian who agrees to be bound by these Terms.

**2.2** If you are under the age of 13, you may not access or use the Service under any circumstances. For details on how we handle the personal information of minors, please refer to ${privacyPolicyLinkEn}.

**2.3** If you are using the Service on behalf of a legal entity (such as a company or organization), you represent and warrant that you have the authority to bind that entity to these Terms, and "you" refers to both you individually and that entity.


## 3. Account Registration and Security

**3.1** To access certain features of the Service, you must create an Account by providing accurate, complete, and current information. You agree to promptly update your Account information to keep it accurate and current.

**3.2** You are responsible for maintaining the confidentiality and security of your Account credentials (including your password). You are fully responsible for all activities that occur under your Account.

**3.3** You must immediately notify us if you become aware of any unauthorized use of your Account or any other breach of security. ${companyName} will not be liable for any loss or damage arising from your failure to protect your Account credentials.

**3.4** You may not share your Account with others or allow multiple individuals to use a single Account, unless the features of your Subscription plan expressly permit multi-user access.


## 4. Description of the Service

**4.1** ${productName} is an AI-powered platform that enables Users to create advertising videos, images, and other creative content using artificial intelligence technology. The Service may include, but is not limited to:

- AI video generation from text prompts, scripts, or product URLs
- AI avatar and virtual spokesperson creation
- AI-powered image generation and editing
- Voice cloning and text-to-speech synthesis
- Script generation and editing tools
- Video editing and customization tools
- API access (subject to your Subscription plan)

**4.2** The Service is accessible at ${websiteUrl} and, where applicable, through APIs or other interfaces made available by ${companyName}.

**4.3** ${companyName} reserves the right to modify, update, or discontinue any feature or functionality of the Service at any time, with or without prior notice. ${companyName} shall have no liability to you for any modification, suspension, or discontinuance of the Service.

**4.4** The quality and performance of the Service may depend on your internet connection, hardware, and software environment, for which ${companyName} is not responsible.


## 5. Subscription and Payment

### 5.1 Subscription Plans

The Service offers both free and paid Subscription plans. Paid Subscriptions provide access to enhanced features, additional Credits, and higher usage limits. Details of available plans and pricing are displayed within the Service.

### 5.2 Credits

Each Subscription may include a specified number of Credits. Credits are consumed when generating AI-Generated Content. The number of Credits consumed per generation may vary depending on the type, length, and complexity of the content. Unless otherwise stated in your Subscription plan, unused Credits expire at the end of the applicable billing period and do not roll over to the next period.

### 5.3 Payment

(a) You must provide a valid payment method to purchase a paid Subscription. You authorize ${companyName} (or its third-party payment processors) to charge the applicable fees to your payment method.

(b) All prices are displayed within the Service and are exclusive of applicable taxes, unless otherwise stated. You are responsible for the payment of all applicable taxes, duties, and charges.

(c) ${companyName} uses third-party payment service providers to process payments. The specific payment provider(s) may vary by region and are subject to change. Your use of these payment services is subject to the respective payment provider’s terms and conditions.

### 5.4 Automatic Renewal

Paid Subscriptions automatically renew at the end of each billing period (monthly or annually, as applicable) unless you cancel your Subscription before the renewal date. The renewal will be charged at the then-current rate.

### 5.5 Cancellation

You may cancel your Subscription at any time through your Account settings or by contacting our support team at ${supportEmail}. Cancellation will take effect at the end of the current billing period. No refunds will be provided for any unused portion of the current billing period, except where required by applicable law.

### 5.6 Refund Policy

All payments are final and non-refundable, except as required by applicable law or as expressly stated in our Refund Policy (if any). ${companyName} may, at its sole discretion, consider refund requests on a case-by-case basis in exceptional circumstances.

### 5.7 Price Changes

${companyName} reserves the right to change its pricing at any time. For active Subscriptions, any pricing changes will be communicated to you in advance and will take effect at the start of the next billing period.

### 5.8 Late or Non-Payment

In the event of late or non-payment, ${companyName} reserves the right to immediately suspend or restrict your access to the Service until full payment is received.


## 6. Intellectual Property

### 6.1 Intellectual Property Rights

The Service, including all software, algorithms, AI models, databases, designs, text, graphics, logos, trademarks, and other content made available by ${companyName} (collectively, "Company IP"), is owned by or licensed to ${companyName} and is protected by applicable intellectual property laws worldwide. You may not copy, modify, distribute, sell, reverse engineer, decompile, or create derivative works based on any Company IP without ${companyName}'s prior written consent.

### 6.2 License to Use the Service

Subject to your compliance with these Terms, ${companyName} grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Service solely for your internal business or personal purposes during the term of your Subscription.

### 6.3 Feedback

If you provide any feedback, suggestions, or ideas regarding the Service ("Feedback"), you hereby assign to ${companyName} all rights, title, and interest in and to such Feedback, and ${companyName} may use and exploit such Feedback without restriction or obligation to you.


## 7. User Content and License

### 7.1 Your Content

You retain ownership of any Content you upload, submit, or otherwise provide through the Service (including scripts, prompts, images, videos, logos, and brand materials). You are solely responsible for your Content and for ensuring that it does not violate any applicable laws or infringe any third-party rights.

### 7.2 License Grant to ${companyName}

By uploading or submitting Content to the Service, you grant ${companyName} a worldwide, non-exclusive, royalty-free, sublicensable license to use, reproduce, modify, adapt, translate, distribute, and display your Content solely for the purposes of:

(a) providing, operating, and improving the Service;  
(b) generating AI-Generated Content based on your inputs;  
(c) training and improving AI models and related technologies;  
(d) promoting the Service (only with your prior consent for identifiable Content).

### 7.3 Representations and Warranties

You represent and warrant that:

(a) you own or have obtained all necessary rights, licenses, consents, and permissions to submit your Content and grant the licenses set forth in these Terms;  
(b) your Content does not infringe any intellectual property, privacy, publicity, or other rights of any third party;  
(c) if your Content includes the likeness, voice, or personal information of any individual, you have obtained all necessary consents and releases from such individual;  
(d) your Content complies with all applicable laws and regulations.


## 8. AI-Generated Content

### 8.1 Ownership and License

Subject to your compliance with these Terms and your active Subscription, ${companyName} grants you a non-exclusive, worldwide license to use, reproduce, modify, distribute, publicly display, and commercially exploit AI-Generated Content created through your use of the Service, for any lawful purpose and subject to these Terms.

### 8.2 No Exclusivity

Due to the nature of artificial intelligence systems, ${companyName} cannot guarantee that AI-Generated Content created for you will be unique. Other users may provide similar or identical inputs, resulting in similar or identical outputs. ${companyName} does not grant exclusive rights to any AI-Generated Content.

### 8.3 Accuracy and Quality

${companyName} does not guarantee that AI-Generated Content will be accurate, complete, error-free, or suitable for your specific purposes. You are solely responsible for reviewing, verifying, and approving all AI-Generated Content before using, publishing, or distributing it.

### 8.4 Restrictions on AI-Generated Content

You shall not use AI-Generated Content to:

(a) create content that is defamatory, obscene, pornographic, violent, hateful, or discriminatory;  
(b) impersonate any individual without their explicit consent, or create deepfake content for malicious purposes;  
(c) deceive, mislead, or defraud others;  
(d) violate any applicable laws, regulations, or advertising platform policies;  
(e) infringe any third-party rights;  
(f) develop or operate a competing service to ${productName} or services materially similar to it;  
(g) use AI-Generated Content as input data for other AI models or systems without ${companyName}'s prior written consent.

### 8.5 Compliance with Advertising Regulations

You are solely responsible for ensuring that any AI-Generated Content used for advertising purposes complies with all applicable advertising laws, regulations, platform policies, and industry standards, including any disclosure requirements related to AI-generated content.


## 9. Prohibited Uses

You agree not to use the Service to:

(a) engage in any illegal, fraudulent, or unauthorized activity;  
(b) upload, transmit, or distribute content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable;  
(c) infringe the intellectual property, privacy, publicity, or other rights of any third party;  
(d) distribute malware, viruses, or other harmful code;  
(e) interfere with, disrupt, or overload the Service or its infrastructure;  
(f) attempt to gain unauthorized access to any part of the Service, other accounts, or computer systems;  
(g) reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of any software underlying the Service;  
(h) use the Service for high-risk activities prohibited under applicable AI or safety regulations;  
(i) scrape, data mine, or use automated means to access the Service beyond what is permitted through authorized APIs;  
(j) resell, sublicense, or redistribute the Service or any portion thereof without ${companyName}'s prior written consent;  
(k) exploit images or personal information of minors;  
(l) send unsolicited messages, spam, or engage in phishing or similar activities;  
(m) create or distribute content that promotes illegal activities, violence, or self-harm.

Violation of these restrictions may result in immediate suspension or termination of your Account.


## 10. Privacy

Your privacy is important to ${companyName}. Our collection, use, and disclosure of personal information are governed by our ${privacyPolicyLinkEn}, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of your information as described in the Privacy Policy.

${companyName} is committed to complying with applicable data protection and privacy laws and regulations in the jurisdictions where it operates or where its users are located.


## 11. Disclaimer of Warranties

The Service is provided on an "as is" and "as available" basis, without warranties of any kind, whether express or implied. To the fullest extent permitted by applicable law, ${companyName} disclaims all warranties, including but not limited to:

(a) implied warranties of merchantability, fitness for a particular purpose, and non-infringement;  
(b) warranties that the Service will be uninterrupted, secure, or error-free, or free of viruses or other harmful components;  
(c) warranties regarding the accuracy, reliability, or completeness of any AI-generated content or other content available through the Service;  
(d) warranties that the Service will meet your specific requirements or expectations.

You use the Service at your sole risk.


## 12. Limitation of Liability

**12.1** To the maximum extent permitted by applicable law, in no event shall ${companyName}, its directors, officers, employees, agents, partners, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation loss of profits, loss of data, loss of goodwill, business interruption, or other intangible losses, arising out of or in connection with:

(a) your access to, use of, or inability to use the Service;  
(b) any conduct or content of any third party on the Service;  
(c) any AI-generated content obtained through the Service;  
(d) unauthorized access to, use of, or alteration of your content or data.

**12.2** In no event shall ${companyName}'s total aggregate liability arising out of or relating to these Terms or the Service exceed the total amount you have actually paid to ${companyName} for the Service during the twelve (12) months immediately preceding the event giving rise to the claim.

**12.3** The limitations in this section apply regardless of the legal theory on which the claim is based, whether in contract, tort (including negligence), strict liability, or otherwise, even if ${companyName} has been advised of the possibility of such damages.

**12.4** Some jurisdictions do not allow the exclusion or limitation of certain damages. In such jurisdictions, the liability of ${companyName} shall be limited to the fullest extent permitted by law.


## 13. Indemnification

You agree to defend, indemnify, and hold harmless ${companyName}, its directors, officers, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys’ fees) arising out of or in connection with:

(a) your use of the Service;  
(b) your Content or your use of AI-Generated Content;  
(c) your breach of these Terms;  
(d) your violation of any applicable law or regulation;  
(e) your infringement of any third-party rights, including intellectual property, privacy, or publicity rights;  
(f) any claim by a third party related to your use of AI-Generated Content.


## 14. Copyright Policy (DMCA)

### 14.1 Reporting Copyright Infringement

${companyName} respects the intellectual property rights of others. If you believe that any content on the Service infringes your copyright, you may submit a notification under the Digital Millennium Copyright Act ("DMCA") by providing the following information to ${companyName}'s designated copyright agent:

(a) a description of the copyrighted work that you claim has been infringed;  
(b) identification of the material that is claimed to be infringing and information reasonably sufficient to permit ${companyName} to locate the material on the Service;  
(c) your contact information (name, address, telephone number, and email address);  
(d) a statement that you have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law;  
(e) a statement, made under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on the copyright owner’s behalf;  
(f) your physical or electronic signature.

### 14.2 Designated Copyright Agent

Please send DMCA notices to:

**${companyName}**  
Attn: Copyright Agent  
Email: ${copyrightEmail}  
Address: ${companyAddress}

### 14.3 Repeat Infringers

${companyName} reserves the right to terminate the Accounts of users who are determined to be repeat infringers.


## 15. Termination

### 15.1 Termination by You

You may terminate your Account at any time by canceling your Subscription and contacting ${companyName} at ${supportEmail} to request Account deletion. Termination will take effect at the end of the current billing period.

### 15.2 Termination by ${companyName}

${companyName} may suspend or terminate your Account at any time, with or without cause, including but not limited to:

(a) your breach of these Terms;  
(b) non-payment or late payment of Subscription fees;  
(c) conduct that ${companyName} determines, in its sole discretion, to be harmful to other users, the Service, or its business;  
(d) violation of applicable laws or regulations;  
(e) prolonged inactivity of your Account.

### 15.3 Effect of Termination

Upon termination:

(a) your right to access and use the Service will immediately cease;  
(b) any unused Credits will be forfeited and are non-refundable;  
(c) ${companyName} may delete your Account data, Content, and AI-Generated Content after a reasonable retention period;  
(d) provisions of these Terms that by their nature should survive termination shall remain in effect, including but not limited to Intellectual Property, Limitation of Liability, Indemnification, and Governing Law.


## 16. Modifications to Terms

${companyName} reserves the right to modify these Terms at any time. If ${companyName} makes material changes, it will notify you by updating the "Last Updated" date and, where appropriate, by additional notice (such as email or in-Service notification).

Your continued use of the Service after the effective date of any modifications constitutes your acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Service and cancel your Subscription.


## 17. Governing Law and Dispute Resolution

### 17.1 Governing Law

These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which ${companyName} is incorporated, without regard to its conflict of law principles. Where local laws in your jurisdiction impose mandatory consumer protections that cannot be waived by contract, such protections shall apply to the extent required by law.

### 17.2 Dispute Resolution

Any dispute, controversy, or claim arising out of or relating to these Terms or the Service shall first be resolved through good-faith negotiations between you and ${companyName} for a period of thirty (30) days. If the dispute cannot be resolved through negotiation, it shall be submitted to binding arbitration administered by a mutually agreed-upon arbitration institution, conducted in the English language, at a location determined by ${companyName}. Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement of intellectual property rights.

### 17.3 Local Law Compliance

You are responsible for complying with all applicable laws and regulations in your jurisdiction. If any provision of these Terms conflicts with mandatory local laws that cannot be contractually overridden, such local laws shall prevail to the extent of the conflict, without affecting the validity of the remaining provisions.

### 17.4 Class Action Waiver

To the fullest extent permitted by law, you agree that any dispute resolution proceedings will be conducted only on an individual basis and not in any class, consolidated, or representative action.


## 18. General Provisions

### 18.1 Entire Agreement

These Terms, together with the Privacy Policy and any other documents or policies referenced herein, constitute the entire agreement between you and ${companyName} regarding the Service and supersede all prior agreements and understandings.

### 18.2 Severability

If any provision of these Terms is held to be invalid or unenforceable, that provision shall be modified to the minimum extent necessary to make it valid and enforceable, and the remaining provisions shall continue in full force and effect.

### 18.3 Waiver

The failure of ${companyName} to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.

### 18.4 Assignment

You may not assign or transfer these Terms or any rights or obligations hereunder without ${companyName}'s prior written consent. ${companyName} may assign these Terms without restriction.

### 18.5 Force Majeure

${companyName} shall not be liable for any failure or delay in performance resulting from any cause beyond its reasonable control, including but not limited to natural disasters, war, terrorism, pandemics, government actions, power failures, internet disruptions, or failures of third-party services.

### 18.6 Relationship

Nothing in these Terms shall be construed as creating a joint venture, partnership, employment, or agency relationship between you and ${companyName}.

### 18.7 Language

These Terms are provided in English and Chinese for convenience. In the event of any conflict or inconsistency between the two versions, the English version shall prevail.


## 19. Contact Information

If you have any questions or concerns about these Terms or the Service, please contact:

**${companyName}**  
Email: ${supportEmail}  
Address: ${companyAddress}  
Website: ${websiteUrl}

---

*By using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.*
`;

const TermsMarkdownZh = `
# 服务条款

本服务条款（以下简称“条款”）规范您对 ${productName}（以下简称“本服务”）的访问和使用。本服务由 ${companyName} 提供并运营，注册地址为 ${companyAddress}。通过访问或使用本服务、创建账户或点击“我同意”，即表示您已阅读、理解并同意受本条款约束。如您不同意本条款，请勿访问或使用本服务。


## 一、定义

- **“账户”**：指在本服务中注册的用户账户。  
- **“AI 生成内容”**：指通过本服务使用人工智能技术生成的任何视频、图片、音频、文本或其他内容。  
- **“内容”**：指用户通过本服务上传、提交或以其他方式提供的任何文本、图片、视频、音频、脚本、提示词、数据或其他材料。  
- **“积分”（Credits）**：指与订阅关联的服务使用单位，可用于通过本服务生成 AI 生成内容。  
- **“订阅”**：指用户购买的付费计划，提供对本服务中特定功能、服务和积分的访问权限。  
- **“用户”、“您”或“您的”**：指访问或使用本服务的任何个人或实体。


## 二、资格条件

**2.1** 您声明并确认，您已达到所在司法管辖区签订具有约束力合同的法定年龄。如未达到法定年龄，您仅可在父母或法定监护人明确同意且该监护人同意受本条款约束的前提下使用本服务。

**2.2** 未满 13 周岁的用户在任何情况下均不得访问或使用本服务。有关我们如何处理未成年人个人信息的详细规定，请参阅我们的${privacyPolicyLinkZh}。

**2.3** 如您代表法人实体（如公司或组织）使用本服务，您声明并保证您有权代表该实体签署本条款，“您”同时指您个人和该实体。


## 三、账户注册与安全

**3.1** 要访问本服务的某些功能，您必须通过提供准确、完整和最新的信息来创建账户。您同意及时更新账户信息以确保其准确性和时效性。

**3.2** 您有责任维护账户凭证（包括密码）的保密性和安全性。您对账户下发生的所有活动负全部责任。

**3.3** 如您发现账户遭到未经授权的使用或存在任何其他安全漏洞，必须立即通知 ${companyName}。因您未能妥善保护账户凭证而导致的任何损失或损害，${companyName} 不承担责任。

**3.4** 您不得与他人共享账户或允许多人使用同一账户，除非您的订阅计划明确允许多用户访问。


## 四、服务说明

**4.1** ${productName} 是一个 AI 驱动的平台，使用户能够使用人工智能技术创建广告视频、图片和其他创意内容。本服务可能包括但不限于：

- 基于文本提示词、脚本或产品链接的 AI 视频生成  
- AI 数字人及虚拟代言人创建  
- AI 图片生成与编辑  
- 语音克隆和文本转语音合成  
- 脚本生成和编辑工具  
- 视频编辑和定制工具  
- API 访问（视订阅计划而定）

**4.2** 本服务可通过 ${websiteUrl} 访问，在适用情况下，也可通过 ${companyName} 提供的 API 或其他接口访问。

**4.3** ${companyName} 保留随时修改、更新或终止本服务任何功能或特性的权利，无论是否事先通知。对于本服务的任何修改、暂停或终止，${companyName} 不向您承担任何责任。

**4.4** 本服务的质量和性能可能取决于您的互联网连接、硬件及软件环境，对此 ${companyName} 不承担责任。


## 五、订阅与付款

### 5.1 订阅计划

本服务提供免费和付费订阅计划。付费订阅可提供增强功能、额外积分以及更高的使用限额。可用计划及定价信息将在本服务中展示。

### 5.2 积分

每个订阅可能包含指定数量的积分。生成 AI 生成内容时将消耗积分。每次生成消耗的积分数量可能因内容类型、长度和复杂程度而异。除订阅计划另有规定外，未使用的积分在适用计费期结束时失效，不会结转至下一计费期。

### 5.3 付款

（a）您必须提供有效的支付方式以购买付费订阅。您授权 ${companyName}（或其第三方支付处理方）向您的支付方式收取适用费用。  

（b）所有价格均在本服务中展示，除非另有说明，均不含适用税费。您有责任支付所有适用的税费、关税及其他收费。  

（c）${companyName} 使用第三方支付服务提供商处理付款。具体支付提供商可能因地区而异，且可能随时变更。您使用此类支付服务受相应支付提供商的条款和条件约束。

### 5.4 自动续订

付费订阅在每个计费期结束时自动续订（按月或按年，视情况而定），除非您在续订日期前取消订阅。续订费用将按续订时的现行费率收取。

### 5.5 取消

您可以随时通过账户设置或联系支持团队（${supportEmail}）取消订阅。取消将在当前计费期结束时生效。除适用法律另有要求外，当前计费期内未使用的部分费用不予退还。

### 5.6 退款政策

所有付款原则上均为最终付款且不可退还，除非适用法律另有要求或我们的退款政策另有明确规定。${companyName} 可自行决定在特殊情况下逐案考虑退款请求。

### 5.7 价格变更

${companyName} 保留随时调整价格的权利。对于有效订阅，任何价格变更将在下一个计费期开始前提前通知您，并自下一个计费期生效。

### 5.8 逾期或未付款

如发生逾期或未付款情形，${companyName} 有权立即暂停或限制您访问本服务，直至收到全部应付费用。


## 六、知识产权

### 6.1 知识产权

本服务（包括但不限于软件、算法、AI 模型、数据库、设计、文本、图形、标志、商标及 ${companyName} 提供的其他内容，统称“公司知识产权”）由 ${companyName} 享有或经许可使用，并受适用知识产权法律保护。未经 ${companyName} 事先书面同意，您不得复制、修改、分发、出售、反向工程、反编译或基于任何公司知识产权创建衍生作品。

### 6.2 服务使用许可

在您遵守本条款的前提下，${companyName} 授予您一项有限的、非排他性的、不可转让的、可撤销的许可，仅在订阅有效期内为您的内部商业或个人目的访问和使用本服务。

### 6.3 反馈

如您就本服务向 ${companyName} 提供任何反馈、建议或想法（“反馈”），您在此将该等反馈的全部权利转让给 ${companyName}，${companyName} 有权不受限制地使用、披露、复制及以其他方式利用该等反馈，而无需向您承担任何义务。


## 七、用户内容与许可

### 7.1 您的内容

您保留通过本服务上传、提交或以其他方式提供的任何内容（包括脚本、提示词、图片、视频、标志及品牌素材）的所有权。您自行负责您的内容，并确保其不违反任何适用法律且不侵犯任何第三方权利。

### 7.2 授权给 ${companyName} 的许可

通过向本服务上传或提交内容，您授予 ${companyName} 一项全球性的、非排他的、免版税的、可再许可的许可，仅用于以下目的使用、复制、修改、改编、翻译、分发和展示您的内容：

（a）提供、运营和改进本服务；  
（b）根据您的输入生成 AI 生成内容；  
（c）训练和改进 AI 模型及相关技术；  
（d）推广本服务（如涉及可识别个人的内容，将在您事先同意的前提下进行）。

### 7.3 声明与保证

您声明并保证：

（a）您拥有或已获得提交您的内容并授予本条款项下许可所需的全部权利、许可、同意和授权；  
（b）您的内容不侵犯任何第三方的知识产权、隐私权、肖像权或其他权利；  
（c）如您的内容包含任何个人的肖像、声音或个人信息，您已获得该个人的所有必要同意和授权；  
（d）您的内容符合所有适用法律法规。


## 八、AI 生成内容

### 8.1 所有权与许可

在您遵守本条款且订阅有效的前提下，${companyName} 授予您一项非排他性的、全球性的许可，允许您为任何合法目的使用、复制、修改、分发、公开展示和商业利用通过本服务创建的 AI 生成内容，但须遵守本条款的约定。

### 8.2 非排他性

由于人工智能系统的特性，${companyName} 无法保证为您生成的 AI 生成内容为唯一或不可被他人生成的相似内容。其他用户可能提供相似或相同的输入，从而生成相似或相同的输出。${companyName} 不向任何用户授予 AI 生成内容的排他权。

### 8.3 准确性与质量

${companyName} 不保证 AI 生成内容的准确性、完整性、无误性或对您特定用途的适用性。您在使用、发布或分发任何 AI 生成内容之前，应自行负责进行审查、校验和批准。

### 8.4 AI 生成内容的使用限制

您不得将 AI 生成内容用于：

（a）创建诽谤性、淫秽、色情、暴力、仇恨或歧视性内容；  
（b）未经个人明确同意而冒充任何自然人，或为恶意目的创建深度伪造内容；  
（c）欺骗、误导或诈骗他人；  
（d）违反任何适用法律、法规或任何广告平台的条款及政策；  
（e）侵犯任何第三方权利；  
（f）开发或运营与 ${productName} 竞争的服务或与之实质相似的服务；  
（g）未经 ${companyName} 事先书面同意，将 AI 生成内容用作其他 AI 模型或系统的训练或输入数据。

### 8.5 广告合规

如您将 AI 生成内容用于广告目的，您应自行负责确保该等内容符合所有适用的广告法律、法规、平台政策和行业标准，包括但不限于有关 AI 生成内容的披露要求。


## 九、禁止行为

您同意不将本服务用于：

（a）从事任何非法、欺诈或未经授权的活动；  
（b）上传、传输或分发任何非法、有害、威胁、辱骂、骚扰、诽谤、粗俗、淫秽或其他令人反感的内容；  
（c）侵犯任何第三方的知识产权、隐私权、肖像权或其他合法权益；  
（d）分发恶意软件、病毒或任何其他有害代码；  
（e）干扰、中断或过度加载本服务或其基础设施；  
（f）试图未经授权访问本服务的任何部分、其他账户或计算机系统；  
（g）反向工程、反编译、反汇编或以其他方式试图获取本服务所使用软件的源代码；  
（h）将本服务用于适用的 AI 或安全监管法规所禁止的高风险活动；  
（i）在未经授权的情况下抓取、数据挖掘或以自动化方式访问本服务，超出授权 API 的合理使用范围；  
（j）未经 ${companyName} 事先书面同意，转售、再许可或重新分发本服务或其任何部分；  
（k）利用未成年人的图片或个人信息进行任何形式的剥削或不当利用；  
（l）发送垃圾信息、垃圾邮件或从事网络钓鱼等类似活动；  
（m）创建或传播宣传非法活动、暴力或自我伤害的内容。

如您违反上述任何禁止行为，${companyName} 有权立即暂停或终止您的账户。


## 十、隐私

您的隐私对 ${companyName} 非常重要。我们对个人信息的收集、使用和披露受${privacyPolicyLinkZh}约束，该隐私政策通过引用纳入本条款。通过使用本服务，即表示您同意按照《隐私政策》中所述的方式收集和使用您的信息。

${companyName} 致力于遵守其运营所在地区或用户所在地区适用的数据保护和隐私法律法规。


## 十一、免责声明

本服务按“现状”（“AS IS”）和“可用状态”（“AS AVAILABLE”）提供，${companyName} 不对本服务作出任何明示或暗示的保证。在适用法律允许的最大范围内，${companyName} 免除所有保证责任，包括但不限于：

（a）关于适销性、特定用途适用性及不侵权的任何默示保证；  
（b）关于本服务将不间断、无错误、安全或不含病毒或其他有害组件的保证；  
（c）关于通过本服务提供的任何 AI 生成内容或其他内容的准确性、可靠性或完整性的保证；  
（d）本服务将满足您特定需求或期望的任何保证。

您确认并同意，使用本服务的风险由您自行承担。


## 十二、责任限制

**12.1** 在适用法律允许的最大范围内，在任何情况下，${companyName} 及其董事、高管、员工、代理人、合作伙伴、供应商或关联公司均不就以下原因造成的任何间接、附带、特殊、后果性或惩罚性损害向您承担责任，包括但不限于利润损失、数据丢失、商誉损失、业务中断或其他无形损失：

（a）您访问、使用或无法使用本服务；  
（b）本服务中任何第三方的任何行为或内容；  
（c）通过本服务获得的任何 AI 生成内容；  
（d）对您的内容或数据的未经授权访问、使用或更改。

**12.2** 在任何情况下，${companyName} 因本条款或本服务产生或与之相关的全部累计责任，不得超过在导致该等责任事件发生前 12 个月内您为使用本服务实际向 ${companyName} 支付的总金额。

**12.3** 本“责任限制”条款适用于无论基于何种法律理论的索赔，包括但不限于合同责任、侵权责任（包括过失）、严格责任等，即使 ${companyName} 已被告知此类损害的可能性。

**12.4** 某些司法管辖区可能不允许排除或限制某些损害赔偿。若适用法律禁止全部或部分排除或限制，则上述排除或限制仅在法律允许的最大范围内适用。


## 十三、赔偿

您同意为 ${companyName} 及其董事、高管、员工、代理人和关联公司进行辩护、赔偿并使其免受因下列情形引起或与之相关的任何索赔、损害、损失、责任、成本和费用（包括合理的律师费）：

（a）您对本服务的使用；  
（b）您的内容或您对 AI 生成内容的使用；  
（c）您违反本条款的任何规定；  
（d）您违反任何适用法律或法规；  
（e）您侵犯任何第三方的知识产权、隐私权、肖像权或其他权利；  
（f）任何第三方因您使用 AI 生成内容而提出的索赔。


## 十四、版权政策（DMCA）

### 14.1 举报版权侵权

${companyName} 尊重他人的知识产权。如您真诚地认为本服务上的任何内容侵犯了您的著作权，您可以根据《数字千年版权法》（“DMCA”）向 ${companyName} 指定的版权代理人提交通知，并提供以下信息：

（a）被声称遭侵权的受版权保护作品的描述；  
（b）被声称侵权材料的识别信息及其在本服务中的位置，足以使 ${companyName} 能够定位该材料；  
（c）您的联系方式（姓名、地址、电话号码及电子邮箱地址）；  
（d）一份声明，表明您善意地认为相关材料的使用未经版权所有者、其代理人或法律授权；  
（e）一份在伪证处罚下作出的声明，表明通知中的信息准确无误，并且您为版权所有者或被授权代表版权所有者行事；  
（f）您的亲笔或电子签名。

### 14.2 指定版权代理人

请将 DMCA 通知发送至：

**${companyName}**  
收件人：版权代理人  
电子邮箱：${copyrightEmail}  
地址：${companyAddress}

### 14.3 重复侵权者

如用户被认定为重复侵权者，${companyName} 保留终止其账户的权利。


## 十五、终止

### 15.1 您的终止

您可以随时通过取消订阅并发送邮件至 ${supportEmail} 请求删除账户，以终止您对本服务的使用。终止将在当前计费期结束时生效。

### 15.2 ${companyName} 的终止

${companyName} 有权在任何时间，出于任何理由或无理由地暂停或终止您的账户，包括但不限于：

（a）您违反本条款的任何规定；  
（b）未付款或逾期付款；  
（c）${companyName} 自行判断认为您的行为对其他用户、本服务或 ${companyName} 业务构成或可能构成不利影响；  
（d）违反适用的法律或法规；  
（e）账户长期处于不活跃状态。

### 15.3 终止的效果

账户终止后：

（a）您访问和使用本服务的权利将立即终止；  
（b）任何未使用的积分将被视为作废且不予退款；  
（c）在合理的保留期后，${companyName} 可删除您的账户数据、内容及 AI 生成内容；  
（d）本条款中因其性质应在终止后继续有效的条款将继续有效，包括但不限于知识产权、责任限制、赔偿及适用法律等条款。


## 十六、条款修改

${companyName} 保留随时修改本条款的权利。如本条款发生重大变更，${companyName} 将通过更新“最后更新日期”并在适当情况下通过电子邮件或本服务内通知等方式向您发出通知。

在任何修改生效日期之后继续使用本服务，即表示您接受修订后的条款。如您不同意修订后的条款，您必须停止使用本服务并取消订阅。


## 十七、适用法律与争议解决

### 17.1 适用法律

本条款受 ${companyName} 注册所在地的法律管辖并依其解释，不考虑其法律冲突原则。如您所在司法管辖区的当地法律规定了不可通过合同放弃的强制性消费者保护条款，则在法律要求的范围内，该等条款将优先适用。

### 17.2 争议解决

因本条款或本服务产生的或与之相关的任何争议、争论或索赔，应首先由双方通过善意协商在三十（30）日内解决。如协商未能解决争议，则该等争议应提交至双方共同认可的仲裁机构进行具有约束力的仲裁。仲裁程序应以英语进行，仲裁地点由 ${companyName} 确定。尽管有上述约定，任何一方均可向有管辖权的法院申请禁令或其他衡平法救济，以防止其知识产权遭受实际或潜在的侵害。

### 17.3 当地法律合规

您有责任遵守您所在司法管辖区的所有适用法律法规。如本条款的任何规定与当地不可通过合同排除的强制性法律相冲突，则在冲突范围内该等强制性法律应优先适用，但不影响本条款其他部分的效力。

### 17.4 集体诉讼豁免

在适用法律允许的最大范围内，您同意任何争议解决程序将仅以您个人名义进行，而不得作为原告或集体成员参与任何集体、合并或代表性诉讼。


## 十八、一般条款

### 18.1 完整协议

本条款连同《隐私政策》及本文引用的任何其他协议或政策，共同构成您与 ${companyName} 之间关于本服务的完整协议，并取代此前就本服务所达成的任何口头或书面协议或谅解。

### 18.2 可分割性

如本条款的任何规定被有管辖权的法院认定为无效或不可执行，该规定应在使其有效和可执行所必需的最小范围内予以修改，其余条款则继续完全有效并具有约束力。

### 18.3 权利放弃

${companyName} 未行使或未及时行使本条款项下的任何权利，不应视为对该等权利的放弃；对任何违约行为的放弃也不应视为对任何后续违约行为的放弃。

### 18.4 转让

未经 ${companyName} 事先书面同意，您不得转让、转移或以其他方式处置您在本条款项下的权利或义务。${companyName} 可不受限制地转让或转移其在本条款项下的权利和义务。

### 18.5 不可抗力

如因超出 ${companyName} 合理控制范围的事件或情形（包括但不限于自然灾害、战争、恐怖活动、流行病或疫情、政府行为、电力故障、互联网中断或第三方服务中断等）导致履行本条款的义务出现延迟或无法履行，${companyName} 在该等延迟或无法履行期间不承担相应责任。

### 18.6 关系

本条款中的任何内容均不应被解释为在您与 ${companyName} 之间创建合资企业、合伙关系、雇佣关系或代理关系。

### 18.7 语言

本条款以英文和中文提供，中文版为便于理解的译本。如英文版与中文版存在任何不一致或冲突，以英文版为准。


## 十九、联系方式

如您对本条款或本服务有任何疑问或意见，请通过以下方式联系：

**${companyName}**  
电子邮箱：${supportEmail}  
地址：${companyAddress}  
网站：${websiteUrl}

---

*您使用本服务即表示您已阅读、理解并同意受本服务条款约束。*

`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'terms' });

  const title = t('title');
  const description = t('description');
  const keywords = t('keywords');
  const url = legalMarketingAbsoluteUrl(locale, 'terms');
  const ogImage = getMarketingOgImagePath('terms');

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: locale === 'en' ? '/terms' : `/${locale}/terms`,
      languages: {
        en: '/terms',
        zh: '/zh/terms',
        'x-default': '/terms',
      },
    },
    openGraph: {
      title,
      description,
      url,
      keywords,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      keywords,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  };
}

export default async function TermsPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const jsonLd = legalMarketingWebPageJsonLd({
    name: 'Terms of Service',
    description: 'Terms of Service for App Template',
    segment: 'terms',
    locale,
  });

  setRequestLocale(locale as Locale);

  const tLegal = await getTranslations({ locale: locale as Locale, namespace: 'legalDocument' });

  return (
    <LegalDocument
      locale={locale}
      jsonLd={jsonLd}
      lastUpdatedLine={tLegal('lastUpdatedLabel', { date: lastUpdatedDate })}
      content={locale === 'zh' ? TermsMarkdownZh : TermsMarkdownEn}
    />
  );
}
