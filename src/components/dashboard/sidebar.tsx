"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Zap, Folder, ArrowLeft, LogOut, Menu, X, ImageIcon, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { href: "/deux", label: "Projects", icon: Folder },
  { href: "/deux/users", label: "Users", icon: Users },
  { href: "/deux/media", label: "Media Library", icon: ImageIcon },
  { href: "/deux/images", label: "Image Settings", icon: Settings },
];

function SidebarNav({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary">
            <Zap className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-heading font-bold text-foreground tracking-tight">
            DEUX AI Factory
          </span>
        </Link>
        <p className="text-xs text-muted-foreground mt-1 ml-[42px]">Admin Panel</p>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      {session?.user && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-muted border border-border">
          <div className="flex items-center gap-3">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={36}
                height={36}
                className="size-9 rounded-full border-2 border-primary/50"
              />
            ) : (
              <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "A"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {session.user.name || "Admin"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session.user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="p-3 border-t border-border space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Site
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors w-full"
        >
          <LogOut className="size-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export function DashboardSidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-card border-r border-border fixed top-16 bottom-0 left-0 z-40">
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col pt-16">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-20 right-4 size-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground z-10"
              aria-label="Close sidebar"
            >
              <X className="size-5" />
            </button>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}

export function DashboardMobileTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();

  return (
    <div className="lg:hidden sticky top-16 z-30 flex items-center gap-3 px-4 h-14 bg-background/80 backdrop-blur-xl border-b border-border">
      <button
        onClick={onMenuClick}
        className="size-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
      >
        <Menu className="size-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="size-6 rounded-md bg-primary flex items-center justify-center">
          <Zap className="size-3 text-primary-foreground" />
        </div>
        <span className="font-heading font-bold text-foreground text-sm">Dashboard</span>
      </div>
      {session?.user?.image && (
        <Image
          src={session.user.image}
          alt={session.user.name || "User"}
          width={28}
          height={28}
          className="size-7 rounded-full border border-border ml-auto"
        />
      )}
    </div>
  );
}
