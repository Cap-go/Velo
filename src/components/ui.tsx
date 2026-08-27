import type { InputHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

export function Shell({
  children,
  cta,
  homeTo = "/",
}: {
  children: ReactNode;
  cta?: ReactNode;
  homeTo?: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to={homeTo} className="text-xl font-bold tracking-tight">
          Velo
        </Link>
        <nav className="flex items-center gap-3">{cta}</nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--velo-muted)]">{label}</span>
      <input className="input" {...props} />
    </label>
  );
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {message}
    </div>
  );
}
