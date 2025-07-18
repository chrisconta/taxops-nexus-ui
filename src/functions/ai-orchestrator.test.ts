import { extractJson } from "../../supabase/functions/ai-orchestrator/index";

describe("extractJson", () => {
  it("parses JSON wrapped in a code block", () => {
    const ds = "```json\n{\"tool\":\"t\",\"reply\":\"hi\"}\n```";
    expect(
      extractJson<{ tool: string; reply: string }>(ds)
    ).toEqual({ tool: "t", reply: "hi" });
  });
});
