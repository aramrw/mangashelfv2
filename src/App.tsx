import { onMount } from "solid-js";
import "./App.css";
import { useNavigate } from "@solidjs/router";
import get_default_user from "./tauri-cmds/users";
import { UserType } from "./models";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const navigate = useNavigate();

  onMount(async () => {
    let defaultUser = await get_default_user();
    if (defaultUser) {
      navigate("/dashboard");
    } else {
      const dbUser: UserType = {
        id: "1",
        username: "default",
        last_read_manga_folder: undefined,
        settings: {
          user_id: "1",
          autoplay: true,
          update_date: "",
          update_time: "",
        }
      };
      invoke("update_user", { user: dbUser }).then(() => {
        navigate("/dashboard");
      }).catch((e) => {
        console.error("Error updating user:", e);
      });
    }
  });

  return (
    <main>

    </main>
  );
}

export default App;
