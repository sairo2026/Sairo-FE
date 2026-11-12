import { http, HttpResponse } from "msw";
import type {
  HomeSummaryResponse,
  MonthlySettlementResponse,
  NotificationListResponse,
  TaskListResponse,
} from "@/lib/api/contracts/work.schema";
import { errorResponse, mockErrors } from "../error-responses";

const NOW = "2026-11-10T09:00:00+09:00";

export type MockTask = TaskListResponse["items"][number];
export type MockNotification = NotificationListResponse["items"][number];
export type MockWorkRole = "OWNER" | "AGENT" | "DEPUTY";
type StatusCount = HomeSummaryResponse["coordinationStatusCounts"][number];

export type MockMemo = {
  content: string | null;
  version: number;
  updatedByMemberName: string | null;
  updatedAt: string | null;
};

export type WorkMockState = {
  callerRole: MockWorkRole;
  callerMembershipId: number;
  tasks: MockTask[];
  notifications: MockNotification[];
  todayVisits: HomeSummaryResponse["todayScheduledVisits"];
  followupTasks: HomeSummaryResponse["openFollowupTasks"];
  statusCounts: StatusCount[];
  leaseExpiringCount: number;
  calendarDays: HomeSummaryResponse["calendarDays"];
  officeCreatedYearMonth: string;
  settlement: Partial<MonthlySettlementResponse>;
  memos: Record<string, MockMemo>;
  nextId: number;
};

export const MOCK_STATUS_ORDER = [
  "TIME_COLLECTING",
  "COORDINATABLE",
  "FINAL_CONFIRMATION_REQUIRED",
  "APPLYING",
  "CONFIRMED",
  "RESCHEDULE_REQUIRED",
  "VISIT_COMPLETED",
  "VISIT_INCOMPLETE",
  "CANCELLED",
] as const;

export function buildMockTask(partial: Partial<MockTask> & Pick<MockTask, "taskId">): MockTask {
  return {
    assigneeMembershipId: 2,
    assigneeName: "이중개",
    dueDate: todayKst(),
    title: "업무",
    status: "TODO",
    sourceType: "MANUAL",
    dueTime: null,
    relatedCustomerId: null,
    relatedCustomerName: null,
    relatedPropertyId: null,
    relatedPropertyName: null,
    memo: null,
    completedAt: null,
    officeId: 12,
    createdAt: NOW,
    updatedAt: NOW,
    version: 1,
    ...partial,
  };
}

export function buildMockNotification(
  partial: Partial<MockNotification> & Pick<MockNotification, "notificationId">,
): MockNotification {
  return {
    type: "VISIT_CONFIRMED",
    message: "방문 일정이 확정되었습니다.",
    read: false,
    targetType: "VISIT_COORDINATION",
    targetId: 801,
    createdAt: NOW,
    ...partial,
  };
}

function todayKst(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}

function currentMonthKst(): string {
  return todayKst().slice(0, 7);
}

function initialState(): WorkMockState {
  return {
    callerRole: "OWNER",
    callerMembershipId: 2,
    tasks: [buildMockTask({ taskId: 6001, title: "임장 안내 문자 확인", dueDate: todayKst() })],
    notifications: [
      buildMockNotification({ notificationId: 9001 }),
      buildMockNotification({
        notificationId: 9002,
        type: "PAYMENT",
        message: "결제가 완료되었습니다.",
        read: true,
        targetType: "SUBSCRIPTION",
        targetId: null,
      }),
    ],
    todayVisits: [
      {
        scheduleItemId: 5001,
        coordinationId: 801,
        scheduledStartAt: "2026-11-10T14:00:00+09:00",
        propertyAddress: "서울특별시 성북구 정릉로 77",
        customerName: "김수요",
      },
    ],
    followupTasks: [{ taskId: 7001, title: "전세 계약 D-90 후속업무", dueDate: "2026-12-01" }],
    statusCounts: MOCK_STATUS_ORDER.map((status) => ({
      status,
      count: status === "COORDINATABLE" ? 1 : 0,
    })),
    leaseExpiringCount: 2,
    calendarDays: [{ date: todayKst(), visitCount: 1, taskCount: 1 }],
    officeCreatedYearMonth: "2026-08",
    settlement: {},
    memos: {},
    nextId: 6100,
  };
}

