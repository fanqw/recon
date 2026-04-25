export type LoginFieldValues = {
  username: string;
  password: string;
};

export type LoginFieldErrors = Partial<Record<keyof LoginFieldValues, string>>;

export function validateLoginFields(values: LoginFieldValues): LoginFieldErrors {
  const errors: LoginFieldErrors = {};

  if (!values.username.trim()) {
    errors.username = "请输入用户名";
  }

  if (!values.password.trim()) {
    errors.password = "请输入密码";
  }

  return errors;
}
