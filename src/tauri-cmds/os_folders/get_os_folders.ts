import { invoke } from "@tauri-apps/api/core";
import { OsFolder, SortType } from "../../models";

export async function get_os_folders(userId: string, sort?: SortType) {
  let sortType: SortType = "none";
  if (sort) { sortType = sort };

  try {
    const osFolders: OsFolder[] = await invoke("get_os_folders", { userId, sortType });
    return osFolders;
  } catch (error) {
    //console.error("get_os_folders:", error);
    return null;
  }
}
