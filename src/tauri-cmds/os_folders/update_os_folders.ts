import { invoke } from "@tauri-apps/api/core";
import { OsFolder, UserType } from "../../models";

export default async function update_os_folders(osFolders: OsFolder[], user?: UserType) {
  try {
    //console.log("updating folders: ", osFolders, "user passed: ", user);
    const osFolder: OsFolder = await invoke("update_os_folders", { osFolders, user });
    return osFolder;
  } catch (error) {
    console.error("update_os_folders", error);
    return null;
  }
}

