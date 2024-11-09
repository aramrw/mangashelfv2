import { onMount } from "solid-js";
import "./App.css";
import { useNavigate } from "@solidjs/router";
import get_default_user from "./tauri-cmds/users";

function App() {
  const navigate = useNavigate();

  onMount(async () => {
    let defaultUser = await get_default_user();
    if (defaultUser) {
      navigate("/dashboard");
    } else {
      navigate("/create-profile")
    }
  });

  return (
    <main>
			
    </main>
  );
}

export default App;
