"use client";

import { createContext, useContext } from "react";

export const StepFieldErrorsContext = createContext<Record<string, string[]>>({});

export function useFieldError(name: string): string[] | undefined {
  return useContext(StepFieldErrorsContext)[name];
}
