"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Field, FormError, Input } from "@/components/ui";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/admin";
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
