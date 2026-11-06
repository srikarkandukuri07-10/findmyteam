/**
 * Signed-in pages. The app itself, with the sidebar, lives in the (shell) group; onboarding has its own
 * plain header so the guided steps stay focused.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return children;
}
