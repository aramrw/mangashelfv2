import { invoke } from "@tauri-apps/api/core";

export default async function show_in_folder(path: string) {
  invoke("show_in_folder", { path });
}
