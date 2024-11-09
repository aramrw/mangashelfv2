import { invoke } from "@tauri-apps/api/core";
import { OsFolder } from "../models";

export default async function get_os_folders_by_path(parentPath: string) {
  try {
    const osFolders: OsFolder[] = await invoke("get_os_folders_by_path", { parentPath });
    return osFolders;
  } catch (error) {
    //console.error("get_os_folders_by_path:", error);
    return null;
  }
}

