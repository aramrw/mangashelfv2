import { invoke } from "@tauri-apps/api/core";
import { MangaPanel } from "../models";

export async function get_panels(parentPath: string) {
  try {
    const osFolders: MangaPanel[] = await invoke("get_panels", { parentPath });
    return osFolders;
  } catch (error) {
    console.error("get_panels", error);
    return null;
  }
}

