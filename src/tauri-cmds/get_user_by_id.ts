import { invoke } from "@tauri-apps/api/core";
import { UserType } from "../models";

export default async function get_user_by_id(userId: string) {
  try {
    const user: UserType = await invoke("get_user_by_id", { userId });
    return user;
  } catch (error) {
    console.error("get_user_id", error);
    return null;
  }
};

