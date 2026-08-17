"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  Zap,
  Folder,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  ImageIcon,
  Settings,
  Users,
  ChevronRight,
  Search,
  Bell,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, createContext, useContext } from "react";

const DASHBOARD_PREFIX = "/deux";

const sidebarLinks = [
  { href: DASHBOARD_PREFIX, label: "Projects", icon: Folder },
  { href: `${DASHBOARD_PREFIX}/users`, label: "Users", icon: Users },
  { href: `${DASHBOARD_PREFIX}/media`, label: "Media Library", icon: ImageIcon },
  { href: `${DASHBOARD_PREFIX}/images`, label: "Image Settings", icon: Settings },
];

const SidebarCtx = createContext<{ collapsed: boolean; toggle: () => void }>({ collapsed: false, toggle: () => {} });

function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.replace(DASHBOARD_PREFIX, "").split("/").filter(Boolean);
  const crumbs = [{ label: "Dashboard", href: DASHBOARD_PREFIX }];
  if (segments[0]) {
    const link = sidebarLinks.find((l) => l.href.endsWith(segments[0]));
    crumbs.push({ label: link?.label || segments[0], href: `${DASHBOARD_PREFIX}/${segments[0]}` });
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/50" />}
          <Link
            href={c.href}
            className={cn(
              "transition-colors",
              i === crumbs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {c.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
      aria-label="Toggle theme"
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="size-4 absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { collapsed } = useContext(SidebarCtx);

  return (
    <>
      <div className={cn("flex items-center gap-3 border-b border-border", collapsed ? "px-3 py-4 justify-center" : "px-5 py-4")}>
        <div className="flex items-center justify-center size-9 rounded-xl bg-primary shrink-0">
          <Zap className="size-4.5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-[15px] font-heading font-bold text-foreground tracking-tight">Deux</span>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Admin Panel</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {sidebarLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== DASHBOARD_PREFIX && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150",
                collapsed ? "px-3 py-2.5 justify-center" : "px-3.5 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary shadow-[inset_3px_0_0_0_#4CAF7D]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={collapsed ? link.label : undefined}
            >
              <link.icon className={cn("size-[18px] shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && session?.user && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-muted border border-border">
          <div className="flex items-center gap-3">
            {session.user.image ? (
              <Image src={session.user.image} alt="" width={32} height={32} className="size-8 rounded-full ring-2 ring-primary/20" />
            ) : (
              <div className="size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {session.user.name?.charAt(0) || "A"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{session.user.name || "Admin"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{session.user.email}</p>
            </div>
          </div>
        </div>
      )}

      <div className={cn("border-t border-border p-3 space-y-0.5", collapsed && "flex flex-col items-center")}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="size-[18px]" />
            Back to Site
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="flex items-center justify-center p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Back to Site">
            <ArrowLeft className="size-[18px]" />
          </Link>
        )}
        <button
          onClick={() => { signOut({ callbackUrl: "/" }); onNavigate(); }}
          className={cn(
            "flex items-center gap-3 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors w-full",
            collapsed ? "px-0 py-2.5 justify-center" : "px-3.5 py-2.5"
          )}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="size-[18px]" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();

  return (
    <SidebarCtx.Provider value={{ collapsed, toggle: () => setCollapsed(!collapsed) }}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden lg:flex lg:flex-col fixed top-0 bottom-0 left-0 z-40 bg-card border-r border-border transition-all duration-200",
            collapsed ? "w-[68px]" : "w-60"
          )}
        >
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </aside>

        {/* Mobile Overlay */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col">
              <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted z-10">
                <X className="size-5" />
              </button>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <div className={cn("transition-all duration-200", collapsed ? "lg:ml-[68px]" : "lg:ml-60")}>
          {/* Floating Top Navbar */}
          <div className="sticky top-0 z-30 p-3">
            <header className="flex items-center gap-4 h-12 px-4 bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-sm">
              <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                <Menu className="size-4" />
              </button>
              <Breadcrumbs />
              <nav className="hidden md:flex items-center gap-1 ml-4">
                {[
                  { href: "/", label: "Home" },
                  { href: "/products", label: "Services" },
                  { href: "/projects", label: "Projects" },
                  { href: "/about", label: "About" },
                  { href: "/blog", label: "Blog" },
                  { href: "/contact", label: "Contact" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    target={link.href === "/" ? "_self" : "_self"}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-0.5 ml-auto">
                <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Search className="size-4" />
                </button>
                <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative">
                  <Bell className="size-4" />
                  <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
                </button>
                <ThemeToggle />
                {session?.user?.image ? (
                  <Image src={session.user.image} alt="" width={28} height={28} className="size-7 rounded-full ring-1 ring-border ml-1" />
                ) : (
                  <div className="size-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold ml-1">
                    {session?.user?.name?.charAt(0) || "A"}
                  </div>
                )}
              </div>
            </header>
          </div>

          {/* Page Content */}
          <main className="px-3 pb-6 -mt-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarCtx.Provider>
  );
}
