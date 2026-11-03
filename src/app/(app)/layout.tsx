import { Suspense } from "react";
import { logOut } from "@/app/(auth)/actions";
import { AppNav, NavLinks } from "@/components/app-nav";
import { Logo } from "@/components/logo";

/** Chrome for signed-in pages. Static, so it renders instantly; pages read the session behind Suspense. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="px-4 pt-4">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-3xl bg-surface px-4 py-2.5 shadow-card sm:rounded-full sm:pl-5">
          <Logo href="/home" />
          <div className="flex items-center gap-2">
            <Suspense fallback={<NavLinks pathname="" />}>
              <AppNav />
            </Suspense>
            <form action={logOut}>
              <button
                type="submit"
                className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
