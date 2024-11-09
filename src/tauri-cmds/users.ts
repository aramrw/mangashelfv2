import { invoke } from "@tauri-apps/api/core";
import { UserType } from "../models";

export default async function get_default_user() {
  try {
    const user: UserType = await invoke("get_default_user");
    return user;
  } catch (error) {
    console.error("get_default_user", error);
    return null;
  }
};

