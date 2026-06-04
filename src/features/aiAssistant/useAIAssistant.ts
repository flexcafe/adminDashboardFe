import { useContext } from "react";
import { AIAssistantContext } from "@/features/aiAssistant/AIAssistantShared";

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error("useAIAssistant must be used within AIAssistantProvider.");
  }
  return context;
}
