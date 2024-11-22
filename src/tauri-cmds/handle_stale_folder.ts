import { invoke } from "@tauri-apps/api/core";
import { MangaPanel, OsFolder } from "../models";

export default async function upsert_read_os_dir(
  dir: String,
  parentPath: String | undefined,
  userId: String,
  oldDirs: OsFolder[] | undefined,
  oldPanels: MangaPanel[] | undefined
) {
  try {
		console.log("upsert_read_os_dir:", dir);
    return await invoke("upsert_read_os_dir", { dir, parentPath, userId, oldDirs, oldPanels }) as boolean;
  } catch (e) {
    console.error("upsert_read_os_dir: ", e);
  }
}
