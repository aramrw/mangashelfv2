import { invoke } from "@tauri-apps/api/core";
import { UserType } from "../models";

export default async function update_user(user: UserType) {
  try {
    await invoke("update_user", { user });
  } catch (error) {
    console.error("update_user", error);
  }
};

