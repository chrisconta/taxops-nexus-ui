import { validateToolParams } from "./validator";
import type { RegisterClientParams, CreateConnectionParams, BuildDashboardParams } from "./index";

describe("Tool Registry Validation", () => {
  describe("register_client", () => {
    it("accepts valid register_client params", () => {
      expect(
        validateToolParams<RegisterClientParams>(
          "register_client",
          { 
            name: "Alice", 
            email: "a@example.com", 
            companyId: "123e4567-e89b-12d3-a456-426614174000" 
          }
        )
      ).toBe(true);
    });

    it("rejects register_client with extra props", () => {
      expect(
        validateToolParams("register_client", { 
          name: "Bob", 
          email: "b@ex.com", 
          companyId: "123e4567-e89b-12d3-a456-426614174000", 
          extra: 1 
        })
      ).toBe(false);
    });

    it("rejects register_client with invalid email", () => {
      expect(
        validateToolParams("register_client", { 
          name: "Charlie", 
          email: "invalid-email", 
          companyId: "123e4567-e89b-12d3-a456-426614174000" 
        })
      ).toBe(false);
    });
  });

  describe("create_connection", () => {
    it("accepts valid create_connection params", () => {
      expect(
        validateToolParams<CreateConnectionParams>(
          "create_connection",
          {
            clientId: "123e4567-e89b-12d3-a456-426614174000",
            connectionType: "bank",
            credentials: { username: "test", password: "secret" }
          }
        )
      ).toBe(true);
    });

    it("rejects create_connection with invalid connectionType", () => {
      expect(
        validateToolParams("create_connection", {
          clientId: "123e4567-e89b-12d3-a456-426614174000",
          connectionType: "invalid",
          credentials: { username: "test" }
        })
      ).toBe(false);
    });
  });

  describe("build_dashboard", () => {
    it("accepts valid build_dashboard params", () => {
      expect(
        validateToolParams<BuildDashboardParams>(
          "build_dashboard",
          {
            clientId: "123e4567-e89b-12d3-a456-426614174000",
            metrics: ["revenue", "expenses"],
            timeframe: { start: "2024-01-01", end: "2024-12-31" }
          }
        )
      ).toBe(true);
    });

    it("rejects build_dashboard with empty metrics", () => {
      expect(
        validateToolParams("build_dashboard", {
          clientId: "123e4567-e89b-12d3-a456-426614174000",
          metrics: [],
          timeframe: { start: "2024-01-01", end: "2024-12-31" }
        })
      ).toBe(false);
    });
  });
});