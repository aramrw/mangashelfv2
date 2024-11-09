import { invoke } from "@tauri-apps/api/core";

export default async function mpv_system_check(mpv_path?: string): Promise<null | string> {
  try {
    await invoke("mpv_system_check", { mpv_path });
    return null;
  } catch (e) {
    return e as string;
  }
}

