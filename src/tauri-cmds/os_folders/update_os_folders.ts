import { invoke } from "@tauri-apps/api/core";
import { OsFolder, UserType } from "../../models";

export default async function update_os_folders(osFolders: OsFolder[], user?: UserType) {
  console.debug("BULK UPDATING OsFolders:", osFolders)
  const osFolder: OsFolder =
    await invoke("update_os_folders", { osFolders, user });
  console.debug("OsFolders BULK UPDATE RESULT", osFolders)
  return osFolder;
}

