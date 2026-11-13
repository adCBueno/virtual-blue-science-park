import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/components/account-provider";
import logo from "@/assets/bsp-logo.asset.json";
import { ConnectionWaves } from "@/components/connection-waves";
export const Route = createFileRoute("/auth")({ head: () => ({ meta: [{ title: "Log In · Blue Science Park" }, { name: "description", content: "Log in to your company workspace or Blue Science Park staff account." }, { property: "og:title", content: "Log In · Blue Science Park" }, { property: "og:description", content: "Secure access to company profiles and in-app review requests." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Auth });
function Auth() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [reset, setReset] = useState(false); const [sent, setSent] = useState(false);
  const navigate = useNavigate(); const { refresh } = useAccount();
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (reset) { const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); if (err) throw err; setSent(true); }
      else { const { error: err } = await supabase.auth.signInWithPassword({ email, password }); if (err) throw err; await refresh(); await navigate({ to: "/" }); }
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to log in. Please try again."); } finally { setBusy(false); }
  };
  return <main className="auth-screen"><ConnectionWaves /><Link to="/" className="auth-back"><ArrowLeft size={15} />Return to public exploration</Link><section className="auth-form-wrap"><img src={logo.url} alt="Blue Science Park" className="auth-logo" /><span className="eyebrow">VIRTUAL SCIENCE PARK</span><h1>{reset ? "Reset your password." : "Welcome back."}</h1><p>{reset ? "Receive a secure link to choose a new password." : "Your next connection starts here."}</p>{sent ? <div className="auth-notice">If an account exists for this email, a password reset link has been sent.</div> : <form onSubmit={submit}><label className="editor-field">Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>{!reset && <label className="editor-field">Password<div className="password-field"><input type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /><Button type="button" variant="ghost" size="icon" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(s => !s)}>{show ? <EyeOff /> : <Eye />}</Button></div></label>}{error && <p role="alert" className="form-error">{error}</p>}<Button type="submit" disabled={busy} className="auth-submit">{busy ? "Please wait…" : reset ? "Send reset link" : "Log In"}<ArrowRight /></Button></form>}<Button variant="link" onClick={() => { setReset(r => !r); setSent(false); setError(""); }}>{reset ? "Back to login" : "Forgot password?"}</Button><p className="auth-account-note">Company and employee accounts are assigned by Blue Science Park. Use your registered account email.</p></section></main>;
}