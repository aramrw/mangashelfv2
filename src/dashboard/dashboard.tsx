import { createResource, createSignal, For, Show } from "solid-js";
import NavBar from "../main-components/navbar";
import { OsFolder, UserType } from "../models";
import AddNewSkeleton from "./components/add-new-skeleton";
import OsFolderCard from "./components/os-folder-card";
import { get_os_folders } from "../tauri-cmds/os_folders";
import get_default_user from "../tauri-cmds/users";

export default function Dashboard() {
  const [user, setUser] = createSignal<UserType | null>(null);
  const [osFolders, { refetch }] = createResource<OsFolder[]>(async () => {
    const user = await get_default_user();
    if (user) {
			console.log(user);
      setUser(user);
      const folders = await get_os_folders(user.id);
      console.log("dashboard folders: ", folders);
      return folders || []; // Always return an array, even if empty
    }
    return []; // Return an empty array if no user is found
  })
  const [showHiddenFolders, setShowHiddenFolders] = createSignal(false);

  return (
    <main>
      <NavBar
        showHiddenFolders={showHiddenFolders}
        setShowHiddenFolders={setShowHiddenFolders}
      />
      <section class="h-fit w-full py-4 px-3 md:px-16 lg:px-28 xl:px-44 flex flex-row gap-2">
        <div class="grid grid-cols-4 gap-2 min-h-[calc(4*cardHeight)]">
          <Show when={user() && osFolders.state === "ready" && osFolders()!.length > 0}>
            <For each={osFolders()}>{(folder) =>
              <>
                <Show when={showHiddenFolders() && folder.is_hidden}>
                  <OsFolderCard folder={folder} user={user} refetch={refetch} />
                </Show>
                <Show when={!folder.is_hidden}>
                  <OsFolderCard folder={folder} user={user} refetch={refetch} />
                </Show>
              </>
            }
            </For>
          </Show>
          <AddNewSkeleton user={user} refetch={refetch} />
        </div>
      </section>
    </main>
  );
}
