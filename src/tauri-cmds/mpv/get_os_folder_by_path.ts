import { invoke } from "@tauri-apps/api/core";
import { OsFolder } from "../../models";

export default async function get_os_folder_by_path(folderPath: string) {
  try {
    const osFolder: OsFolder = await invoke("get_os_folder_by_path", { folderPath });
    return osFolder;
  } catch (error) {
    console.error("get_os_folder_by_path:", error);
    throw new Error(error as string); // throw error to propagate it
  }
}
