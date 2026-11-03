import { Logo } from "@/components/logo";
import { logOut } from "@/app/(auth)/actions";

/** Chrome for signed-in pages. Static, so it renders instantly; pages read the session behind Suspense. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Logo href="/home" />
          <form action={logOut}>
            <button type="submit" className="text-sm font-medium text-muted hover:text-foreground">
              Log out
            </button>
          </form>
        </div>
      </header>
      {children}
    </>
  );
}
