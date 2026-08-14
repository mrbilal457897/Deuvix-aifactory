import { NextResponse } from "next/server";
import { getAllUsers, deleteUser } from "@/lib/users";

export async function GET() {
  const users = await getAllUsers();
  const safe = users.map((user) => {
    const rest = { ...user };
    delete rest.password;
    return rest;
  });
  return NextResponse.json(safe);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const deleted = await deleteUser(id);
  if (!deleted) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
