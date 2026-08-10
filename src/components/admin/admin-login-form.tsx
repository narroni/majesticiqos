"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAdmin, type AdminLoginState } from "@/lib/actions/admin-auth";

const initialState: AdminLoginState = {};

interface AdminLoginFormProps {
  initialError?: string;
}

export function AdminLoginForm({ initialError }: AdminLoginFormProps) {
  const [state, formAction, isPending] = useActionState(signInAdmin, initialState);
  const error = state.error ?? initialError;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {error ? <p className="text-danger font-body text-sm">{error}</p> : null}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
