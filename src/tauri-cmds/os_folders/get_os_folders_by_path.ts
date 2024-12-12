import { invoke } from "@tauri-apps/api/core";
import { SortType, OsFolder } from "../../models";

export default async function get_os_folders_by_path(parentPath: string, sort?: SortType) {
  let sortType: SortType = "none";
  if (sort) { sortType = sort };

  try {
    const osFolders: OsFolder[] = await invoke("get_os_folders_by_path", { parentPath, sortType });
    return osFolders;
  } catch (error) {
    //console.error("get_os_folders_by_path:", error);
    return null;
  }
}
