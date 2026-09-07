"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/states";
import { t } from "@/lib/i18n";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
  type AuthFormState,
} from "./actions";

const initial: AuthFormState = {};

function Feedback({ state }: { state: AuthFormState }) {
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  if (state.success) return <Notice tone="success">{state.success}</Notice>;
  return null;
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      <Feedback state={state} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field id="email" label={t("auth.email")} error={fe.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(fe.email) || undefined}
          aria-describedby={describedBy("email", false, Boolean(fe.email))}
        />
      </Field>
      <Field id="password" label={t("auth.password")} error={fe.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(fe.password) || undefined}
          aria-describedby={describedBy("password", false, Boolean(fe.password))}
        />
      </Field>
      <Button type="submit" loading={pending} className="mt-1">
        {t("auth.loginButton")}
      </Button>
      <div className="text-fg-muted flex justify-between text-sm">
        <Link href="/forgot-password" className="underline-offset-2 hover:underline">
          {t("auth.forgotLink")}
        </Link>
        <Link href="/register" className="underline-offset-2 hover:underline">
          {t("auth.noAccount")} {t("nav.register")}
        </Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Feedback state={state} />
      <Field id="email" label={t("auth.email")} error={fe.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(fe.email) || undefined}
          aria-describedby={describedBy("email", false, Boolean(fe.email))}
        />
      </Field>
      <Field
        id="password"
        label={t("auth.password")}
        hint={t("auth.passwordTooShort")}
        error={fe.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(fe.password) || undefined}
          aria-describedby={describedBy("password", true, Boolean(fe.password))}
        />
      </Field>
      <Field id="passwordConfirm" label={t("auth.passwordConfirm")} error={fe.passwordConfirm}>
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(fe.passwordConfirm) || undefined}
          aria-describedby={describedBy("passwordConfirm", false, Boolean(fe.passwordConfirm))}
        />
      </Field>
      <Button type="submit" loading={pending} className="mt-1">
        {t("auth.registerButton")}
      </Button>
      <p className="text-fg-muted text-sm">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="underline-offset-2 hover:underline">
          {t("nav.login")}
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Feedback state={state} />
      <Field id="email" label={t("auth.email")} error={fe.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(fe.email) || undefined}
          aria-describedby={describedBy("email", false, Boolean(fe.email))}
        />
      </Field>
      <Button type="submit" loading={pending}>
        {t("auth.forgotButton")}
      </Button>
      <Link href="/login" className="text-fg-muted text-sm underline-offset-2 hover:underline">
        {t("common.back")}
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Feedback state={state} />
      {token ? <input type="hidden" name="token" value={token} /> : null}
      <Field
        id="password"
        label={t("auth.newPassword")}
        hint={t("auth.passwordTooShort")}
        error={fe.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(fe.password) || undefined}
          aria-describedby={describedBy("password", true, Boolean(fe.password))}
        />
      </Field>
      <Field id="passwordConfirm" label={t("auth.passwordConfirm")} error={fe.passwordConfirm}>
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(fe.passwordConfirm) || undefined}
          aria-describedby={describedBy("passwordConfirm", false, Boolean(fe.passwordConfirm))}
        />
      </Field>
      <Button type="submit" loading={pending}>
        {t("auth.resetButton")}
      </Button>
    </form>
  );
}
