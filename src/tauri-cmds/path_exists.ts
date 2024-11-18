import { invoke } from "@tauri-apps/api/core";

export default async function path_exists(path: string) {
  return await invoke("path_exists", { path }) as boolean;
}
