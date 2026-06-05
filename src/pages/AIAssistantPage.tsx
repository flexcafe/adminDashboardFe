import { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import loliLogo from "@/assets/loli-logo.png";
import {
  buildSnapshotContext,
  loadDashboardSnapshot,
  type DashboardSnapshot,
} from "@/features/aiAssistant/dashboardSnapshot";
import {
  loadAssistantSettings,
  type AssistantMemory,
  type AssistantSettings,
} from "@/features/aiAssistant/aiAssistantStorage";
import { useAIAssistant } from "@/features/aiAssistant/useAIAssistant";

const getSessionTitle = (message: string) => {
  const title = message.trim().replace(/\s+/g, " ").slice(0, 42);
  return title || "New chat";
};

const getRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const formatActionExecutionMessage = (actionLabel: string, result: unknown) => {
  const record = getRecord(result);
  const data = getRecord(record?.data);
  const message = typeof record?.message === "string" ? record.message : null;
  const status = record?.success === false ? "Failed" : "Completed";
  const reference =
    (typeof data?._id === "string" && data._id) ||
    (typeof data?.id === "string" && data.id) ||
    (typeof data?.transactionId === "string" && data.transactionId) ||
    null;

  return [
    "✅ **Done**",
    "",
    `**Action:** ${actionLabel}`,
    `**Status:** ${status}`,
    message ? `**Update:** ${message}` : null,
    reference ? `**Reference:** \`${reference}\`` : null,
  ]
    .filter(Boolean)
    .join("\n");
};

void getSessionTitle;
void formatActionExecutionMessage;

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 3 14h8l-1 8 10-12h-8z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.3A3.2 3.2 0 0 0 4.5 14a3.5 3.5 0 0 0 4 5.5" />
      <path d="M14.5 4.5A3.5 3.5 0 0 1 18 8v.3A3.2 3.2 0 0 1 19.5 14a3.5 3.5 0 0 1-4 5.5" />
      <path d="M9.5 4.5v15M14.5 4.5v15" />
      <path d="M9.5 9H7.8M14.5 9h1.7M9.5 14H7.6M14.5 14h1.9" />
      <path d="M12 7.5v9" />
    </svg>
  );
}

