import { createFormHook } from '@tanstack/react-form'
import { SubmitButton, TextareaField, TextField } from '@/components/FormFields'
import { fieldContext, formContext } from '@/lib/form-context'

/**
 * The app's form hook. Use it instead of `useForm` so every form gets the same field
 * components (`field.TextField`, `field.TextareaField`) and `form.SubmitButton`.
 */
export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, TextareaField },
  formComponents: { SubmitButton },
})
