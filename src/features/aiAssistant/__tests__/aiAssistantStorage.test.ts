import { beforeEach, describe, expect, it } from "vitest";
import { loadAssistantSettings, saveAssistantSettings } from "../aiAssistantStorage";

describe("aiAssistantStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migrates the old APIFree default model to the verified chat model", () => {
    saveAssistantSettings({
      apiKey: "test-key",
      model: "gpt-4o-mini",
      agentMode: true,
    });

    expect(loadAssistantSettings()).toEqual({
      apiKey: "test-key",
      model: "deepseek-ai/deepseek-v3.2",
      agentMode: true,
    });
  });
});
