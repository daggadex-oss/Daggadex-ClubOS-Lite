"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestSignIn } from "@/lib/auth";

type Status = "idle" | "loading" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");

    const { error } = await requestSignIn(email);

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-base px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-center text-4xl uppercase tracking-tight text-cream">
          Daggadex ClubOS
        </h1>
        <p className="mt-2 text-center text-sm text-sage">
          Members only. Enter your email for a private sign-in link.
        </p>

        {status === "sent" ? (
          <div className="mt-8 rounded-sm border border-sage/30 bg-surface px-4 py-6 text-center">
            <p className="text-cream">Check your email.</p>
            <p className="mt-1 text-sm text-sage">
              We&apos;ve sent a sign-in link to {email}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-3">
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
              className="h-11 rounded-sm border-sage/30 bg-surface text-cream placeholder:text-sage/70"
            />
            <Button
              type="submit"
              disabled={status === "loading"}
              className="h-11 w-full rounded-sm bg-gold text-base hover:bg-gold/90"
            >
              {status === "loading" ? "Sending…" : "Send sign-in link"}
            </Button>
            {status === "error" && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
