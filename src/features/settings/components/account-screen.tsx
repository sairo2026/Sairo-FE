"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LoginHistoryResponse, MeResponse } from "@/lib/api/contracts/auth.schema";
import { FormAlert } from "@/shared/components/feedback/form-frame";
import { DetailList, StatusBadge, TextLink } from "@/shared/components/feedback/page-parts";
import { QueryGate } from "@/shared/components/feedback/query-gate";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import type { PageSize } from "@/shared/components/ui/data-table";
import { ConfirmDialog } from "@/shared/components/ui/modal";
import { PageHeader } from "@/shared/components/ui/page-header";
import { Toggle } from "@/shared/components/ui/select-field";
import { TextField } from "@/shared/components/ui/text-field";
import { accountQueryKey } from "@/shared/consent/consent.api";
import { useAccountMe } from "@/shared/consent/use-account-me";
import { countCodePoints, formatSeoulDateTime } from "@/shared/lib/format";
import { useOfficeAccess } from "@/shared/session/office-access-context";
import {
  leaveCurrentOffice,
  logoutSession,
  updateDisplayName,
  updateNotificationChannels,
} from "../api/settings.api";
import { useCurrentOffice, useLoginHistory } from "../hooks/settings-queries";
import { SETTINGS_COPY as COPY, describeSettingsError } from "../model/copy";
import { MarketingConsent } from "./marketing-consent";

const NAME_MAX = 50;

const ACCESS_LABEL: Record<string, string> = {
  ACTIVE: "이용 중",
  PAYMENT_OVERDUE: "결제 지연",
  VERIFIED_UNPAID: "결제 전",
  PRE_VERIFICATION: "사무소 인증 전",
  OFFICE_UNDER_REVIEW: "인증 심사 중",
  AUTH_REVOKED: "인증 중단",
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: COPY.roleOwner,
  AGENT: COPY.roleAgent,
  DEPUTY: COPY.roleDeputy,
};

