import type { AppError } from "@/lib/result";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
}

export const initialFormState: FormState = {};

export function formStateFromError(error: AppError): FormState {
  return { error: error.message, fieldErrors: error.fieldErrors };
}
