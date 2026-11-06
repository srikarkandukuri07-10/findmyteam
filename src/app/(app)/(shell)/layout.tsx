import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { ProCard } from "@/components/shell/pro-card";
import { SearchBox } from "@/components/shell/search-box";
import { SidebarLinks, SidebarNav } from "@/components/shell/sidebar-nav";
import { Topbar, TopbarPlaceholder } from "@/components/shell/topbar";
import { getShellInfo } from "@/lib/shell/data";

async function SidebarNavWithCounts() {
  const info = await getShellInfo();
  return <SidebarNav layoutGroup="sidebar" pendingRequests={info.pendingRequests} unreadMessages={info.unreadMessages} />;
}

async function TopbarWithInfo() {
  const info = await getShellInfo();
  return <Topbar info={info} search={<SearchBox />} />;
}

/**
 * The app: a sidebar on the left (a drawer on phones) and a top bar with search and the profile menu.
 * The frame is static, so it paints at once; names and counts stream in behind Suspense.
 */
export default function ShellLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-dvh w-[256px] shrink-0 flex-col overflow-y-auto p-4 [scrollbar-width:none] lg:flex">
        <div className="flex flex-1 flex-col gap-6 rounded-[2rem] bg-surface/80 px-3 py-5 shadow-card backdrop-blur">
          <div className="flex justify-center">
            <Logo href="/home" stacked />
          </div>
          <Suspense fallback={<SidebarLinks pathname="" layoutGroup="sidebar" />}>
            <SidebarNavWithCounts />
          </Suspense>
          <div className="mt-auto px-1">
            <ProCard />
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<TopbarPlaceholder search={<SearchBox />} />}>
          <TopbarWithInfo />
        </Suspense>
        {children}
      </div>
    </div>
  );
}
