import { useMutation } from "@tanstack/react-query";
import { executeTool } from "@/api/agent";

export function useExecuteTool() {
  return useMutation({
    mutationFn: executeTool,
    onError: (err: any) => {
      console.error("Tool execution error:", err);
      // Optionally show a toast/notification here
    },
  });
}