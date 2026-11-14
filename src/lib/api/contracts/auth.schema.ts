// 이 파일은 scripts/generate-contracts.mjs가 API 명세서에서 생성한다. 직접 수정하지 않는다.
import { z } from "zod";

export const KakaoCallbackResponseSchema = z.object({});
export type KakaoCallbackResponse = z.infer<typeof KakaoCallbackResponseSchema>;

export const KakaoAuthorizationResponseSchema = z.object({});
export type KakaoAuthorizationResponse = z.infer<typeof KakaoAuthorizationResponseSchema>;

export const LoginRequestSchema = z.object({ email: z.string(), password: z.string() });
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessCondition: z.string(),
  officeId: z.number().nullable(),
  role: z.enum(["OWNER", "AGENT", "DEPUTY"]).nullable(),
  pendingRegistrationId: z.number().nullable(),
  pendingMembershipId: z.number().nullable(),
  unresolvedRejection: z.record(z.string(), z.unknown()).nullable().optional(),
  graceUntil: z.iso.datetime({ offset: true }).nullable().optional(),
  returnPeriodEndsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  restrictionReason: z.string().nullable().optional(),
  removalReason: z.string().nullable().optional(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const LogoutResponseSchema = z.object({});
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;

export const PasswordResetRequestSchema = z.object({ token: z.string(), newPassword: z.string() });
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetResponseSchema = z.object({});
export type PasswordResetResponse = z.infer<typeof PasswordResetResponseSchema>;

export const PasswordResetLinkRequestSchema = z.object({ email: z.string() });
export type PasswordResetLinkRequest = z.infer<typeof PasswordResetLinkRequestSchema>;

export const PasswordResetLinkResponseSchema = z.object({ accepted: z.boolean() });
export type PasswordResetLinkResponse = z.infer<typeof PasswordResetLinkResponseSchema>;

export const PhoneVerificationSendRequestSchema = z.object({
  phone: z.string(),
  purpose: z.enum(["SIGNUP", "CHANGE"]),
});
export type PhoneVerificationSendRequest = z.infer<typeof PhoneVerificationSendRequestSchema>;

export const PhoneVerificationSendResponseSchema = z.object({
  accepted: z.boolean(),
  resendAfterSeconds: z.number(),
});
export type PhoneVerificationSendResponse = z.infer<typeof PhoneVerificationSendResponseSchema>;

export const PhoneVerifyRequestSchema = z.object({
  phone: z.string(),
  purpose: z.enum(["SIGNUP", "CHANGE"]),
  code: z.string(),
});
export type PhoneVerifyRequest = z.infer<typeof PhoneVerifyRequestSchema>;

export const PhoneVerifyResponseSchema = z.object({
  verifiedPhoneTicket: z.string(),
  expiresAt: z.string(),
});
export type PhoneVerifyResponse = z.infer<typeof PhoneVerifyResponseSchema>;

export const RecoveryOptionsResponseSchema = z.object({
  existingAccountFound: z.boolean(),
  availableLoginMethods: z.array(z.string()),
  passwordResetAvailable: z.boolean(),
});
export type RecoveryOptionsResponse = z.infer<typeof RecoveryOptionsResponseSchema>;

export const SignupEmailRequestSchema = z.object({
  verifiedEmailTicket: z.string(),
  verifiedPhoneTicket: z.string().optional(),
  phone: z.string().optional(),
  password: z.string(),
  displayName: z.string(),
  agreedTerms: z.array(z.object({ termsCode: z.string(), version: z.string() })),
});
export type SignupEmailRequest = z.infer<typeof SignupEmailRequestSchema>;

export const SignupEmailResponseSchema = z.object({
  accessCondition: z.string(),
  officeId: z.number().nullable(),
  role: z.enum(["OWNER", "AGENT", "DEPUTY"]).nullable(),
  pendingRegistrationId: z.number().nullable(),
  pendingMembershipId: z.number().nullable(),
  unresolvedRejection: z.record(z.string(), z.unknown()).nullable().optional(),
  graceUntil: z.iso.datetime({ offset: true }).nullable().optional(),
  returnPeriodEndsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  restrictionReason: z.string().nullable().optional(),
  removalReason: z.string().nullable().optional(),
});
export type SignupEmailResponse = z.infer<typeof SignupEmailResponseSchema>;

export const EmailVerificationRequestSchema = z.object({ email: z.string() });
export type EmailVerificationRequest = z.infer<typeof EmailVerificationRequestSchema>;

export const EmailVerificationSendResponseSchema = z.object({
  accepted: z.boolean(),
  resendAfterSeconds: z.number(),
});
export type EmailVerificationSendResponse = z.infer<typeof EmailVerificationSendResponseSchema>;

export const EmailVerifyRequestSchema = z.object({ token: z.string() });
export type EmailVerifyRequest = z.infer<typeof EmailVerifyRequestSchema>;

export const EmailVerifyResponseSchema = z.object({ verifiedEmailTicket: z.string() });
export type EmailVerifyResponse = z.infer<typeof EmailVerifyResponseSchema>;

export const SignupKakaoRequestSchema = z.object({
  displayName: z.string(),
  verifiedPhoneTicket: z.string().optional(),
  phone: z.string().optional(),
  kakaoReferenceEmail: z.string().nullable().optional(),
  agreedTerms: z.array(z.object({ termsCode: z.string(), version: z.string() })),
});
export type SignupKakaoRequest = z.infer<typeof SignupKakaoRequestSchema>;

export const SignupKakaoResponseSchema = z.object({
  accessCondition: z.string(),
  officeId: z.number().nullable(),
  role: z.enum(["OWNER", "AGENT", "DEPUTY"]).nullable(),
  pendingRegistrationId: z.number().nullable(),
  pendingMembershipId: z.number().nullable(),
  unresolvedRejection: z.record(z.string(), z.unknown()).nullable().optional(),
  graceUntil: z.iso.datetime({ offset: true }).nullable().optional(),
  returnPeriodEndsAt: z.iso.datetime({ offset: true }).nullable().optional(),
  restrictionReason: z.string().nullable().optional(),
  removalReason: z.string().nullable().optional(),
});
export type SignupKakaoResponse = z.infer<typeof SignupKakaoResponseSchema>;

export const KakaoStepUpCallbackResponseSchema = z.object({});
export type KakaoStepUpCallbackResponse = z.infer<typeof KakaoStepUpCallbackResponseSchema>;

export const KakaoStepUpAuthorizationResponseSchema = z.object({});
export type KakaoStepUpAuthorizationResponse = z.infer<
  typeof KakaoStepUpAuthorizationResponseSchema
>;

export const StepUpPasswordRequestSchema = z.object({ password: z.string() });
export type StepUpPasswordRequest = z.infer<typeof StepUpPasswordRequestSchema>;

export const PasswordStepUpResponseSchema = z.object({
  stepUpValid: z.boolean(),
  stepUpExpiresAt: z.string(),
});
export type PasswordStepUpResponse = z.infer<typeof PasswordStepUpResponseSchema>;

export const ContactChangeRequestSchema = z.object({
  email: z.string().optional(),
  verifiedTicket: z.string().optional(),
  phone: z.string().optional(),
});
export type ContactChangeRequest = z.infer<typeof ContactChangeRequestSchema>;

export const ContactChangeResponseSchema = z.object({
  field: z.string(),
  value: z.string(),
  verifiedAt: z.string(),
});
export type ContactChangeResponse = z.infer<typeof ContactChangeResponseSchema>;

export const LoginMethodLinkRequestSchema = z.object({
  verifiedEmailTicket: z.string(),
  password: z.string(),
});
export type LoginMethodLinkRequest = z.infer<typeof LoginMethodLinkRequestSchema>;

export const EmailLoginMethodLinkResponseSchema = z.object({
  method: z.string(),
  linked: z.boolean(),
});
export type EmailLoginMethodLinkResponse = z.infer<typeof EmailLoginMethodLinkResponseSchema>;

export const EmailLoginMethodVerificationResponseSchema = z.object({
  accepted: z.boolean(),
  resendAfterSeconds: z.number(),
});
export type EmailLoginMethodVerificationResponse = z.infer<
  typeof EmailLoginMethodVerificationResponseSchema
>;

export const KakaoLoginMethodLinkResponseSchema = z.object({
  method: z.string(),
  linked: z.boolean(),
});
export type KakaoLoginMethodLinkResponse = z.infer<typeof KakaoLoginMethodLinkResponseSchema>;

export const LoginMethodUnlinkRequestSchema = z.object({});
export type LoginMethodUnlinkRequest = z.infer<typeof LoginMethodUnlinkRequestSchema>;

export const LoginMethodUnlinkResponseSchema = z.object({});
export type LoginMethodUnlinkResponse = z.infer<typeof LoginMethodUnlinkResponseSchema>;

export const TermsAgreementRequestSchema = z.object({
  termsCode: z.string(),
  version: z.string(),
  agreed: z.boolean(),
  consentPath: z.string(),
});
export type TermsAgreementRequest = z.infer<typeof TermsAgreementRequestSchema>;

export const TermsAgreementResponseSchema = z.object({});
export type TermsAgreementResponse = z.infer<typeof TermsAgreementResponseSchema>;

export const TermsCatalogResponseSchema = z.object({
  items: z.array(
    z.object({
      termsCode: z.string(),
      version: z.string(),
      required: z.boolean(),
      title: z.string(),
      documentUrl: z.string(),
      category: z.string(),
      reconsentRequired: z.boolean(),
      changeSummary: z.string().nullable(),
    }),
  ),
  phoneVerificationRequired: z.boolean().default(true),
});
export type TermsCatalogResponse = z.infer<typeof TermsCatalogResponseSchema>;

export const MemberWithdrawalRequestSchema = z.object({});
export type MemberWithdrawalRequest = z.infer<typeof MemberWithdrawalRequestSchema>;

export const MemberWithdrawalResponseSchema = z.object({});
export type MemberWithdrawalResponse = z.infer<typeof MemberWithdrawalResponseSchema>;

export const MeResponseSchema = z.object({
  userId: z.number(),
  displayName: z.string(),
  email: z.string().nullable().optional(),
  emailVerified: z.boolean(),
  phone: z.string().nullable().optional(),
  phoneVerified: z.boolean(),
  kakaoLinked: z.boolean(),
  loginMethods: z.array(z.string()),
  accountStatus: z.string(),
  notificationPreferences: z.object({
    channels: z.object({
      VISIT_REMINDER: z.boolean(),
      MARKETING: z.boolean(),
      SECURITY: z.boolean(),
    }),
    mandatoryTypes: z.array(z.string()),
  }),
  createdAt: z.iso.datetime({ offset: true }),
  termsAgreements: z.array(
    z.object({
      termsCode: z.string(),
      termsName: z.string(),
      required: z.boolean(),
      withdrawable: z.boolean(),
      termsVersion: z.string(),
      agreed: z.boolean(),
      recordedAt: z.iso.datetime({ offset: true }),
    }),
  ),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const MeUpdateRequestSchema = z.object({ displayName: z.string() });
export type MeUpdateRequest = z.infer<typeof MeUpdateRequestSchema>;

export const MeUpdateResponseSchema = z.object({
  userId: z.number(),
  displayName: z.string(),
  email: z.string().nullable().optional(),
  emailVerified: z.boolean(),
  phone: z.string().nullable().optional(),
  phoneVerified: z.boolean(),
  kakaoLinked: z.boolean(),
  accountStatus: z.string(),
  createdAt: z.string(),
});
export type MeUpdateResponse = z.infer<typeof MeUpdateResponseSchema>;

export const LoginHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      loginHistoryId: z.number(),
      authMethod: z.string(),
      ipAddress: z.string(),
      userAgent: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type LoginHistoryResponse = z.infer<typeof LoginHistoryResponseSchema>;

export const NotificationPreferenceUpdateRequestSchema = z.object({
  channels: z.record(z.string(), z.boolean()),
});
export type NotificationPreferenceUpdateRequest = z.infer<
  typeof NotificationPreferenceUpdateRequestSchema
>;

export const NotificationPreferenceUpdateResponseSchema = z.object({
  channels: z.record(z.string(), z.unknown()),
});
export type NotificationPreferenceUpdateResponse = z.infer<
  typeof NotificationPreferenceUpdateResponseSchema
>;

export const KakaoUnlinkWebhookRequestSchema = z.object({
  appId: z.string(),
  userId: z.string(),
  referrerType: z.string(),
  groupUserToken: z.string().nullable().optional(),
});
export type KakaoUnlinkWebhookRequest = z.infer<typeof KakaoUnlinkWebhookRequestSchema>;

export const KakaoUnlinkWebhookResponseSchema = z.object({});
export type KakaoUnlinkWebhookResponse = z.infer<typeof KakaoUnlinkWebhookResponseSchema>;

export const MarketingUnsubscribeRequestSchema = z.object({ token: z.string() });
export type MarketingUnsubscribeRequest = z.infer<typeof MarketingUnsubscribeRequestSchema>;

export const MarketingUnsubscribeResponseSchema = z.object({
  status: z.string(),
  expressedAt: z.iso.datetime({ offset: true }),
  processedAt: z.iso.datetime({ offset: true }),
  resultNoticeDueAt: z.iso.datetime({ offset: true }),
  emailNoticeScheduled: z.boolean(),
});
export type MarketingUnsubscribeResponse = z.infer<typeof MarketingUnsubscribeResponseSchema>;

export const TermsReconsentResponseSchema = z.object({
  reconsentRequired: z.boolean(),
  items: z.array(
    z.object({
      termsCode: z.string(),
      previousVersion: z.string().nullable(),
      version: z.string(),
      category: z.string(),
      required: z.boolean(),
      effectiveAt: z.iso.datetime({ offset: true }),
      changeSummary: z.string().nullable(),
      documentUrl: z.string(),
      previousDocumentUrl: z.string().nullable(),
    }),
  ),
});
export type TermsReconsentResponse = z.infer<typeof TermsReconsentResponseSchema>;

export const TermsAgreementHistoryResponseSchema = z.object({
  items: z.array(
    z.object({
      agreementId: z.number(),
      termsCode: z.string(),
      termsName: z.string(),
      version: z.string(),
      agreed: z.boolean(),
      consentPath: z.string(),
      recordedAt: z.iso.datetime({ offset: true }),
    }),
  ),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
});
export type TermsAgreementHistoryResponse = z.infer<typeof TermsAgreementHistoryResponseSchema>;

export const WithdrawalPreviewResponseSchema = z.object({
  isOwner: z.boolean(),
  isLastOwner: z.boolean(),
  kakaoLinked: z.boolean(),
  destroyedItems: z.array(z.string()),
  retainedItems: z.array(
    z.object({
      itemCode: z.string(),
      itemName: z.string(),
      reason: z.string(),
      reviewTargetLaws: z.array(z.string()),
      retentionDays: z.number(),
      anchorEvent: z.string(),
      ruleStatus: z.string(),
    }),
  ),
  displayRuleNotice: z.string(),
});
export type WithdrawalPreviewResponse = z.infer<typeof WithdrawalPreviewResponseSchema>;

export const LoginMethodEmailVerifyResponseSchema = z.object({ verifiedEmailTicket: z.string() });
export type LoginMethodEmailVerifyResponse = z.infer<typeof LoginMethodEmailVerifyResponseSchema>;

export const LoginMethodKakaoAuthorizationResponseSchema = z.object({});
export type LoginMethodKakaoAuthorizationResponse = z.infer<
  typeof LoginMethodKakaoAuthorizationResponseSchema
>;

export const ContactEmailVerificationSendResponseSchema = z.object({
  accepted: z.boolean(),
  resendAfterSeconds: z.number(),
});
export type ContactEmailVerificationSendResponse = z.infer<
  typeof ContactEmailVerificationSendResponseSchema
>;

export const ContactEmailVerifyResponseSchema = z.object({ verifiedEmailTicket: z.string() });
export type ContactEmailVerifyResponse = z.infer<typeof ContactEmailVerifyResponseSchema>;
