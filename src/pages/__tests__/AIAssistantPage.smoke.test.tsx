import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import "@/lib/i18n";
import { AIAssistantPage } from "../AIAssistantPage";

const httpGet = vi.fn();
const httpPost = vi.fn();
const httpPut = vi.fn();
const httpPatch = vi.fn();
const httpDelete = vi.fn();

vi.mock("@/core/infrastructure/di/container", () => ({
  default: {
    resolve: () => ({
      get: httpGet,
      post: httpPost,
      put: httpPut,
      patch: httpPatch,
      delete: httpDelete,
    }),
  },
}));

describe("AIAssistantPage smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    httpGet.mockResolvedValue({ data: [] });
    httpPost.mockResolvedValue({ success: true });
    httpPut.mockResolvedValue({ success: true });
    httpPatch.mockResolvedValue({ success: true });
    httpDelete.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders settings and loads dashboard context", async () => {
    render(<AIAssistantPage />);

    expect(screen.getByText("LOLI AI Assistant")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open AI settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open AI memory" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Toggle Agent Mode" })).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByLabelText("APIfree.ai API key")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open AI settings" }));

    expect(screen.getByLabelText("APIfree.ai API key")).toBeInTheDocument();
    expect(screen.getByLabelText("Model")).toHaveValue("deepseek-ai/deepseek-v3.2");
    expect(screen.getByRole("button", { name: "Save AI settings" })).toBeDisabled();
    expect(screen.getByText("API key not saved")).toBeInTheDocument();
    await waitFor(() => {
      expect(httpGet).toHaveBeenCalled();
    });
  });

  it("loads context for every dashboard feature surface", async () => {
    render(<AIAssistantPage />);

    await waitFor(() => {
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.KBZPAY_REGISTERED_ACCOUNTS);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.KBZPAY_VERIFICATION_REQUESTED);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.KBZPAY_MONEY_CHECK);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.KBZPAY_VERIFIED_USERS);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.AWAITING_INSTRUCTION);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.PENDING);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.BASE);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_SUGGESTIONS.BASE);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_NOTIFICATIONS.LIST);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.BASE);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.BASE);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BASE);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.BASE);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_ADMIN_ROLES.PERMISSIONS);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.DASHBOARD_CATEGORIES.BASE);
      expect(httpGet).toHaveBeenCalledWith(API_ENDPOINTS.USERS.GET_LIST, { params: { take: 10, skip: 0 } });
    });
  });

  it("opens the memory layer from the brain icon", async () => {
    render(<AIAssistantPage />);

    await userEvent.click(screen.getByRole("button", { name: "Open AI memory" }));

    const memoryDialog = screen.getByRole("dialog", { name: "Assistant memory" });
    expect(memoryDialog).toBeInTheDocument();
    expect(screen.getByText("Memory Layer")).toBeInTheDocument();
    expect(within(memoryDialog).getByText("Facts")).toBeInTheDocument();
    expect(within(memoryDialog).getByText("No facts saved yet.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Assistant memory" })).not.toBeInTheDocument();
  });

  it("saves API settings in localStorage", async () => {
    render(<AIAssistantPage />);

    await userEvent.click(screen.getByRole("button", { name: "Open AI settings" }));
    await userEvent.type(screen.getByLabelText("APIfree.ai API key"), "test-key");
    await userEvent.clear(screen.getByLabelText("Model"));
    await userEvent.type(screen.getByLabelText("Model"), "test-model");

    expect(localStorage.getItem("flex-ai-assistant-settings")).toBeNull();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save AI settings" }));

    const stored = JSON.parse(localStorage.getItem("flex-ai-assistant-settings") || "{}");
    expect(stored).toEqual({
      apiKey: "test-key",
      model: "test-model",
      agentMode: false,
    });
    expect(screen.queryByRole("dialog", { name: "Assistant settings" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("switch", { name: "Toggle Agent Mode" }));
    expect(screen.getByRole("switch", { name: "Toggle Agent Mode" })).toHaveAttribute("aria-checked", "true");
    expect(JSON.parse(localStorage.getItem("flex-ai-assistant-settings") || "{}").agentMode).toBe(true);
  });

  it("auto-executes returned tool actions in Agent Mode", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                "Approving this withdrawal now.\n\n```json\n{\"action\":\"approve_withdrawal\",\"params\":{\"withdrawalId\":\"wd-1\",\"adminNote\":\"Approved by AI\"}}\n```",
            },
          },
        ],
      }),
    } as Response);

    render(<AIAssistantPage />);

    await userEvent.click(screen.getByRole("button", { name: "Open AI settings" }));
    await userEvent.type(screen.getByLabelText("APIfree.ai API key"), "test-key");
    await userEvent.click(screen.getByRole("button", { name: "Save AI settings" }));
    await userEvent.click(screen.getByRole("switch", { name: "Toggle Agent Mode" }));
    await userEvent.type(screen.getByPlaceholderText("Ask the assistant, or request an action with Agent Mode enabled..."), "Approve wd-1");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(httpPost).toHaveBeenCalledWith(
        API_ENDPOINTS.DASHBOARD_WITHDRAWALS.APPROVE("wd-1"),
        { adminNote: "Approved by AI" }
      );
    });
    expect(await screen.findByText("Done")).toBeInTheDocument();
    expect(screen.queryByText("Confirm action")).not.toBeInTheDocument();
  });
});
