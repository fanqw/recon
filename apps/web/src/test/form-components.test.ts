import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FieldErrorText } from "@/components/form/FieldErrorText";
import { RequiredFieldLabel } from "@/components/form/RequiredFieldLabel";

describe("shared form components", () => {
  it("renders required field labels with a consistent required marker", () => {
    const markup = renderToStaticMarkup(
      RequiredFieldLabel({
        htmlFor: "username",
        label: "用户名",
      }),
    );

    expect(markup).toContain('for="username"');
    expect(markup).toContain("用户名");
    expect(markup).toContain("form-required-marker");
    expect(markup).toContain("必填");
    expect(markup.indexOf("form-required-marker")).toBeLessThan(markup.indexOf("用户名"));
  });

  it("renders field error text with the shared error class", () => {
    const markup = renderToStaticMarkup(FieldErrorText({ message: "用户名不能为空" }));

    expect(markup).toContain("用户名不能为空");
    expect(markup).toContain("form-field-error");
  });
});
