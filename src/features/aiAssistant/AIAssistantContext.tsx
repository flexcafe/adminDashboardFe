import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import {
  buildRecoveryInstruction,
  callAssistantCompletion,
  describeAction,
  executeAssistantAction,
  hasWriteConfirmationPhrase,
  isWriteAction,
  isRecoverableActionError,
  WRITE_CONFIRMATION_PHRASES,
} from "@/features/aiAssistant/aiAssistantApi";
import {
  createAssistantMessage,
  createAssistantSession,
  DEFAULT_ASSISTANT_MODEL,
  loadActiveSessionId,
  loadAssistantMemory,
  loadAssistantSessions,
  loadAssistantSettings,
  saveActiveSessionId,
  saveAssistantMemory,
  saveAssistantSessions,
  saveAssistantSettings,
  summarizeMemory,
  updateMemoryFromMessage,
  type AssistantMemory,
  type AssistantSession,
  type AssistantSettings,
} from "@/features/aiAssistant/aiAssistantStorage";
import {
  AIAssistantContext,
  type AIAssistantContextValue,
  type SubmitAssistantMessageArgs,
} from "@/features/aiAssistant/AIAssistantShared";

const getSessionTitle = (message: string) => {
  const title = message.trim().replace(/\s+/g, " ").slice(0, 42);
  return title || "New chat";
};

const getRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const UUID_PATTERN = /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi;

const sanitizeActionText = (text: string) =>
  text
    .replace(UUID_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const sanitizeUpdateMessage = (message: string) =>
  sanitizeActionText(message)
    .replace(/\breference\b[:\s-]*/i, "")
    .replace(/\bid\b[:\s-]*/i, "")
    .trim();

const toRecordArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          !!entry && typeof entry === "object" && !Array.isArray(entry)
      )
    : [];

const getActionResultPayload = (result: unknown): unknown => {
  const record = getRecord(result);
  if (!record) return result;

  if (record.data !== undefined) return record.data;
  return result;
};

const extractListItems = (result: unknown): Record<string, unknown>[] => {
  const payload = getActionResultPayload(result);

  if (Array.isArray(payload)) {
    return toRecordArray(payload);
  }

  const payloadRecord = getRecord(payload);
  if (!payloadRecord) return [];

  if (Array.isArray(payloadRecord.items)) {
    return toRecordArray(payloadRecord.items);
  }

  if (Array.isArray(payloadRecord.rows)) {
    return toRecordArray(payloadRecord.rows);
  }

  if (Array.isArray(payloadRecord.permissions)) {
    return toRecordArray(payloadRecord.permissions);
  }

  return [];
};

const humanizeResourceName = (resource: string) =>
  resource.replace(/_/g, " ");

