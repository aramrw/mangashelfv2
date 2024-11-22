import { invoke } from "@tauri-apps/api/core";
import { OsFolder } from "../models";

export async function get_os_folders(userId: string) {
  try {
    const osFolders: OsFolder[] = await invoke("get_os_folders", { userId });
    return osFolders;
  } catch (error) {
    //console.error("get_os_folders:", error);
    return null;
  }
}

const update_os_folders = async (osFolders: OsFolder[], userId: string) => {
  try {
    console.log("updating folders: ", osFolders);
    const osFolder: OsFolder = await invoke("update_os_folders", { osFolders, userId });
    return osFolder;
  } catch (error) {
    console.error("update_os_folders", error);
    return null;
  }
}

const delete_os_folders = async (osFolders: OsFolder[], userId: string) => {
  try {
    const osFolder: OsFolder = await invoke("delete_os_folders", { osFolders, userId });
    return osFolder;
  } catch (error) {
    console.error("delete_os_folders", error);
    return null;
  }
}


const read_os_folder_dir = async (path: string, userId: string, coverImgPath?: string, updateDatetime?: string[]) => {
  try {
    const osFolders: [OsFolder, OsFolder[]] = await invoke("read_os_folder_dir", { path, userId, coverImgPath, updateDatetime });
    return osFolders;
  } catch (error) {
    console.error("read_os_folder_dir", error);
    return null;
  }
}


export { read_os_folder_dir, delete_os_folders, update_os_folders };