let state = initialState();

export function resetMockWorkState(): void {
  state = initialState();
}

export function getMockWorkState(): WorkMockState {
  return state;
}

export function setMockWorkState(partial: Partial<WorkMockState>): void {
  state = { ...state, ...partial };
}

function isOverdue(task: MockTask): boolean {
  return task.status === "TODO" && task.dueDate < todayKst();
}

function visibleTasks(): MockTask[] {
  if (state.callerRole !== "DEPUTY") return state.tasks;
  // 백엔드처럼 중개보조원에게는 계약 자동 업무를 보여주지 않는다(TaskRepository excludeContract).
  return state.tasks.filter(
    (task) =>
      task.assigneeMembershipId === state.callerMembershipId &&
      task.sourceType !== "CONTRACT_BALANCE" &&
      task.sourceType !== "CONTRACT_MATURITY",
  );
}

function paged<T>(items: T[], url: URL) {
  const size = Number(url.searchParams.get("size") ?? 25);
  const page = Number(url.searchParams.get("page") ?? 0);
  return {
    items: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
  };
}

function settlementFor(yearMonth: string): MonthlySettlementResponse {
  return {
    yearMonth,
    isFinalized: yearMonth < currentMonthKst(),
    propertyCountTotal: 12,
    customerCountTotal: 30,
    propertyCountNew: 3,
    customerCountNew: 5,
    firstInquiryCount: 4,
    visitCompletedCount: 7,
    visitCompletedPropertyCount: 5,
    coordinationEndedCount: 4,
    coordinationVisitCompletedCount: 3,
    coordinationVisitIncompleteCount: 1,
    contractSignedCount: 2,
    contractSignedPropertyCount: 2,
    leaseMaturityCount: 1,
    leaseMaturityPropertyCount: 1,
    agreedFeeTotal: 3_000_000,
    actualFeeReceivedTotal: 2_500_000,
    outstandingAmount: 500_000,
    overcollectedAmount: 0,
    propertyCountNewMigrated: 1,
    customerCountNewMigrated: 2,
    agreedFeeUndatedCount: 0,
    asOf: NOW,
    ...state.settlement,
  };
}

function monthProblem(yearMonth: string | readonly string[] | undefined) {
  const value = String(yearMonth);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return mockErrors.validation([{ field: "yearMonth", message: "형식이 올바르지 않습니다." }]);
  }
  if (value > currentMonthKst() || value < state.officeCreatedYearMonth) {
    return mockErrors.validation([{ field: "yearMonth", message: "조회할 수 없는 월입니다." }]);
  }
  return null;
}

const SENSITIVE = /\d{6}-?[1-4]\d{6}/;

