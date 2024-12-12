import { invoke } from "@tauri-apps/api/core";
import { MangaPanel, OsFolder, UserType } from "../models";

export default async function upsert_read_os_dir(
  dir: String,
  parentPath: String | undefined,
  user: UserType,
  oldDirs: OsFolder[] | undefined,
  oldPanels: MangaPanel[] | undefined
) {
  try {
    //console.log("upsert_read_os_dir:", dir);
    return await invoke("upsert_read_os_dir", { dir, parentPath, user, oldDirs, oldPanels }) as boolean;
  } catch (e) {
    console.error("upsert_read_os_dir: ", e);
  }
}
