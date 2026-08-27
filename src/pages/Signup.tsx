import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorBox, Field, Shell } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export function SignupPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { user } = await api.signup(email, password);
      setUser(user);
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell
      homeTo="/app"
      cta={
        <Link className="btn btn-secondary" to="/login">
          Log in
        </Link>
      }
    >
      <div className="mx-auto max-w-md px-6 py-10">
        <div className="card p-6">
          <h1 className="text-2xl font-bold">Create your Velo account</h1>
          <p className="mt-2 text-[var(--velo-muted)]">
            Start tracking affiliate clicks and conversions in minutes.
          </p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ErrorBox message={error} />
            <button className="btn btn-primary w-full" disabled={loading} type="submit">
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
