import { invoke } from "@tauri-apps/api/core";
import { OsFolder, OsVideo, UserType } from "../../models";

export default async function play_video(mainFolder: OsFolder, video: OsVideo, user: UserType) {
  try {
		console.log("playing video")
    await invoke("play_video", { mainFolder, video, user });
    return null;
  } catch (e) {
    return e as string;
  }
}
