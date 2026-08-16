import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_PATH = path.join(DATA_DIR, "users.json");
const OWNER_EMAIL = "deuxaiinfo786@gmail.com";

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

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readUsers(): Promise<User[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(USERS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeUsers(users: User[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await readUsers();
  return users.find((u) => u.email === email) || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await readUsers();
  return users.find((u) => u.id === id) || null;
}

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  provider: "credentials" | "google" | "github";
  image?: string;
}): Promise<User> {
  const users = await readUsers();

  const existing = users.find((u) => u.email === data.email);
  if (existing) return existing;

  const hashedPassword = data.password
    ? await bcrypt.hash(data.password, 12)
    : undefined;

  const newUser: User = {
    id: Date.now().toString(),
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: data.email === OWNER_EMAIL ? "admin" : "user",
    provider: data.provider,
    image: data.image,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await writeUsers(users);
  return newUser;
}

export async function getAllUsers(): Promise<User[]> {
  return readUsers();
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await readUsers();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) return false;
  await writeUsers(filtered);
  return true;
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

export function isOwner(email: string): boolean {
  return email === OWNER_EMAIL;
}
