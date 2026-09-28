import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

export async function ensureStorage(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/** Persist an uploaded file to disk, returning its stored path (relative to cwd). */
export async function saveUpload(
  memberId: string,
  originalName: string,
  bytes: Buffer
): Promise<{ storedPath: string; sizeBytes: number }> {
  await ensureStorage();
  const ext = path.extname(originalName) || "";
  const id = crypto.randomBytes(8).toString("hex");
  const safeMember = memberId.replace(/[^a-zA-Z0-9_-]/g, "");
  const fileName = `${safeMember}_${Date.now()}_${id}${ext}`;
  const abs = path.join(UPLOAD_DIR, fileName);
  await fs.writeFile(abs, bytes);
  return { storedPath: path.relative(process.cwd(), abs), sizeBytes: bytes.length };
}

export async function readUpload(storedPath: string): Promise<Buffer> {
  const abs = path.resolve(storedPath);
  return fs.readFile(abs);
}

export async function deleteUpload(storedPath: string): Promise<void> {
  const abs = path.resolve(storedPath);
  await fs.rm(abs, { force: true });
}