export const workHandlers = [
  http.get("/api/home", () => {
    const tasks = visibleTasks().filter((task) => task.status === "TODO");
    const deputy = state.callerRole === "DEPUTY";
    return HttpResponse.json({
      todayScheduledVisits: state.todayVisits,
      openFollowupTasks: deputy ? [] : state.followupTasks,
      activeCoordinationCount: state.statusCounts
        .filter(
          (item) => !["VISIT_COMPLETED", "VISIT_INCOMPLETE", "CANCELLED"].includes(item.status),
        )
        .reduce((sum, item) => sum + item.count, 0),
      openTasks: tasks.map((task) => ({
        taskId: task.taskId,
        title: task.title,
        dueDate: task.dueDate,
        status: "TODO" as const,
        assigneeMembershipId: task.assigneeMembershipId,
        assigneeName: task.assigneeName,
        overdue: isOverdue(task),
      })),
      unreadNotificationCount: state.notifications.filter((item) => !item.read).length,
      coordinationStatusCounts: state.statusCounts,
      leaseExpiringWithin90DaysCount: deputy ? 0 : state.leaseExpiringCount,
      calendarDays: state.calendarDays,
    } satisfies HomeSummaryResponse);
  }),

  http.get("/api/tasks", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const assignee = url.searchParams.get("assigneeMembershipId");
    const rows = visibleTasks()
      .filter((task) => (status ? status.split(",").includes(task.status) : true))
      .filter((task) => (assignee ? String(task.assigneeMembershipId) === assignee : true));
    return HttpResponse.json(paged(rows, url));
  }),

  http.post("/api/tasks", async ({ request }) => {
    const body = (await request.json()) as Partial<MockTask> & { assigneeMembershipId?: number };
    const allowedKeys = [
      "title",
      "assigneeMembershipId",
      "dueDate",
      "dueTime",
      "relatedCustomerId",
      "relatedPropertyId",
      "memo",
    ];
    const extra = Object.keys(body).find((key) => !allowedKeys.includes(key));
    if (extra)
      return mockErrors.validation([{ field: extra, message: "허용되지 않은 필드입니다." }]);
    if (!body.title || String(body.title).trim() === "") {
      return mockErrors.validation([{ field: "title", message: "제목은 필수입니다." }]);
    }
    if (state.callerRole === "DEPUTY" && body.assigneeMembershipId !== state.callerMembershipId) {
      return mockErrors.forbidden();
    }
    const created = buildMockTask({
      taskId: state.nextId++,
      title: body.title,
      assigneeMembershipId: body.assigneeMembershipId ?? state.callerMembershipId,
      assigneeName: "담당자",
      dueDate: body.dueDate ?? todayKst(),
      dueTime: body.dueTime ?? null,
      memo: body.memo ?? null,
    });
    state.tasks = [...state.tasks, created];
    return HttpResponse.json({ ...created, sourceId: null }, { status: 201 });
  }),

  http.patch("/api/tasks/:taskId", async ({ request, params }) => {
    const found = visibleTasks().find((task) => String(task.taskId) === params.taskId);
    if (!found) return mockErrors.notFound();
    const header = request.headers.get("If-Match");
    if (header === null) {
      return mockErrors.validation([{ field: "If-Match", message: "업무 버전이 필요합니다." }]);
    }
    const body = (await request.json()) as Partial<MockTask>;
    // 백엔드 TaskService는 자동 업무 제한을 버전 비교보다 먼저 본다.
    if (found.sourceType !== "MANUAL") {
      const allowed = Object.keys(body).every((key) => key === "memo" || key === "status");
      if (!allowed || body.status === "CANCELLED") {
        return errorResponse(403, "AUTO_TASK_IMMUTABLE", "자동 생성 업무는 고칠 수 없습니다.");
      }
    }
    if (Number(header) !== found.version) return mockErrors.versionConflict(found.version);
    if (typeof body.memo === "string" && SENSITIVE.test(body.memo)) {
      return errorResponse(400, "SENSITIVE_DATA_DETECTED", "민감한 정보가 감지되었습니다.");
    }
    const next: MockTask = {
      ...found,
      ...body,
      version: found.version + 1,
      completedAt: body.status === "DONE" ? NOW : body.status === "TODO" ? null : found.completedAt,
    };
    state.tasks = state.tasks.map((task) => (task === found ? next : task));
    return HttpResponse.json({ ...next, sourceId: null });
  }),

  http.delete("/api/tasks/:taskId", ({ params }) => {
    const found = visibleTasks().find((task) => String(task.taskId) === params.taskId);
    if (!found) return mockErrors.notFound();
    if (found.sourceType !== "MANUAL") {
      return errorResponse(403, "AUTO_TASK_IMMUTABLE", "자동 생성 업무는 삭제할 수 없습니다.");
    }
    state.tasks = state.tasks.filter((task) => task !== found);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/notifications", ({ request }) => {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const rows = state.notifications.filter((item) => (unreadOnly ? !item.read : true));
    return HttpResponse.json(paged(rows, url));
  }),

  http.post("/api/notifications/:notificationId/read", ({ params }) => {
    const found = state.notifications.find(
      (item) => String(item.notificationId) === params.notificationId,
    );
    if (!found) return mockErrors.notFound();
    state.notifications = state.notifications.map((item) =>
      item === found ? { ...item, read: true } : item,
    );
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/settlements", () => {
    if (state.callerRole === "DEPUTY") return mockErrors.forbidden();
    const items: Array<{ yearMonth: string; isFinalized: boolean; contractSignedCount: number }> =
      [];
    let month = state.officeCreatedYearMonth;
    const last = currentMonthKst();
    while (month <= last) {
      items.push({ yearMonth: month, isFinalized: month < last, contractSignedCount: 2 });
      const [year, mm] = month.split("-").map(Number);
      const index = (year ?? 0) * 12 + (mm ?? 1);
      month = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
    }
    return HttpResponse.json({ items });
  }),

  http.get("/api/settlements/:yearMonth", ({ params }) => {
    if (state.callerRole === "DEPUTY") return mockErrors.forbidden();
    const problem = monthProblem(params.yearMonth);
    if (problem) return problem;
    return HttpResponse.json(settlementFor(String(params.yearMonth)));
  }),

  http.get("/api/settlements/:yearMonth/details", ({ params, request }) => {
    if (state.callerRole === "DEPUTY") return mockErrors.forbidden();
    const problem = monthProblem(params.yearMonth);
    if (problem) return problem;
    const url = new URL(request.url);
    const metric = url.searchParams.get("metric");
    const known = [
      "propertyCountTotal",
      "propertyCountNew",
      "propertyCountNewMigrated",
      "customerCountTotal",
      "customerCountNew",
      "customerCountNewMigrated",
      "firstInquiryCount",
      "visitCompletedCount",
      "visitCompletedPropertyCount",
      "coordinationEndedCount",
      "coordinationVisitCompletedCount",
      "coordinationVisitIncompleteCount",
      "contractSignedCount",
      "contractSignedPropertyCount",
      "leaseMaturityCount",
      "leaseMaturityPropertyCount",
      "agreedFeeTotal",
      "agreedFeeUndatedCount",
      "actualFeeReceivedTotal",
      "outstandingAmount",
      "overcollectedAmount",
    ];
    if (!metric || !known.includes(metric)) {
      return mockErrors.validation([
        { field: "metric", message: "지표 이름이 올바르지 않습니다." },
      ]);
    }
    const rows: Record<string, unknown>[] = detailRows(metric);
    return HttpResponse.json({ metric, yearMonth: params.yearMonth, ...paged(rows, url) });
  }),

  http.get("/api/settlements/:yearMonth/memo", ({ params }) => {
    if (state.callerRole === "DEPUTY") return mockErrors.forbidden();
    const problem = monthProblem(params.yearMonth);
    if (problem) return problem;
    const memo = state.memos[String(params.yearMonth)];
    return HttpResponse.json({
      yearMonth: params.yearMonth,
      content: memo?.content ?? null,
      version: memo?.version ?? 0,
      updatedByMemberName: memo?.updatedByMemberName ?? null,
      updatedAt: memo?.updatedAt ?? null,
    });
  }),

  http.put("/api/settlements/:yearMonth/memo", async ({ params, request }) => {
    if (state.callerRole === "DEPUTY") return mockErrors.forbidden();
    const problem = monthProblem(params.yearMonth);
    if (problem) return problem;
    const key = String(params.yearMonth);
    const header = request.headers.get("If-Match");
    if (header === null || Number.isNaN(Number(header))) {
      return mockErrors.validation([{ field: "If-Match", message: "메모 버전이 필요합니다." }]);
    }
    const current = state.memos[key] ?? {
      content: null,
      version: 0,
      updatedByMemberName: null,
      updatedAt: null,
    };
    if (Number(header) !== current.version) return mockErrors.versionConflict(current.version);
    const body = (await request.json()) as { content: string };
    if (Array.from(body.content).length > 2000) {
      return mockErrors.validation([
        { field: "content", message: "2000자까지 입력할 수 있습니다." },
      ]);
    }
    if (SENSITIVE.test(body.content)) {
      return errorResponse(400, "SENSITIVE_DATA_DETECTED", "민감한 정보가 감지되었습니다.");
    }
    const saved: MockMemo = {
      content: body.content === "" ? null : body.content,
      version: current.version + 1,
      updatedByMemberName: "이중개",
      updatedAt: NOW,
    };
    state.memos = { ...state.memos, [key]: saved };
    return HttpResponse.json({
      yearMonth: key,
      content: saved.content,
      version: saved.version,
      updatedByMembershipId: state.callerMembershipId,
      updatedByMemberName: "이중개",
      updatedAt: NOW,
    });
  }),
];

