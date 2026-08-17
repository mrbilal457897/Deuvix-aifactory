import bcrypt from "bcryptjs";
import { supabase } from "./supabase";
import { ADMIN_EMAILS, isAdminEmail } from "./admin-emails";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: "admin" | "user";
  provider: "credentials" | "google" | "github";
  image?: string;
  createdAt: string;
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    password: row.password as string | undefined,
    role: (row.role as "admin" | "user") || "user",
    provider: (row.provider as "credentials" | "google" | "github") || "credentials",
    image: row.image as string | undefined,
    createdAt: row.created_at as string,
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data } = await supabase.from("users").select("*").eq("email", email).single();
  if (!data) return null;
  return rowToUser(data);
}

export async function getUserById(id: string): Promise<User | null> {
  const { data } = await supabase.from("users").select("*").eq("id", id).single();
  if (!data) return null;
  return rowToUser(data);
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  provider: "credentials" | "google" | "github";
  image?: string;
}): Promise<User> {
  const existing = await getUserByEmail(data.email);
  if (existing) return existing;

  const hashedPassword = data.password
    ? await bcrypt.hash(data.password, 12)
    : undefined;

  const newUser = {
    id: Date.now().toString(),
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: ADMIN_EMAILS.includes(data.email) ? "admin" : "user",
    provider: data.provider,
    image: data.image,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("users").insert(newUser);
  if (error) {
    console.error("Failed to create user:", error.message);
  }

  return rowToUser(newUser);
}

export async function getAllUsers(): Promise<User[]> {
  const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
  if (!data) return [];
  return data.map(rowToUser);
}

export async function deleteUser(id: string): Promise<boolean> {
  const { error } = await supabase.from("users").delete().eq("id", id);
  return !error;
}

export async function verifyPassword(
  email: string,
  password: string
): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.password) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return user;
}

export { isAdminEmail } from "./admin-emails";

export function isOwner(email: string): boolean {
  return isAdminEmail(email);
}
