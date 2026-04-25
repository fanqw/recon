import { describe, expect, it } from "vitest";
import { validateLoginFields } from "./login-validation";

describe("validateLoginFields", () => {
  it("returns field-level messages when username or password is blank", () => {
    expect(validateLoginFields({ username: "", password: " " })).toEqual({
      username: "请输入用户名",
      password: "请输入密码",
    });
  });

  it("returns no field errors when username and password are present", () => {
    expect(validateLoginFields({ username: "admin", password: "admin123" })).toEqual({});
  });
});
