import bcrypt from "bcryptjs";

const ROUNDS = 10;

/**
 * 对明文密码进行哈希，供创建用户或修改密码时写入 `passwordHash`。
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

/**
 * 校验明文密码是否与已存储的 bcrypt 哈希一致。
 */
export async function verifyPassword(
  plain: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}
