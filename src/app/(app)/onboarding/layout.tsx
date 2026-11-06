import { logOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";

/** The guided setup after sign-up: just the logo and a way out, no app navigation yet. */
export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <>
      <header className="px-4 pt-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between rounded-full bg-surface px-4 py-2 shadow-card sm:pl-5">
          <Logo href="/onboarding" />
          <form action={logOut}>
            <button
              type="submit"
              className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      {children}
    </>
  );
}
