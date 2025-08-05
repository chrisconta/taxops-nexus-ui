export const registerClientSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Client or company name"
    },
    email: {
      type: "string",
      format: "email",
      description: "Client email address"
    },
    taxid: {
      type: "string",
      description: "Tax ID or EIN number"
    }
  },
  required: ["name", "email", "taxid"],
  additionalProperties: false
};

export const createConnectionSchema = {
  type: "object",
  properties: {
    clientName: {
      type: "string",
      description: "Name of the client to create connection for"
    },
    connectionType: {
      type: "string",
      description: "Type of connection (mercury, quickbooks, etc.)"
    }
  },
  required: ["clientName", "connectionType"],
  additionalProperties: false
};

export const buildDashboardSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Dashboard name"
    },
    description: {
      type: "string",
      description: "Dashboard description"
    },
    widgets: {
      type: "array",
      description: "List of widgets to include"
    }
  },
  required: ["name"],
  additionalProperties: true
};

export const downloadTaxReportSchema = {
  type: "object",
  properties: {
    fileName: {
      type: "string",
      description: "Specific file name to download"
    },
    taxYear: {
      type: "integer",
      description: "Tax year for the report"
    },
    reportId: {
      type: "string",
      description: "Specific report ID"
    }
  },
  required: [],
  additionalProperties: false
};