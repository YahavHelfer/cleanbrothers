import "server-only";
import { constants } from "node:fs";
import { mkdir, lstat, open, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { requireMediaEnvironment } from "./environment";
import { mediaId, MAX_IMAGE_BYTES } from "./model";

const root = join(tmpdir(), "cleanbrothers-cms-media-local");
async function filePath(id: string) {
  requireMediaEnvironment();
  mediaId(id);
  await mkdir(root, { recursive: true, mode: 0o700 });
  const dir = await lstat(root);
  if (!dir.isDirectory() || dir.isSymbolicLink() || (dir.mode & 0o077) !== 0)
    throw new Error("Unsafe local media directory");
  return join(root, `${id}.webp`);
}
export async function writeLocalImage(id: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES)
    throw new Error("Invalid local media size");
  const path = await filePath(id);
  const file = await open(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await file.writeFile(bytes);
    await file.sync();
  } finally {
    await file.close();
  }
}
export async function readLocalImage(id: string, hash: string) {
  const file = await open(
    await filePath(id),
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES)
      throw new Error("Invalid local media object");
    const data = await file.readFile();
    if (createHash("sha256").update(data).digest("hex") !== hash)
      throw new Error("Media integrity failure");
    return data;
  } finally {
    await file.close();
  }
}
// Only compensates a confirmed failed registration for this just-created UUID.
// Never called for a registered or merely unselected historical version.
export async function discardUnregisteredImage(id: string) {
  await unlink(await filePath(id));
}
