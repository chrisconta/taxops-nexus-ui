import { extractJson, appendMessage } from "../../supabase/functions/ai-orchestrator/index";

describe("extractJson", () => {
  it("parses JSON wrapped in a code block", () => {
    const ds = "```json\n{\"tool\":\"t\",\"reply\":\"hi\"}\n```";
    expect(
      extractJson<{ tool: string; reply: string }>(ds)
    ).toEqual({ tool: "t", reply: "hi" });
  });
});

describe("appendMessage", () => {
  it("keeps only the last N messages", () => {
    const state = { messages: [] as Array<{ role: string; content: string }> };
    for (let i = 0; i < 12; i++) {
      appendMessage(state, { role: "user", content: String(i) }, 5);
    }
    expect(state.messages.length).toBe(5);
    expect(state.messages[0].content).toBe("7");
    expect(state.messages[4].content).toBe("11");
  });
});
