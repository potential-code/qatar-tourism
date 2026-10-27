import { createFormHookContexts } from '@tanstack/react-form'

// Shared by the field components (components/FormFields.tsx) and the form hook
// (hooks/useAppForm.ts). Kept in its own module so neither imports the other.
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()
