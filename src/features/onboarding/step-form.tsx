"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";
import { t } from "@/lib/i18n";
import { continueStepAction, saveDraftAction, type StepFormState } from "./actions";
import { StepFieldErrorsContext } from "./step-context";
import type { OnboardingStepId } from "./steps";

const AUTOSAVE_DELAY_MS = 800;
type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Form shell of one questionnaire step: submit saves and advances; any change
 * triggers a debounced draft save so leaving the page never loses data.
 */
export function StepForm({
  step,
  children,
  allowSkip,
}: {
  step: OnboardingStepId;
  children: ReactNode;
  allowSkip: boolean;
}) {
  const boundContinue = continueStepAction.bind(null, step);
  const [state, action, pending] = useActionState(boundContinue, {} as StepFormState);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [draftErrors, setDraftErrors] = useState<Record<string, string[]> | undefined>(undefined);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    setStatus("saving");
    const data = new FormData(form);
    startTransition(async () => {
      const result = await saveDraftAction(step, data);
      if (result.error) setStatus("error");
      else if (result.fieldErrors) {
        // Incomplete draft: keep quiet, the "continue" submit will show errors.
        setStatus("idle");
      } else {
        setDraftErrors(undefined);
        setStatus("saved");
      }
    });
  }, [step]);

  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(saveDraft, AUTOSAVE_DELAY_MS);
  }, [saveDraft]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const fieldErrors = state.fieldErrors ?? draftErrors;

  return (
    <StepFieldErrorsContext.Provider value={fieldErrors ?? {}}>
      <form
        ref={formRef}
        action={action}
        onChange={scheduleSave}
        className="flex flex-col gap-6"
        noValidate
      >
        {state.error ? <Notice tone="error">{state.error}</Notice> : null}
        {children}
        <div className="border-border flex items-center justify-between gap-3 border-t pt-5">
          <span role="status" aria-live="polite" className="text-fg-muted text-xs">
            {status === "saving"
              ? t("common.saving")
              : status === "saved"
                ? t("common.saved")
                : status === "error"
                  ? t("common.genericError")
                  : ""}
          </span>
          <div className="flex items-center gap-3">
            {allowSkip ? (
              <button
                type="submit"
                name="skip"
                value="1"
                className="text-fg-muted text-sm underline-offset-2 hover:underline"
              >
                {t("common.skip")}
              </button>
            ) : null}
            <Button type="submit" loading={pending}>
              {t("common.next")}
            </Button>
          </div>
        </div>
      </form>
    </StepFieldErrorsContext.Provider>
  );
}