const formatListEntryLabel = (item: Record<string, unknown>) => {
  const candidates = [
    item.name,
    item.nickname,
    item.title,
    item.email,
    item.label,
    item.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
};

const formatReadableListSummary = (resource: string, result: unknown) => {
  const items = extractListItems(result);
  const count = items.length;

  if (resource === "admin_roles") {
    const roleNames = items
      .map((item) => formatListEntryLabel(item))
      .filter((value): value is string => !!value);

    if (roleNames.length === 0) {
      return "I loaded the admin roles, but the response did not include readable role names.";
    }

    return `There ${roleNames.length === 1 ? "is" : "are"} ${roleNames.length} admin ${roleNames.length === 1 ? "role" : "roles"}: ${roleNames.join(", ")}.`;
  }

  if (resource === "admin_permissions") {
    const payload = getActionResultPayload(result);
    const payloadRecord = getRecord(payload);
    const permissions = Array.isArray(payloadRecord?.permissions)
      ? payloadRecord.permissions.filter(
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
        )
      : [];

    if (permissions.length === 0) {
      return "I loaded the admin permissions list, but there were no readable permission values in the response.";
    }

    return `There ${permissions.length === 1 ? "is" : "are"} ${permissions.length} admin permission ${permissions.length === 1 ? "key" : "keys"} available.`;
  }

  if (count === 0) {
    return `I loaded ${humanizeResourceName(resource)}, but there were no records in the response.`;
  }

  const preview = items
    .map((item) => formatListEntryLabel(item))
    .filter((value): value is string => !!value)
    .slice(0, 5);

  if (preview.length > 0) {
    const extraCount = count - preview.length;
    return `I found ${count} ${humanizeResourceName(resource)} record${count === 1 ? "" : "s"}. ${preview.join(", ")}${extraCount > 0 ? `, and ${extraCount} more.` : "."}`;
  }

  return `I found ${count} ${humanizeResourceName(resource)} record${count === 1 ? "" : "s"}.`;
};

const formatReadableAssistantResult = (
  action: Parameters<typeof executeAssistantAction>[1],
  result: unknown
) => {
  if (action.type === "list") {
    return formatReadableListSummary(action.resource, result);
  }

  const record = getRecord(result);
  const payload = getRecord(record?.data);
  const message = typeof record?.message === "string" ? sanitizeUpdateMessage(record.message) : "";

  switch (action.type) {
    case "confirm_fraud_report":
      return "The fraud report is now confirmed.";
    case "dismiss_fraud_report":
      return "The fraud report is now dismissed.";
    case "ban_user":
      return "The selected user is now banned.";
    case "unban_user":
      return "The selected user ban has been removed.";
    case "reward_suggestion":
      return `The suggestion was rewarded with ${action.points} points.`;
    case "dismiss_suggestion":
      return "The suggestion was dismissed.";
    case "approve_withdrawal":
      return "The withdrawal request is now approved.";
    case "reject_withdrawal":
      return "The withdrawal request is now rejected.";
    case "mark_withdrawal_paid":
      return "The withdrawal is now marked as paid.";
    case "send_kbz_instruction":
      return "KBZPay transfer instructions were sent to the selected user.";
    case "verify_kbz_user":
      return "The KBZPay user is now verified.";
    case "send_safe_payment_instruction":
      return "Safe payment instructions were sent.";
    case "mark_safe_payment_received":
      return "The safe payment transaction is now marked as received.";
    case "mark_safe_payment_transferred":
      return "The safe payment transaction is now marked as transferred.";
    case "approve_facebook_follow":
      return "The Facebook follow submission is now approved.";
    case "reject_facebook_follow":
      return "The Facebook follow submission is now rejected.";
    case "update_star_config":
      return `I updated ${action.configs.length} star reward configuration row${action.configs.length === 1 ? "" : "s"}.`;
    case "update_rank_config":
      return `I updated ${action.configs.length} rank configuration row${action.configs.length === 1 ? "" : "s"}.`;
    case "update_slider_ad":
      return "The slider ad was updated.";
    case "delete_slider_ad":
      return "The slider ad was deleted.";
    case "create_admin_role":
      return `The admin role ${action.name} was created.`;
    case "update_admin_role":
      return "The admin role was updated.";
    case "delete_admin_role":
      return "The admin role was deleted.";
    case "create_category":
      return `The category ${action.name} was created.`;
    case "update_category":
      return "The category was updated.";
    case "deactivate_category":
      return "The category was deactivated.";
    case "move_category":
      return "The category position was updated.";
    case "generic_api":
      return message || "The requested admin action completed successfully.";
  }

  if (typeof payload?.status === "string") {
    return `Done. Current status is ${payload.status.replace(/_/g, " ").toLowerCase()}.`;
  }

  return message || "The requested admin action completed successfully.";
};

const formatWriteConfirmationRequiredMessage = (actionLabel: string) => {
  const quotedPhrases = WRITE_CONFIRMATION_PHRASES.map((phrase) => `"${phrase}"`).join(", ");

  return [
    "**Write action not executed.**",
    "",
    `LOLI AI prepared this change: ${sanitizeActionText(actionLabel)}.`,
    `To allow writes, resend the request with one of these exact phrases: ${quotedPhrases}.`,
  ].join("\n");
};

const ensureSessions = (sessions: AssistantSession[]) =>
  sessions.length > 0 ? sessions : [createAssistantSession()];

export function AIAssistantProvider({ children }: PropsWithChildren) {
  const httpClient = useMemo(() => container.resolve<HttpClient>("httpClient"), []);
  const [savedSettings, setSavedSettings] = useState<AssistantSettings>(() => loadAssistantSettings());
  const [memory, setMemory] = useState<AssistantMemory>(() => loadAssistantMemory());
  const [sessions, setSessions] = useState<AssistantSession[]>(() => ensureSessions(loadAssistantSessions()));
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const loadedSessions = ensureSessions(loadAssistantSessions());
    return loadActiveSessionId() || loadedSessions[0]?.id || "";
  });
  const [isLoading, setIsLoading] = useState(false);

  const sessionsRef = useRef(sessions);
  const activeSessionIdRef = useRef(activeSessionId);
  const savedSettingsRef = useRef(savedSettings);
  const memoryRef = useRef(memory);
  const isLoadingRef = useRef(isLoading);

  useEffect(() => {
    sessionsRef.current = sessions;
    saveAssistantSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
    if (activeSessionId) {
      saveActiveSessionId(activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    savedSettingsRef.current = savedSettings;
    saveAssistantSettings(savedSettings);
  }, [savedSettings]);

  useEffect(() => {
    memoryRef.current = memory;
    saveAssistantMemory(memory);
  }, [memory]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (!sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessions[0]?.id || "");
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (!event.key || !event.key.startsWith("flex-ai-assistant-")) return;
      setSavedSettings(loadAssistantSettings());
      setMemory(loadAssistantMemory());
      const nextSessions = ensureSessions(loadAssistantSessions());
      setSessions(nextSessions);
      setActiveSessionId(loadActiveSessionId() || nextSessions[0]?.id || "");
    };

    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions]
  );

  const appendMessageToSession = useCallback((sessionId: string, content: string, role: "assistant" | "user") => {
    const nextMessage = createAssistantMessage(role, content);
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, nextMessage],
              updatedAt: new Date().toISOString(),
            }
          : session
      )
    );
  }, []);

  const createSession = useCallback(() => {
    const session = createAssistantSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    return session;
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    let nextActiveSessionId = "";

    setSessions((prev) => {
      const filtered = prev.filter((session) => session.id !== sessionId);
      const nextSessions = ensureSessions(filtered);
      nextActiveSessionId =
        activeSessionIdRef.current === sessionId
          ? nextSessions[0]?.id || ""
          : activeSessionIdRef.current;
      return nextSessions;
    });

    setActiveSessionId(nextActiveSessionId);
  }, []);

  const clearMemory = useCallback(() => {
    setMemory({
      facts: [],
      preferences: [],
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const saveSettings = useCallback((settings: AssistantSettings) => {
    setSavedSettings({
      apiKey: settings.apiKey.trim(),
      model: settings.model.trim() || DEFAULT_ASSISTANT_MODEL,
      agentMode: settings.agentMode,
    });
  }, []);

  const toggleAgentMode = useCallback(() => {
    setSavedSettings((prev) => ({
      ...prev,
      agentMode: !prev.agentMode,
    }));
  }, []);

  const submitMessage = useCallback(async ({
    content,
    dashboardContext,
    onActionComplete,
    refreshDashboardContext,
    sessionId,
  }: SubmitAssistantMessageArgs) => {
    const trimmed = content.trim();
    if (!trimmed || isLoadingRef.current) return;

    const currentSettings = savedSettingsRef.current;
    if (!currentSettings.apiKey.trim()) {
      throw new Error("API key is required.");
    }

    const currentSessions = sessionsRef.current;
    const fallbackSession = currentSessions[0] ?? createSession();
    const targetSession =
      currentSessions.find((session) => session.id === (sessionId || activeSessionIdRef.current)) ?? fallbackSession;

    const userMessage = createAssistantMessage("user", trimmed);
    const nextMemory = updateMemoryFromMessage(memoryRef.current, trimmed);
    const conversation = [...targetSession.messages, userMessage];

    setMemory(nextMemory);
    setActiveSessionId(targetSession.id);
    setIsLoading(true);
    setSessions((prev) =>
      prev.map((session) =>
        session.id === targetSession.id
          ? {
              ...session,
              title: session.messages.length === 0 ? getSessionTitle(trimmed) : session.title,
              messages: [...session.messages, userMessage],
              updatedAt: new Date().toISOString(),
            }
          : session
      )
    );

    try {
      const result = await callAssistantCompletion({
        apiKey: currentSettings.apiKey.trim(),
        model: currentSettings.model.trim(),
        messages: conversation,
        dashboardContext,
        memorySummary: summarizeMemory(nextMemory),
        agentMode: currentSettings.agentMode,
      });

      appendMessageToSession(
        targetSession.id,
        result.content || "I prepared an answer.",
        "assistant"
      );

      if (result.action) {
        if (isWriteAction(result.action) && !hasWriteConfirmationPhrase(trimmed)) {
          appendMessageToSession(
            targetSession.id,
            formatWriteConfirmationRequiredMessage(describeAction(result.action)),
            "assistant"
          );
          return;
        }

        try {
          const actionResult = await executeAssistantAction(httpClient, result.action);
          appendMessageToSession(
            targetSession.id,
            formatReadableAssistantResult(result.action, actionResult),
            "assistant"
          );
          if (onActionComplete) {
            await onActionComplete();
          }
        } catch (actionError) {
          if (!refreshDashboardContext || !isRecoverableActionError(actionError)) {
            throw actionError;
          }

          appendMessageToSession(
            targetSession.id,
            "I hit a contract error. Refreshing live context and retrying with corrected parameters.",
            "assistant"
          );

          const refreshedDashboardContext = await refreshDashboardContext();
          const retryResult = await callAssistantCompletion({
            apiKey: currentSettings.apiKey.trim(),
            model: currentSettings.model.trim(),
            messages: [
              ...conversation,
              createAssistantMessage("assistant", result.content || "I prepared an answer."),
              createAssistantMessage("user", buildRecoveryInstruction(actionError)),
            ],
            dashboardContext: refreshedDashboardContext,
            memorySummary: summarizeMemory(nextMemory),
            agentMode: currentSettings.agentMode,
          });

          appendMessageToSession(
            targetSession.id,
            retryResult.content || "I prepared a corrected action.",
            "assistant"
          );

          if (!retryResult.action) {
            throw actionError;
          }

          const retryActionResult = await executeAssistantAction(httpClient, retryResult.action);
          appendMessageToSession(
            targetSession.id,
            formatReadableAssistantResult(retryResult.action, retryActionResult),
            "assistant"
          );
          if (onActionComplete) {
            await onActionComplete();
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI request failed.";
      appendMessageToSession(targetSession.id, `Error: ${message}`, "assistant");
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [appendMessageToSession, createSession, httpClient]);

  const value = useMemo<AIAssistantContextValue>(() => ({
    activeSession,
    activeSessionId,
    sessions,
    memory,
    savedSettings,
    isLoading,
    setActiveSessionId,
    createSession,
    deleteSession,
    clearMemory,
    saveSettings,
    toggleAgentMode,
    submitMessage,
  }), [
    activeSession,
    activeSessionId,
    sessions,
    memory,
    savedSettings,
    isLoading,
    createSession,
    deleteSession,
    clearMemory,
    saveSettings,
    toggleAgentMode,
    submitMessage,
  ]);

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
    </AIAssistantContext.Provider>
  );
}
