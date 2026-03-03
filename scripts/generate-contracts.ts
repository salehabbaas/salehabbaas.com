import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());

function write(relativePath: string, content: string) {
  const target = resolve(ROOT, relativePath);
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, content, "utf8");
}

const openApi = {
  openapi: "3.1.0",
  info: {
    title: "salehabbaas Admin BFF",
    version: "2026-03-01"
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/admin/control-center": {
      get: {
        summary: "Control center summary",
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["summary", "apiVersion"],
                  properties: {
                    summary: { type: "object", additionalProperties: true },
                    apiVersion: { type: "string" }
                  }
                }
              }
            }
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["error", "apiVersion"],
                  properties: {
                    error: { type: "string" },
                    apiVersion: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/admin/system-inbox": {
      get: {
        summary: "System inbox summary",
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["summary", "apiVersion"],
                  properties: {
                    summary: { type: "object", additionalProperties: true },
                    apiVersion: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/admin/systems-dashboard": {
      get: {
        summary: "Systems dashboard summary",
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["summary", "apiVersion"],
                  properties: {
                    summary: { type: "object", additionalProperties: true },
                    apiVersion: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/admin/logs": {
      get: {
        summary: "Admin logs summary",
        security: [{ bearerAuth: [] }, { sessionCookie: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["summary", "apiVersion"],
                  properties: {
                    summary: { type: "object", additionalProperties: true },
                    apiVersion: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/admin/mobile/bootstrap": {
      post: {
        summary: "Mobile admin bootstrap",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Bootstrap payload",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["apiVersion", "customToken", "uid", "email", "access", "nextPath"],
                  properties: {
                    apiVersion: { type: "string" },
                    customToken: { type: "string" },
                    uid: { type: "string" },
                    email: { type: "string" },
                    access: { type: "object", additionalProperties: true },
                    nextPath: { type: "string" }
                  }
                }
              }
            }
          },
          "401": {
            description: "Unauthorized"
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Firebase ID Token"
      },
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "__session"
      }
    }
  }
} as const;

const firestoreSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "contracts/firestore/admin.enums.schema.json",
  title: "Admin shared enums",
  type: "object",
  properties: {
    adminModuleKeys: {
      type: "array",
      items: {
        type: "string",
        enum: ["dashboard", "cms", "creator", "linkedin", "projects", "resume", "jobs", "bookings", "settings", "agent"]
      }
    },
    projectAccessRole: {
      type: "string",
      enum: ["viewer", "editor"]
    },
    adminUserStatus: {
      type: "string",
      enum: ["invited", "active", "revoked"]
    }
  },
  required: ["adminModuleKeys", "projectAccessRole", "adminUserStatus"],
  additionalProperties: false
} as const;

const tsGenerated = `/* eslint-disable */\n// GENERATED FILE - DO NOT EDIT MANUALLY.\n// Run: npm run contracts:generate\n\nexport const CONTRACT_API_VERSION = \"2026-03-01\" as const;\n\nexport type ContractApiEnvelope<TSummary = Record<string, unknown>> = {\n  summary: TSummary;\n  apiVersion: string;\n};\n\nexport const ADMIN_MODULE_KEYS = [\n  \"dashboard\",\n  \"cms\",\n  \"creator\",\n  \"linkedin\",\n  \"projects\",\n  \"resume\",\n  \"jobs\",\n  \"bookings\",\n  \"settings\",\n  \"agent\"\n] as const;\n\nexport type AdminModuleKeyContract = (typeof ADMIN_MODULE_KEYS)[number];\n`;

const swiftGenerated = `// GENERATED FILE - DO NOT EDIT MANUALLY.\n// Run: npm run contracts:generate\n\nimport Foundation\n\npublic enum ContractConstants {\n  public static let apiVersion = \"2026-03-01\"\n}\n\npublic struct ContractApiEnvelope<T: Decodable>: Decodable {\n  public let summary: T\n  public let apiVersion: String\n}\n\npublic enum AdminModuleKeyContract: String, Codable, CaseIterable {\n  case dashboard\n  case cms\n  case creator\n  case linkedin\n  case projects\n  case resume\n  case jobs\n  case bookings\n  case settings\n  case agent\n}\n`;

write("contracts/openapi/admin-bff.openapi.json", `${JSON.stringify(openApi, null, 2)}\n`);
write("contracts/firestore/admin.enums.schema.json", `${JSON.stringify(firestoreSchema, null, 2)}\n`);
write("contracts/generated/ts/contract-models.ts", tsGenerated);
write("contracts/generated/swift/ContractModels.swift", swiftGenerated);
