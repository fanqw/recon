/**
 * 从登录等响应中提取可放入 `Cookie` 请求头的字符串（兼容 Node `fetch` 的 `getSetCookie`）。
 */
export function cookieHeaderFromResponse(res: Response): string {
  const headers = res.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const list = headers.getSetCookie?.();
  if (list?.length) {
    return list.map((c) => c.split(";")[0]?.trim() ?? "").filter(Boolean).join("; ");
  }
  const single = res.headers.get("set-cookie");
  if (!single) return "";
  return single.split(/,(?=\s*[^=]+=)/).map((p) => p.split(";")[0]?.trim() ?? "").filter(Boolean).join("; ");
}

/**
 * 使用种子账号调用登录接口，成功时返回后续请求可用的 `Cookie` 头内容。
 */
export async function loginAsAdmin(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  if (!res.ok) {
    throw new Error(`登录失败: HTTP ${res.status}`);
  }
  return cookieHeaderFromResponse(res);
}

/**
 * 将相对路径解析为基于测试基址的绝对 URL。
 */
export function apiUrl(baseUrl: string, pathname: string): string {
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${baseUrl.replace(/\/$/, "")}${p}`;
}

/**
 * 对测试服务发起 `fetch`，可选附带会话 Cookie（用于需登录的 API）。
 */
export function fetchWithCookie(
  baseUrl: string,
  pathname: string,
  init: RequestInit = {},
  cookie?: string
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("Cookie", cookie);
  return fetch(apiUrl(baseUrl, pathname), { ...init, headers });
}

/**
 * 使用会话 Cookie 发送 JSON `POST`（用于测试中创建资源）。
 */
export function postJsonWithCookie(
  baseUrl: string,
  pathname: string,
  body: unknown,
  cookie: string
): Promise<Response> {
  return fetchWithCookie(
    baseUrl,
    pathname,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    cookie
  );
}

/**
 * 使用会话 Cookie 发送 JSON `PATCH`（用于测试中更新资源）。
 */
export function patchJsonWithCookie(
  baseUrl: string,
  pathname: string,
  body: unknown,
  cookie: string
): Promise<Response> {
  return fetchWithCookie(
    baseUrl,
    pathname,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    cookie
  );
}

/**
 * 使用会话 Cookie 发送 `DELETE`（用于逻辑删除类接口）。
 */
export function deleteWithCookie(
  baseUrl: string,
  pathname: string,
  cookie: string
): Promise<Response> {
  return fetchWithCookie(baseUrl, pathname, { method: "DELETE" }, cookie);
}
