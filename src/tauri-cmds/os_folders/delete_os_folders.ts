import { invoke } from "@tauri-apps/api/core";
import { OsFolder, UserType } from "../../models";

export default async function delete_os_folders(osFolders: OsFolder[], user?: UserType) {
  try {
    const osFolder: OsFolder = await invoke("delete_os_folders", { osFolders, user });
    return osFolder;
  } catch (error) {
    console.error("delete_os_folders", error);
    return null;
  }
}

