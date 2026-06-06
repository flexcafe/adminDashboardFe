import { afterEach, describe, expect, it, vi } from "vitest";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import {
  callAssistantCompletion,
  executeAssistantAction,
  hasWriteConfirmationPhrase,
  isWriteAction,
} from "../aiAssistantApi";

const UUIDS = {
  user: "11111111-1111-4111-8111-111111111111",
  transaction: "22222222-2222-4222-8222-222222222222",
  facebook: "33333333-3333-4333-8333-333333333333",
  slider: "44444444-4444-4444-8444-444444444444",
  category: "55555555-5555-4555-8555-555555555555",
};

const baseArgs = {
  apiKey: "test-key",
  model: "deepseek-ai/deepseek-v3.2",
  messages: [],
  dashboardContext: "No dashboard data loaded yet.",
  memorySummary: "Facts:\n- None\nPreferences:\n- None",
  agentMode: false,
};

describe("callAssistantCompletion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts OpenAI-compatible message content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "APIFREE_OK" } }],
      }),
    } as Response);

    await expect(callAssistantCompletion(baseArgs)).resolves.toEqual({
      content: "APIFREE_OK",
      action: null,
    });
  });

  it("surfaces APIFree error payloads returned with HTTP 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 500,
        error: {
          code: "invalid_request_error",
          message: "model schema not found",
          type: "invalid_request_error",
        },
      }),
    } as Response);

    await expect(callAssistantCompletion(baseArgs)).rejects.toThrow(
      "AI provider error: model schema not found"
    );
  });

  it("grounds the prompt with all dashboard feature areas", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "OK" } }],
      }),
    } as Response);

    await callAssistantCompletion({
      ...baseArgs,
      agentMode: true,
      dashboardContext: JSON.stringify({
        kbzRegisteredAccounts: [],
        safePaymentPending: [],
        pointsStarConfig: [],
        fraudReports: [],
        suggestions: [],
        notifications: [],
        withdrawals: [],
        facebookFollowSubmissions: [],
        sliderAds: [],
        adminRoles: [],
        categories: [],
      }),
    });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const systemPrompt = requestBody.messages[0].content;

    expect(systemPrompt).toContain("KBZPay verification");
    expect(systemPrompt).toContain("Admin chat safe payments");
    expect(systemPrompt).toContain("Fraud reports");
    expect(systemPrompt).toContain("Points & withdrawals");
    expect(systemPrompt).toContain("Facebook follow");
    expect(systemPrompt).toContain("Slider ads");
    expect(systemPrompt).toContain("Admin roles");
    expect(systemPrompt).toContain("Categories");
    expect(systemPrompt).toContain("Notifications");
    expect(systemPrompt).toContain("Suggestions");
  });

  it("identifies the assistant as LOLI AI, not Flex AI", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "OK" } }],
      }),
    } as Response);

    await callAssistantCompletion(baseArgs);

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const systemPrompt = requestBody.messages[0].content;

    expect(systemPrompt).toContain("You are LOLI AI");
    expect(systemPrompt).toContain("When the user greets you, introduce yourself as LOLI AI");
    expect(systemPrompt).not.toContain("You are Flex AI");
  });

  it("normalizes old and returned Flex AI identity text to LOLI AI", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "I'm Flex AI, your admin assistant." } }],
      }),
    } as Response);

    const result = await callAssistantCompletion({
      ...baseArgs,
      messages: [
        {
          id: "old-1",
          role: "assistant",
          content: "Earlier I said I was Flex AI.",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const sentHistory = requestBody.messages.at(-1).content;

    expect(sentHistory).toBe("Earlier I said I was LOLI AI.");
    expect(result.content).toBe("I'm LOLI AI, your admin assistant.");
  });

  it("keeps the prompt limited to admin dashboard domains", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "OK" } }],
      }),
    } as Response);

    await callAssistantCompletion(baseArgs);

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const systemPrompt = requestBody.messages[0].content;

    expect(systemPrompt).not.toContain("List stocks");
    expect(systemPrompt).not.toContain("List suppliers");
    expect(systemPrompt).not.toContain("List customer debts");
  });

  it("documents the required write confirmation phrases in the prompt", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "OK" } }],
      }),
    } as Response);

    await callAssistantCompletion({
      ...baseArgs,
      agentMode: true,
    });

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const systemPrompt = requestBody.messages[0].content;

    expect(systemPrompt).toContain('"confirm and apply"');
    expect(systemPrompt).toContain('"confirm and execute"');
    expect(systemPrompt).toContain('"proceed with write"');
    expect(systemPrompt).toContain('"execute this write"');
  });
});