function AssistantMessageContent({ content, role }: { content: string; role: "assistant" | "user" }) {
  if (role === "user") {
    return <p>{content}</p>;
  }

  return (
    <div className="aiAssistantMarkdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="aiAssistantMarkdownTable">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function MemoryRecordList({ memory, compact = false }: { memory: AssistantMemory; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const groups = [
    {
      key: "facts",
      title: t("aiAssistantPage.memoryFacts"),
      description: t("aiAssistantPage.memoryFactsDescription"),
      empty: t("aiAssistantPage.memoryFactsEmpty"),
      items: memory.facts,
    },
    {
      key: "preferences",
      title: t("aiAssistantPage.memoryPreferences"),
      description: t("aiAssistantPage.memoryPreferencesDescription"),
      empty: t("aiAssistantPage.memoryPreferencesEmpty"),
      items: memory.preferences,
    },
  ];
  const hasRecords = groups.some((group) => group.items.length > 0);

  return (
    <div className={compact ? "aiAssistantMemoryRecords compact" : "aiAssistantMemoryRecords"}>
      <div className="aiAssistantMemorySummary">
        <span>{memory.facts.length + memory.preferences.length}</span>
        <div>
          <strong>{hasRecords ? t("aiAssistantPage.memorySavedRecords") : t("aiAssistantPage.memoryNoSavedRecords")}</strong>
          <small>
            {hasRecords
              ? t("aiAssistantPage.memoryLastUpdated", {
                  time: new Date(memory.updatedAt).toLocaleString(i18n.language, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })
              : t("aiAssistantPage.memoryAskToRemember")}
          </small>
        </div>
      </div>

      {groups.map((group, groupIndex) => (
        <section
          key={group.key}
          className="aiAssistantMemoryGroup"
          style={{ ["--memory-delay" as string]: `${groupIndex * 80}ms` }}
        >
          <div className="aiAssistantMemoryGroupHead">
            <div>
              <h3>{group.title}</h3>
              {!compact ? <p>{group.description}</p> : null}
            </div>
            <span>{group.items.length}</span>
          </div>

          <div className="aiAssistantMemoryRecordList">
            {group.items.length ? (
              group.items.map((item, itemIndex) => (
                <article
                  key={`${group.key}-${item}`}
                  className="aiAssistantMemoryRecord"
                  style={{ ["--memory-delay" as string]: `${groupIndex * 80 + itemIndex * 55}ms` }}
                >
                  <span className="aiAssistantMemoryRecordMark" aria-hidden="true" />
                  <p>{item}</p>
                </article>
              ))
            ) : (
              <div className="aiAssistantMemoryEmpty">{group.empty}</div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

export function AIAssistantPage() {
  const { t } = useTranslation();
  const httpClient = container.resolve<HttpClient>("httpClient");
  const {
    activeSession,
    sessions,
    memory,
    savedSettings,
    isLoading,
    setActiveSessionId,
    createSession,
    deleteSession,
    clearMemory,
    saveSettings: persistSettings,
    toggleAgentMode,
    submitMessage: submitAssistantMessage,
  } = useAIAssistant();
  const [settingsDraft, setSettingsDraft] = useState<AssistantSettings>(() => loadAssistantSettings());
  const [input, setInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [, setStatusMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const getDisplaySessionTitle = useCallback(
    (title?: string) => (!title || title === "New chat" ? t("aiAssistantPage.newChatTitle") : title),
    [t]
  );

  useEffect(() => {
    setSettingsDraft(savedSettings);
  }, [savedSettings]);

  useEffect(() => {
    const messagesElement = messagesRef.current;
    if (!messagesElement) return;
    if (typeof messagesElement.scrollTo === "function") {
      messagesElement.scrollTo({
        top: messagesElement.scrollHeight,
        behavior: "smooth",
      });
      return;
    }
    messagesElement.scrollTop = messagesElement.scrollHeight;
  }, [activeSession?.id, activeSession?.messages.length, isLoading]);

  const hasUnsavedSettings = useMemo(
    () =>
      savedSettings.apiKey !== settingsDraft.apiKey ||
      savedSettings.model !== settingsDraft.model,
    [savedSettings, settingsDraft]
  );

  const loadSnapshot = useCallback(async () => {
    setPageError(null);
    try {
      const nextSnapshot = await loadDashboardSnapshot(httpClient, "/ai-assistant", "full");
      setSnapshot(nextSnapshot);
      setStatusMessage(t("aiAssistantPage.contextRefreshed"));
      return nextSnapshot;
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("aiAssistantPage.contextRefreshError"));
      return null;
    }
  }, [httpClient, t]);

  const refreshSnapshot = useCallback(async () => {
    await loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  const saveSettings = () => {
    const nextSettings: AssistantSettings = {
      apiKey: settingsDraft.apiKey.trim(),
      model: settingsDraft.model.trim() || savedSettings.model,
      agentMode: savedSettings.agentMode,
    };
    persistSettings(nextSettings);
    setSettingsDraft(nextSettings);
    setPageError(null);
    setStatusMessage(t("aiAssistantPage.settingsSaved"));
    setIsSettingsOpen(false);
  };

  const submitMessage = async (event: SyntheticEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !activeSession || isLoading) return;

    setInput("");
    setPageError(null);
    setStatusMessage(null);

    try {
      const nextSnapshot = (await loadSnapshot()) ?? snapshot;
      await submitAssistantMessage({
        content: trimmed,
        dashboardContext: buildSnapshotContext(nextSnapshot),
        onActionComplete: refreshSnapshot,
        refreshDashboardContext: async () => buildSnapshotContext((await loadSnapshot()) ?? nextSnapshot),
        sessionId: activeSession.id,
      });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("aiAssistantPage.aiRequestFailed"));
    }
  };

  return (
    <section className="page aiAssistantPage">
      <div className="pageHeader aiAssistantHeader">
        <div>
          <p className="pageEyebrow">{t("aiAssistantPage.eyebrow")}</p>
          <h1 className="pageTitle">{t("aiAssistantPage.title")}</h1>
          <p className="pageDescription">{t("aiAssistantPage.description")}</p>
        </div>
        <div className="aiAssistantHeaderActions">
          <button className="rewardsBtn secondary" type="button" onClick={() => void refreshSnapshot()}>
            {t("aiAssistantPage.refreshContext")}
          </button>
          <button
            className="aiAssistantSettingsTrigger"
            type="button"
            aria-label={t("aiAssistantPage.openSettings")}
            aria-expanded={isSettingsOpen}
            onClick={() => setIsSettingsOpen(true)}
          >
            <SettingsIcon />
          </button>
          <button
            className="aiAssistantSettingsTrigger"
            type="button"
            aria-label={t("aiAssistantPage.openMemory")}
            aria-expanded={isMemoryOpen}
            onClick={() => setIsMemoryOpen(true)}
          >
            <BrainIcon />
          </button>
        </div>
      </div>

      {pageError ? <p className="authError surfaceMessage">{pageError}</p> : null}
      {isSettingsOpen ? (
        <div className="aiAssistantSettingsOverlay" role="presentation" onClick={() => setIsSettingsOpen(false)}>
          <aside
            className="card aiAssistantSettingsPanel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="aiAssistantSettingsPanelHead">
              <div>
                <p className="pageEyebrow">{t("aiAssistantPage.settingsEyebrow")}</p>
                <h2 id="ai-settings-title" className="sectionTitle">{t("aiAssistantPage.settingsTitle")}</h2>
                <p className="sectionDescription">{t("aiAssistantPage.settingsDescription")}</p>
              </div>
              <button className="rewardsBtn secondary" type="button" onClick={() => setIsSettingsOpen(false)}>
                {t("common.close", { defaultValue: "Close" })}
              </button>
            </div>
            <div className="aiAssistantSettings">
              <label className="authLabel" htmlFor="ai-api-key">{t("aiAssistantPage.apiKeyLabel")}</label>
              <div className="aiAssistantKeyRow">
                <input
                  id="ai-api-key"
                  className="authInput"
                  type={showApiKey ? "text" : "password"}
                  value={settingsDraft.apiKey}
                  placeholder="sk-..."
                  onChange={(event) => setSettingsDraft((prev) => ({ ...prev, apiKey: event.target.value }))}
                />
                <button className="rewardsBtn secondary" type="button" onClick={() => setShowApiKey((prev) => !prev)}>
                  {showApiKey ? t("aiAssistantPage.hide") : t("aiAssistantPage.show")}
                </button>
              </div>

              <label className="authLabel" htmlFor="ai-model">{t("aiAssistantPage.modelLabel")}</label>
              <input
                id="ai-model"
                className="authInput"
                value={settingsDraft.model}
                onChange={(event) => setSettingsDraft((prev) => ({ ...prev, model: event.target.value }))}
              />

              <div className="aiAssistantSettingsActions">
                <button
                  className="rewardsBtn primary"
                  type="button"
                  onClick={saveSettings}
                  disabled={!hasUnsavedSettings}
                >
                  {t("aiAssistantPage.saveSettings")}
                </button>
                <span className={hasUnsavedSettings ? "aiAssistantSaveState unsaved" : "aiAssistantSaveState"}>
                  {hasUnsavedSettings
                    ? t("aiAssistantPage.unsavedChanges")
                    : savedSettings.apiKey
                      ? t("aiAssistantPage.apiKeySaved")
                      : t("aiAssistantPage.apiKeyNotSaved")}
                </span>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {isMemoryOpen ? (
        <div className="aiAssistantSettingsOverlay" role="presentation" onClick={() => setIsMemoryOpen(false)}>
          <aside
            className="card aiAssistantSettingsPanel aiAssistantMemoryPanel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-memory-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="aiAssistantSettingsPanelHead">
              <div>
                <p className="pageEyebrow">{t("aiAssistantPage.memoryEyebrow")}</p>
                <h2 id="ai-memory-title" className="sectionTitle">{t("aiAssistantPage.memoryTitle")}</h2>
                <p className="sectionDescription">{t("aiAssistantPage.memoryDescription")}</p>
              </div>
              <button className="rewardsBtn secondary" type="button" onClick={() => setIsMemoryOpen(false)}>
                {t("common.close", { defaultValue: "Close" })}
              </button>
            </div>
            <div className="aiAssistantMemory">
              <p className="sectionDescription">{t("aiAssistantPage.memoryInstruction")}</p>
              <MemoryRecordList memory={memory} />
              <button
                className="rewardsBtn danger subtle"
                type="button"
                onClick={clearMemory}
              >
                {t("aiAssistantPage.clearMemory")}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="aiAssistantLayout">
        <aside className="card aiAssistantSide">
          <div className="aiAssistantSessionsHead">
            <h2 className="sectionTitle">{t("aiAssistantPage.chats")}</h2>
            <button className="rewardsBtn primary" type="button" onClick={createSession}>{t("aiAssistantPage.newChat")}</button>
          </div>
          <div className="aiAssistantSessionList">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                className={session.id === activeSession?.id ? "aiAssistantSession active" : "aiAssistantSession"}
                onClick={() => {
                  setActiveSessionId(session.id);
                }}
              >
                <span>{getDisplaySessionTitle(session.title)}</span>
                <small>{new Date(session.updatedAt).toLocaleDateString()}</small>
                <span
                  role="button"
                  tabIndex={0}
                  className="aiAssistantDelete"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteSession(session.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      deleteSession(session.id);
                    }
                  }}
                >
                  {t("aiAssistantPage.deleteChat")}
                </span>
              </button>
            ))}
          </div>

          <div className="aiAssistantMemory">
            <h2 className="sectionTitle">{t("aiAssistantPage.memoryShortTitle")}</h2>
            <p className="sectionDescription">{t("aiAssistantPage.memoryShortInstruction")}</p>
            <MemoryRecordList memory={memory} compact />
            <button
              className="rewardsBtn danger subtle"
              type="button"
              onClick={clearMemory}
            >
              {t("aiAssistantPage.clearMemory")}
            </button>
          </div>
        </aside>

        <div className="card aiAssistantChat">
          <div className="aiAssistantChatTop">
            <div className="aiAssistantAvatar">
              <img src={loliLogo} alt="LOLI AI logo" />
            </div>
            <div>
              <h2 className="sectionTitle">{getDisplaySessionTitle(activeSession?.title)}</h2>
              <p className="sectionDescription">
                {snapshot ? t("aiAssistantPage.contextReady") : t("aiAssistantPage.contextNotLoaded")}
              </p>
            </div>
            <button
              className={savedSettings.agentMode ? "aiAssistantAgentToggle active" : "aiAssistantAgentToggle"}
              type="button"
              role="switch"
              aria-checked={savedSettings.agentMode}
              aria-label={t("aiAssistantPage.agentModeToggleLabel")}
              onClick={toggleAgentMode}
            >
              <SparkIcon />
              <span>{t("aiAssistantPage.agentModeShort")}</span>
              <strong>{savedSettings.agentMode ? t("aiAssistantPage.agentModeOn") : t("aiAssistantPage.agentModeOff")}</strong>
            </button>
          </div>

          <div className="aiAssistantMessages" ref={messagesRef}>
            {activeSession?.messages.length ? (
              activeSession.messages.map((message) => (
                <article key={message.id} className={`aiAssistantMessage ${message.role}`}>
                  <div className="aiAssistantMessageMeta">
                    {message.role === "user" ? t("aiAssistantPage.you") : "LOLI"}
                    <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <AssistantMessageContent content={message.content} role={message.role} />
                </article>
              ))
            ) : (
              <div className="aiAssistantEmpty">
                {t("aiAssistantPage.emptyPrompt")}
              </div>
            )}
            {isLoading ? <div className="aiAssistantTyping">{t("aiAssistantPage.thinking")}</div> : null}
          </div>

          <form className="aiAssistantComposer" onSubmit={(event) => void submitMessage(event)}>
            <textarea
              className="authInput"
              value={input}
              placeholder={t("aiAssistantPage.inputPlaceholder")}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitMessage(event);
                }
              }}
            />
            <button
              className="rewardsBtn primary"
              type="button"
              onClick={(event) => void submitMessage(event)}
              disabled={isLoading || !input.trim()}
            >
              {t("aiAssistantPage.send")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
