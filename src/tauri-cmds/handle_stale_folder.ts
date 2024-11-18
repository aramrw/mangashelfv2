import { invoke } from "@tauri-apps/api/core";
import { MangaPanel, OsFolder } from "../models";

export default async function upsert_read_os_dir(
  dir: String,
  parentPath: String | undefined,
  userId: String,
  cFolders: OsFolder[] | undefined,
  cPanels: MangaPanel[] | undefined
) {
  try {
    return await invoke("upsert_read_os_dir", { dir, parentPath, userId, cFolders, cPanels }) as boolean;
  } catch (e) {
    console.error(e);
  }
}