function ProfileCard({ me }: { me: MeResponse }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(me.displayName);
  const [nameError, setNameError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const mutation = useMutation({
    mutationFn: updateDisplayName,
    onSuccess: async () => {
      setError(undefined);
      setMessage(COPY.nameSaved);
      await queryClient.invalidateQueries({ queryKey: accountQueryKey });
    },
    onError: (caught) => {
      setMessage(undefined);
      setError(describeSettingsError(caught, "이름을 저장하지 못했습니다."));
    },
  });

  function submit() {
    setMessage(undefined);
    setError(undefined);
    if (name.trim() === "") {
      setNameError(COPY.nameRequired);
      return;
    }
    if (countCodePoints(name.trim()) > NAME_MAX) {
      setNameError(COPY.nameTooLong);
      return;
    }
    setNameError(undefined);
    mutation.mutate(name.trim());
  }

  return (
    <Card title={COPY.profileTitle}>
      <div className="flex flex-col gap-4">
        <TextField
          label={COPY.nameLabel}
          value={name}
          onValueChange={(value) => {
            setName(value);
            setNameError(undefined);
          }}
          error={nameError}
        />
        {error ? <FormAlert>{error}</FormAlert> : null}
        {message ? (
          <p role="status" className="text-caption font-semibold text-primary">
            {message}
          </p>
        ) : null}
        <div>
          <Button isLoading={mutation.isPending} onClick={submit}>
            {COPY.nameSave}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ContactCard({ me }: { me: MeResponse }) {
  const methods = me.loginMethods.map((method) =>
    method === "KAKAO" ? COPY.methodKakao : method === "EMAIL" ? COPY.methodEmail : method,
  );
  return (
    <Card title={COPY.contactTitle}>
      <div className="flex flex-col gap-4">
        <DetailList
          items={[
            {
              label: COPY.email,
              value: me.email ? (
                <span className="flex items-center gap-2">
                  {me.email}
                  <StatusBadge
                    tone={me.emailVerified ? "green" : "amber"}
                    label={me.emailVerified ? COPY.verified : COPY.unverified}
                  />
                </span>
              ) : (
                COPY.none
              ),
            },
            {
              label: COPY.phone,
              value: me.phone ? (
                <span className="flex items-center gap-2">
                  {me.phone}
                  <StatusBadge
                    tone={me.phoneVerified ? "green" : "amber"}
                    label={me.phoneVerified ? COPY.verified : COPY.phoneUnverified}
                  />
                </span>
              ) : (
                COPY.none
              ),
            },
            { label: COPY.loginMethodsLabel, value: methods.join(", ") || COPY.none },
          ]}
        />
        <p className="text-caption text-ink-2">{COPY.reauthNote}</p>
        <div className="flex flex-wrap gap-4">
          <TextLink href="/settings/contact">{COPY.contactChange}</TextLink>
          <TextLink href="/settings/login-methods">{COPY.loginMethods}</TextLink>
        </div>
      </div>
    </Card>
  );
}

function OfficeCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { context, role } = useOfficeAccess();
  const hasOffice = role !== null && context.officeId !== null;
  const office = useCurrentOffice(hasOffice);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string>();

  const leave = useMutation({
    mutationFn: leaveCurrentOffice,
    onSuccess: async () => {
      setIsLeaving(false);
      await queryClient.invalidateQueries();
      router.replace("/home");
    },
    onError: (caught) => {
      setIsLeaving(false);
      setError(describeSettingsError(caught, "사무소에서 나가지 못했습니다."));
    },
  });

  return (
    <Card title={COPY.officeTitle}>
      {!hasOffice ? (
        <p className="text-caption text-ink-2">{COPY.officeNone}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <DetailList
            items={[
              {
                label: "사무소",
                value: office.data?.name ?? (office.isError ? "-" : "불러오는 중"),
              },
              { label: COPY.officeRole, value: role ? (ROLE_LABEL[role] ?? role) : "-" },
              {
                label: COPY.officeAccess,
                value: ACCESS_LABEL[context.accessCondition] ?? context.accessCondition,
              },
            ]}
          />
          {error ? <FormAlert>{error}</FormAlert> : null}
          {role === "OWNER" ? (
            <div className="flex flex-col gap-2">
              <p className="text-caption text-ink-2">{COPY.ownerLeaveBlocked}</p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/members/owner-transfer"
                  className="text-caption font-semibold text-primary hover:underline"
                >
                  {COPY.ownerTransfer}
                </Link>
                <Link
                  href="/office/close"
                  className="text-caption font-semibold text-primary hover:underline"
                >
                  {COPY.officeClose}
                </Link>
                <TextLink href="/office">{COPY.officeManage}</TextLink>
              </div>
            </div>
          ) : (
            <div>
              <Button variant="ghost" onClick={() => setIsLeaving(true)}>
                {COPY.leave}
              </Button>
            </div>
          )}
          <ConfirmDialog
            isOpen={isLeaving}
            title={COPY.leaveConfirmTitle}
            message={COPY.leaveConfirm}
            confirmLabel={COPY.leave}
            isPending={leave.isPending}
            onConfirm={() => leave.mutate()}
            onCancel={() => setIsLeaving(false)}
          />
        </div>
      )}
    </Card>
  );
}

function NotificationCard({ me }: { me: MeResponse }) {
  const queryClient = useQueryClient();
  const { isReadOnly } = useOfficeAccess();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const channels = me.notificationPreferences.channels;

  const mutation = useMutation({
    mutationFn: updateNotificationChannels,
    onSuccess: async () => {
      setError(undefined);
      setMessage(COPY.saved);
      await queryClient.invalidateQueries({ queryKey: accountQueryKey });
    },
    onError: (caught) => {
      setMessage(undefined);
      setError(describeSettingsError(caught, "알림 설정을 저장하지 못했습니다."));
    },
  });

  return (
    <Card title={COPY.notificationsTitle}>
      <div className="flex flex-col gap-5">
        <p className="text-caption text-ink-2">{COPY.notificationsIntro}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-body text-ink">{COPY.visitReminder}</span>
          <Toggle
            label={COPY.visitReminder}
            checked={channels.VISIT_REMINDER}
            disabled={isReadOnly || mutation.isPending}
            onCheckedChange={(value) => mutation.mutate({ VISIT_REMINDER: value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-body text-ink">{COPY.security}</span>
            <Toggle label={COPY.security} checked disabled onCheckedChange={() => undefined} />
          </div>
          <p className="text-caption text-ink-2">
            계정 보안을 위해 로그인·보안 알림은 끌 수 없습니다.
          </p>
        </div>
        <MarketingConsent me={me} isReadOnly={isReadOnly} />
        <p className="text-caption text-ink-2">{COPY.mandatoryNote}</p>
        {error ? <FormAlert>{error}</FormAlert> : null}
        {message ? (
          <p role="status" className="text-caption font-semibold text-primary">
            {message}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

type HistoryRow = LoginHistoryResponse["items"][number];

function LoginHistoryCard() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<PageSize>(25);
  const query = useLoginHistory({ page: page - 1, size });
  return (
    <Card title={COPY.loginHistoryTitle}>
      <DataTable<HistoryRow>
        caption={COPY.loginHistoryTitle}
        rows={query.data?.items ?? []}
        getRowId={(row) => String(row.loginHistoryId)}
        totalCount={query.data?.totalElements ?? 0}
        page={page}
        pageSize={size}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setSize(next);
          setPage(1);
        }}
        isLoading={query.isPending}
        errorMessage={
          query.isError
            ? describeSettingsError(query.error, "로그인 기록을 불러오지 못했습니다.")
            : undefined
        }
        onRetry={() => void query.refetch()}
        emptyMessage={COPY.loginHistoryEmpty}
        columns={[
          {
            key: "method",
            header: COPY.loginHistoryColumns[0],
            render: (row) => (row.authMethod === "KAKAO" ? COPY.methodKakao : COPY.methodEmail),
          },
          { key: "ip", header: COPY.loginHistoryColumns[1], render: (row) => row.ipAddress },
          { key: "agent", header: COPY.loginHistoryColumns[2], render: (row) => row.userAgent },
          {
            key: "time",
            header: COPY.loginHistoryColumns[3],
            render: (row) => formatSeoulDateTime(row.createdAt),
          },
        ]}
      />
    </Card>
  );
}

function SecurityCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>();
  const logout = useMutation({
    mutationFn: logoutSession,
    onSuccess: () => {
      queryClient.clear();
      router.replace("/login");
    },
    onError: (caught) => setError(describeSettingsError(caught, "로그아웃하지 못했습니다.")),
  });
  return (
    <Card title={COPY.securityTitle}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-caption text-ink-2">{COPY.withdrawalDescription}</p>
          <TextLink href="/account/withdrawal">{COPY.withdrawal}</TextLink>
        </div>
        {error ? <FormAlert>{error}</FormAlert> : null}
        <div>
          <Button variant="ghost" isLoading={logout.isPending} onClick={() => logout.mutate()}>
            {COPY.logout}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function AccountScreen() {
  const query = useAccountMe();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <PageHeader title={COPY.title} description={COPY.description} />
      <QueryGate query={query} loadingLabel="내 계정 정보를 불러오는 중입니다.">
        {(me) => (
          <>
            <ProfileCard key={me.userId} me={me} />
            <ContactCard me={me} />
            <OfficeCard />
            <NotificationCard me={me} />
            <Card title={COPY.consentsMenuTitle}>
              <div className="flex flex-col gap-2">
                <p className="text-caption text-ink-2">{COPY.consentsMenuDescription}</p>
                <TextLink href="/account/consents">{COPY.consentsMenuLink}</TextLink>
              </div>
            </Card>
            <LoginHistoryCard />
            <SecurityCard />
          </>
        )}
      </QueryGate>
    </main>
  );
}