function detailRows(metric: string): Record<string, unknown>[] {
  if (metric.startsWith("propertyCount")) {
    return [
      {
        propertyId: 501,
        propertyName: "국민대 앞 아파트",
        address: "서울특별시 성북구 정릉로 77",
        effectiveAt: NOW,
        isMigrated: metric.endsWith("Migrated"),
      },
    ];
  }
  if (metric.startsWith("customerCount")) {
    return [{ customerId: 301, customerName: "김수요", effectiveAt: NOW, isMigrated: false }];
  }
  switch (metric) {
    case "firstInquiryCount":
      return [{ consultationId: 1, customerId: 301, customerName: "김수요", occurredAt: NOW }];
    case "visitCompletedCount":
      return [
        {
          coordinationId: 801,
          scheduleItemId: 5001,
          propertyId: 501,
          propertyAddress: "서울특별시 성북구 정릉로 77",
          customerName: "김수요",
          actualVisitedAt: NOW,
        },
      ];
    case "visitCompletedPropertyCount":
    case "contractSignedPropertyCount":
    case "leaseMaturityPropertyCount":
      return [
        {
          propertyId: 501,
          propertyAddress: "서울특별시 성북구 정릉로 77",
          visitCompletedCount: 2,
          contractCount: 1,
        },
      ];
    case "coordinationEndedCount":
    case "coordinationVisitCompletedCount":
    case "coordinationVisitIncompleteCount":
      return [
        { coordinationId: 801, customerName: "김수요", endedAt: NOW, endType: "VISIT_COMPLETED" },
      ];
    case "contractSignedCount":
      return [
        {
          contractId: 9101,
          propertyId: 501,
          propertyAddress: "서울특별시 성북구 정릉로 77",
          dealType: "JEONSE",
          signedDate: "2026-11-03",
        },
      ];
    case "leaseMaturityCount":
      return [
        {
          contractId: 9101,
          propertyId: 501,
          propertyAddress: "서울특별시 성북구 정릉로 77",
          leaseEndDate: "2026-11-30",
        },
      ];
    case "agreedFeeTotal":
      return [
        {
          feeId: 1,
          contractId: 9101,
          propertyAddress: "서울특별시 성북구 정릉로 77",
          payerName: "박임대",
          balanceDueDate: "2026-11-20",
          agreedFeeAmount: 1_500_000,
        },
      ];
    case "agreedFeeUndatedCount":
      return [
        {
          contractId: 9102,
          propertyAddress: "서울특별시 성북구 보국문로 10",
          balanceDatePendingReason: "잔금일 협의 중",
          balanceDueDatePendingReason: "잔금일 협의 중",
        },
      ];
    case "actualFeeReceivedTotal":
      return [
        {
          transactionId: 1,
          feeId: 1,
          contractId: 9101,
          propertyAddress: "서울특별시 성북구 정릉로 77",
          payerName: "박임대",
          transactionType: "RECEIPT",
          amount: 1_000_000,
          actualDate: "2026-11-05",
        },
      ];
    default:
      return [
        {
          payerPartyId: 1,
          payerName: metric === "outstandingAmount" ? "박임대" : "최임차",
          payerType: "SELLER_LANDLORD",
          contractId: 9101,
          propertyAddress: "서울특별시 성북구 정릉로 77",
          billedTotal: 1_500_000,
          netReceivedTotal: metric === "outstandingAmount" ? 1_000_000 : 1_600_000,
          balanceAmount: 100_000,
        },
      ];
  }
}
