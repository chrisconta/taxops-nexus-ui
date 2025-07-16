// src/agent/tools/validator.ts
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { toolRegistry, type ToolName } from "./index";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

export function validateToolParams<T>(
  toolName: ToolName,
  params: unknown
): params is T {
  const schema = toolRegistry[toolName];
  const validate = ajv.compile(schema);
  const valid = validate(params);
  if (!valid) {
    console.error("Tool validation errors:", validate.errors);
  }
  return valid as boolean;
}