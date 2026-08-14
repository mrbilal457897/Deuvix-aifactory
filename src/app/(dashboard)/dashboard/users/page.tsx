"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Users, Shield, User, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  provider: "credentials" | "google" | "github";
  image?: string;
  createdAt: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this user?")) return;
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: "Total Users", value: users.length, icon: Users, color: "text-primary" },
    { label: "Admins", value: users.filter((u) => u.role === "admin").length, icon: Shield, color: "text-emerald-500" },
    { label: "Regular Users", value: users.filter((u) => u.role === "user").length, icon: User, color: "text-violet-500" },
  ];

  const providerLabels: Record<string, string> = {
    credentials: "Email",
    google: "Google",
    github: "GitHub",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Signed in as <span className="text-foreground font-medium">{session?.user?.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-heading font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className={cn("size-10 rounded-lg bg-muted flex items-center justify-center", stat.color)}>
                <stat.icon className="size-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-card border border-border">
          <Users className="size-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-muted text-xs text-muted-foreground uppercase tracking-wider font-medium">
            <div className="col-span-4">User</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Provider</div>
            <div className="col-span-2">Joined</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {filtered.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-12 gap-4 items-center px-5 py-4 border-t border-border hover:bg-muted/50 transition-colors"
            >
              <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                {user.image ? (
                  <Image src={user.image} alt={user.name} width={36} height={36} className="size-9 rounded-full border border-border" />
                ) : (
                  <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>

              <div className="hidden md:block col-span-2">
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    user.role === "admin"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {user.role}
                </span>
              </div>

              <div className="hidden md:block col-span-2">
                <span className="px-2.5 py-1 rounded-full text-xs bg-background border border-border text-muted-foreground">
                  {providerLabels[user.provider] || user.provider}
                </span>
              </div>

              <div className="hidden md:block col-span-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="col-span-12 md:col-span-2 flex items-center justify-end">
                {user.role !== "admin" && (
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