describe("executeAssistantAction", () => {
  const createHttpClient = () => ({
    get: vi.fn().mockResolvedValue({ ok: true }),
    post: vi.fn().mockResolvedValue({ ok: true }),
    put: vi.fn().mockResolvedValue({ ok: true }),
    patch: vi.fn().mockResolvedValue({ ok: true }),
    delete: vi.fn().mockResolvedValue({ ok: true }),
  });

  it("dispatches read tools to every dashboard list endpoint", async () => {
    const httpClient = createHttpClient();
    const resources = [
      ["kbz_registered_accounts", API_ENDPOINTS.AUTH.KBZPAY_REGISTERED_ACCOUNTS],
      ["kbz_verification_requested", API_ENDPOINTS.AUTH.KBZPAY_VERIFICATION_REQUESTED],
      ["kbz_money_check", API_ENDPOINTS.AUTH.KBZPAY_MONEY_CHECK],
      ["kbz_verified_users", API_ENDPOINTS.AUTH.KBZPAY_VERIFIED_USERS],
      ["safe_payment_awaiting_instruction", API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.AWAITING_INSTRUCTION],
      ["safe_payment_pending", API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.PENDING],
      ["points_star_config", API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG],
      ["points_rank_config", API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG],
      ["fraud_reports", API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.BASE],
      ["suggestions", API_ENDPOINTS.DASHBOARD_SUGGESTIONS.BASE],
      ["notifications", API_ENDPOINTS.DASHBOARD_NOTIFICATIONS.LIST],
      ["users", API_ENDPOINTS.USERS.GET_LIST],
      ["withdrawals", API_ENDPOINTS.DASHBOARD_WITHDRAWALS.BASE],
      ["facebook_follow_submissions", API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.BASE],
      ["slider_ads", API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BASE],
      ["admin_roles", API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BASE],
      ["admin_permissions", API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.PERMISSIONS],
      ["categories", API_ENDPOINTS.DASHBOARD_CATEGORIES.BASE],
    ] as const;

    for (const [resource] of resources) {
      await executeAssistantAction(httpClient as never, { type: "list", resource });
    }

    for (const [, endpoint] of resources) {
      expect(httpClient.get).toHaveBeenCalledWith(endpoint, { params: undefined });
    }
  });

  it("dispatches representative write tools to the correct endpoints", async () => {
    const httpClient = createHttpClient();

    await executeAssistantAction(httpClient as never, {
      type: "send_kbz_instruction",
      userId: UUIDS.user,
      adminPhoneForTransfer: "09123456789",
      adminNote: "Send 100 MMK",
    });
    await executeAssistantAction(httpClient as never, {
      type: "mark_safe_payment_received",
      transactionId: UUIDS.transaction,
      adminNote: "Received",
    });
    await executeAssistantAction(httpClient as never, {
      type: "approve_facebook_follow",
      submissionId: UUIDS.facebook,
    });
    await executeAssistantAction(httpClient as never, {
      type: "update_star_config",
      configs: [{ starCount: 1, pointsAwarded: 10 }],
    });
    await executeAssistantAction(httpClient as never, {
      type: "update_slider_ad",
      sliderId: UUIDS.slider,
      payload: { status: "INACTIVE" },
    });
    await executeAssistantAction(httpClient as never, {
      type: "create_admin_role",
      name: "Support",
      permissions: ["users_read"],
    });
    await executeAssistantAction(httpClient as never, {
      type: "move_category",
      categoryId: UUIDS.category,
      parentId: null,
      sortOrder: 2,
    });

    expect(httpClient.post).toHaveBeenCalledWith(
      API_ENDPOINTS.AUTH.KBZPAY_SEND_INSTRUCTION(UUIDS.user),
      { adminPhoneForTransfer: "09123456789", adminNote: "Send 100 MMK" }
    );
    expect(httpClient.post).toHaveBeenCalledWith(
      API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.RECEIVED(UUIDS.transaction),
      { adminNote: "Received" }
    );
    expect(httpClient.post).toHaveBeenCalledWith(
      API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.APPROVE(UUIDS.facebook)
    );
    expect(httpClient.put).toHaveBeenCalledWith(
      API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG,
      { configs: [{ starCount: 1, pointsAwarded: 10 }] }
    );
    expect(httpClient.patch).toHaveBeenCalledWith(
      API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BY_ID(UUIDS.slider),
      expect.any(FormData)
    );
    expect(httpClient.post).toHaveBeenCalledWith(
      API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BASE,
      {
        name: "Support",
        description: undefined,
        permissions: ["users_read"],
        isActive: undefined,
      }
    );
    expect(httpClient.patch).toHaveBeenCalledWith(
      API_ENDPOINTS.DASHBOARD_CATEGORIES.BY_ID(UUIDS.category),
      { parentId: null, sortOrder: 2 }
    );
  });
});

describe("write confirmation helpers", () => {
  it("matches only the configured confirmation phrases", () => {
    expect(hasWriteConfirmationPhrase("Please confirm and apply the withdrawal approval.")).toBe(true);
    expect(hasWriteConfirmationPhrase("Proceed with write for this change.")).toBe(true);
    expect(hasWriteConfirmationPhrase("Approve this now.")).toBe(false);
  });

  it("treats reads as safe and writes as gated", () => {
    expect(isWriteAction({ type: "list", resource: "withdrawals" })).toBe(false);
    expect(
      isWriteAction({
        type: "generic_api",
        endpoint: "categories_get_by_id",
        pathParams: { categoryId: UUIDS.category },
      })
    ).toBe(false);
    expect(
      isWriteAction({
        type: "approve_withdrawal",
        withdrawalId: UUIDS.user,
      })
    ).toBe(true);
  });
});
