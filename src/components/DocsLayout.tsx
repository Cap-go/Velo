import { Link, NavLink, Outlet } from "react-router-dom";
import { BRAND_NAME } from "../lib/constants";
import { DOC_PAGES, docHref } from "../lib/docs-nav";

export function DocsLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--velo-border)] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <img
              src="/capve-logo.png"
              alt=""
              className="h-8 w-8 rounded-lg object-cover"
              width={32}
              height={32}
              aria-hidden
            />
            {BRAND_NAME}
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link className="text-[var(--velo-muted)] underline-offset-4 hover:underline" to="/docs">
              Docs
            </Link>
            <Link className="btn btn-ghost" to="/">
              Home
            </Link>
            <Link className="btn btn-primary" to="/app">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--velo-muted)]">
            Documentation
          </p>
          {DOC_PAGES.map((page) => (
            <NavLink
              key={page.slug || "index"}
              to={docHref(page.slug)}
              end={page.slug === ""}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm ${
                  isActive
                    ? "bg-[var(--velo-accent-soft)] font-medium text-[var(--velo-accent)]"
                    : "text-[var(--velo-muted)] hover:bg-white hover:text-[var(--velo-ink)]"
                }`
              }
            >
              {page.title}
            </NavLink>
          ))}
        </aside>

        <article className="docs-prose min-w-0">
          <Outlet />
        </article>
      </div>
    </div>
  );
}
