"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { withUserDb } from "@/db/user-db";
import { ensureUserRecord } from "@/db/queries/users";
import { getAuthService } from "@/lib/auth";
import type { AuthError } from "@/lib/auth/types";
import { t } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { fieldErrorsFromZod } from "@/lib/validation/common";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
}

function messageFor(error: AuthError): string {
  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return t("auth.invalidCredentials");
    case "EMAIL_TAKEN":
      return t("auth.emailTaken");
    case "WEAK_PASSWORD":
      return t("auth.passwordTooShort");
    case "INVALID_TOKEN":
      return t("auth.resetInvalid");
    default:
      return t("common.genericError");
  }
}

function safeNext(value: FormDataEntryValue | null): string {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/world";
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let target = "/world";
  try {
    const result = await getAuthService().signIn(parsed.data.email, parsed.data.password);
    if (!result.ok) return { error: messageFor(result.error) };
    await withUserDb(result.value.id, (tx) => ensureUserRecord(tx, result.value));
    target = safeNext(formData.get("next"));
  } catch (error) {
    logger.error("auth.login.unexpected", error);
    return { error: t("common.genericError") };
  }
  redirect(target as Route);
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    const result = await getAuthService().signUp(parsed.data.email, parsed.data.password);
    if (!result.ok) return { error: messageFor(result.error) };
    if (result.value.requiresEmailConfirmation || !result.value.user)
      return { success: t("auth.checkEmail") };
    const user = result.value.user;
    await withUserDb(user.id, (tx) => ensureUserRecord(tx, user));
  } catch (error) {
    logger.error("auth.register.unexpected", error);
    return { error: t("common.genericError") };
  }
  redirect("/onboarding");
}

export async function logoutAction(): Promise<void> {
  try {
    await getAuthService().signOut();
  } catch (error) {
    logger.error("auth.logout.unexpected", error);
  }
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  try {
    const result = await getAuthService().requestPasswordReset(parsed.data.email);
    if (!result.ok) return { error: messageFor(result.error) };
    return { success: t("auth.resetSent") };
  } catch (error) {
    logger.error("auth.forgot.unexpected", error);
    return { error: t("common.genericError") };
  }
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
    token: formData.get("token") || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  try {
    const result = await getAuthService().updatePassword(parsed.data.password, parsed.data.token);
    if (!result.ok) return { error: messageFor(result.error) };
  } catch (error) {
    logger.error("auth.reset.unexpected", error);
    return { error: t("common.genericError") };
  }
  redirect("/login?reset=1");
}
