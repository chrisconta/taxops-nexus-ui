// src/agent/tools/index.ts

export interface RegisterClientParams {
  name: string;
  email: string;
  ein: string;
}

export const registerClientSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    email: { type: "string", format: "email" },
    ein: { type: "string", pattern: "^\\d{2}-?\\d{7}$" },
  },
  required: ["name", "email", "ein"],
  additionalProperties: false,
} as const;

export interface CreateConnectionParams {
  clientId: string;
  connectionType: "bank" | "erp" | "manual";
  credentials: Record<string, string>;
}

export const createConnectionSchema = {
  type: "object",
  properties: {
    clientId: { type: "string", pattern: "^[a-f0-9\\-]{36}$" },
    connectionType: { type: "string", enum: ["bank", "erp", "manual"] },
    credentials: {
      type: "object",
      patternProperties: {
        "^[a-zA-Z0-9_]+$": { type: "string" },
      },
      additionalProperties: false,
    },
  },
  required: ["clientId", "connectionType", "credentials"],
  additionalProperties: false,
} as const;

export interface BuildDashboardParams {
  clientId: string;
  metrics: Array<"revenue" | "expenses" | "taxLiability">;
  timeframe: { start: string; end: string };
}

export const buildDashboardSchema = {
  type: "object",
  properties: {
    clientId: { type: "string", pattern: "^[a-f0-9\\-]{36}$" },
    metrics: {
      type: "array",
      items: { type: "string", enum: ["revenue", "expenses", "taxLiability"] },
      minItems: 1,
    },
    timeframe: {
      type: "object",
      properties: {
        start: { type: "string", format: "date" },
        end: { type: "string", format: "date" },
      },
      required: ["start", "end"],
      additionalProperties: false,
    },
  },
  required: ["clientId", "metrics", "timeframe"],
  additionalProperties: false,
} as const;

/** Registry mapping tool names to their schemas */
export const toolRegistry = {
  register_client: registerClientSchema,
  create_connection: createConnectionSchema,
  build_dashboard: buildDashboardSchema,
  build_workflow: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1 },
      description: { type: "string" }
    },
    required: ["name"],
    additionalProperties: false
  }
} as const;

export type ToolName = keyof typeof toolRegistry;