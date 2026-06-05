import { createContext } from "react";
import type {
  AssistantMemory,
  AssistantSession,
  AssistantSettings,
} from "@/features/aiAssistant/aiAssistantStorage";

export type SubmitAssistantMessageArgs = {
  content: string;
  dashboardContext: string;
  onActionComplete?: () => Promise<void> | void;
  refreshDashboardContext?: () => Promise<string>;
  sessionId?: string;
};

export type AIAssistantContextValue = {
  activeSession: AssistantSession | undefined;
  activeSessionId: string;
  sessions: AssistantSession[];
  memory: AssistantMemory;
  savedSettings: AssistantSettings;
  isLoading: boolean;
  setActiveSessionId: (sessionId: string) => void;
  createSession: () => AssistantSession;
  deleteSession: (sessionId: string) => void;
  clearMemory: () => void;
  saveSettings: (settings: AssistantSettings) => void;
  toggleAgentMode: () => void;
  submitMessage: (args: SubmitAssistantMessageArgs) => Promise<void>;
};

export const AIAssistantContext = createContext<AIAssistantContextValue | null>(null);
