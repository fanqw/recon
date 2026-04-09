import "vitest";

declare module "vitest" {
  /** 由 global setup 注入，供 API 集成测试拼接请求基址。 */
  interface ProvidedContext {
    testBaseUrl: string;
  }
}
