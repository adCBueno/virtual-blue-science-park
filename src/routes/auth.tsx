import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth as authService, backendState } from "@/data/services";
import { useAccount } from "@/components/account-provider";

import { ConnectionWaves } from "@/components/connection-waves";
export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log In · Blue Science Park" },
      {
        name: "description",
        content: "Log in to your company workspace or Blue Science Park staff account.",
      },
      { property: "og:title", content: "Log In · Blue Science Park" },
      {
        property: "og:description",
        content: "Secure access to company profiles and in-app review requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auth,
});
function Auth() {
  const [email, setEmail] = useState("");
  const [validEmail, setValidEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reset, setReset] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { refresh } = useAccount();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !validEmail) return;
    setBusy(true);
    setError("");
    try {
      if (reset) setSent(true);
      else {
        await authService.signIn(email, password);
        await refresh();
        await navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-screen">
      <ConnectionWaves />
      <Link to="/" className="auth-back">
        <ArrowLeft size={15} />
        Return to public exploration
      </Link>
      <section className="auth-form-wrap">
        <img src="/bsp-logo.png" alt="Blue Science Park" className="auth-logo" />
        <span className="eyebrow">VIRTUAL SCIENCE PARK</span>
        <h1>{reset ? "Reset your password." : "Welcome back."}</h1>
        <p>
          {reset
            ? "Receive a secure link to choose a new password."
            : "Your next connection starts here."}
        </p>
        {sent ? (
          <div className="auth-notice">Recovery is simulated. No email was sent.</div>
        ) : (
          <form onSubmit={submit}>
            <label className="editor-field">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.currentTarget.value);
                  setValidEmail(e.currentTarget.validity.valid);
                }}
              />
            </label>
            {!reset && (
              <label className="editor-field">
                Password
                <div className="password-field">
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={show ? "Hide password" : "Show password"}
                    onClick={() => setShow((s) => !s)}
                  >
                    {show ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </label>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !validEmail} className="auth-submit">
              {busy ? "Please wait…" : reset ? "Send reset link" : "Log In"}
              <ArrowRight />
            </Button>
          </form>
        )}
        <Button
          variant="link"
          onClick={() => {
            setReset((r) => !r);
            setSent(false);
            setError("");
          }}
        >
          {reset ? "Back to login" : "Forgot password?"}
        </Button>
        <p className="auth-account-note">
          {backendState.enabled
            ? "Log in with your Virtual Science Park account."
            : "Simulated demo login. Use demo-nord@example.test or demo-staff@example.test. Leave the password blank."}
        </p>
      </section>
    </main>
  );
}
