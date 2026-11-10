"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Users, Shield, User, Search, Trash2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { DataTable, Badge, type Column } from "@/components/dashboard/data-table";

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
    const res = await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const filtered = users.filter(
    (u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const providerLabels: Record<string, string> = { credentials: "Email", google: "Google", github: "GitHub" };

  const columns: Column<UserData>[] = [
    {
      key: "name",
      label: "User",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          {u.image ? (
            <Image src={u.image} alt={u.name} width={36} height={36} sizes="36px" className="size-9 rounded-full ring-1 ring-border" />
          ) : (
            <div className="size-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-bold">
              {u.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{u.name}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      className: "hidden md:table-cell",
      render: (u) => <Badge variant={u.role === "admin" ? "info" : "default"}>{u.role}</Badge>,
    },
    {
      key: "provider",
      label: "Provider",
      sortable: true,
      className: "hidden md:table-cell",
      render: (u) => <span className="text-muted-foreground text-xs">{providerLabels[u.provider] || u.provider}</span>,
    },
    {
      key: "createdAt",
      label: "Joined",
      sortable: true,
      className: "hidden lg:table-cell",
      render: (u) => <span className="text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      label: "",
      className: "w-16 text-right",
      render: (u) =>
        u.role !== "admin" ? (
          <button onClick={(e) => { e.stopPropagation(); handleDelete(u.id); }} className="btn-sharp p-2 rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors opacity-0 group-hover:opacity-100" title="Remove">
            <Trash2 className="size-4" />
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading h1 text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Signed in as <span className="text-foreground font-medium">{session?.user?.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Users" value={users.length} icon={Users} />
        <StatCard label="Admins" value={users.filter((u) => u.role === "admin").length} icon={Shield} />
        <StatCard label="Regular Users" value={users.filter((u) => u.role === "user").length} icon={User} />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div className="group">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            emptyIcon={<Users className="size-12 text-muted-foreground/40 mx-auto" />}
            emptyText="No users found"
          />
        )}
      </div>
    </div>
  );
}
