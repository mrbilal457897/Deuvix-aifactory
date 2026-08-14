import { NextResponse } from "next/server";
import { listLeads } from "@/lib/leads";

export async function GET() {
  const leads = await listLeads();
  const summary = {
    total: leads.length,
    hot: leads.filter((l) => l.status === "hot").length,
    warm: leads.filter((l) => l.status === "warm").length,
    cold: leads.filter((l) => l.status === "cold").length,
  };
  return NextResponse.json({ summary, leads });
}
