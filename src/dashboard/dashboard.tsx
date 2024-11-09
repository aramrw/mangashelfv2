import { createEffect, createResource, createSignal, For, onMount, Show } from "solid-js";
import NavBar from "../main-components/navbar"
import { OsFolder, UserType } from "../models";
import AddNewSkeleton from "./components/add-new-skeleton";
import OsFolderCard from "./components/os-folder-card";
import { get_os_folders } from "../tauri-cmds/os_folders";
import get_default_user from "../tauri-cmds/users";
import { Skeleton } from "../components/ui/skeleton";

export default function Dashboard() {
  const [user, setUser] = createSignal<UserType | null>(null);
  const [osFolders, { refetch }] = createResource<OsFolder[]>(async () => {
    const user = await get_default_user();
    if (user) {
      setUser(user);
      const folders = await get_os_folders(user.id);
      return folders || []; // Always return an array, even if empty
    }
    return []; // Return an empty array if no user is found
  });

  return (
    <main>
      <NavBar />
      <section class="h-fit py-4 px-3 md:px-16 lg:px-36 xl:px-44 flex flex-row gap-2">
        <div class="grid grid-cols-4 gap-2 min-h-[calc(4*cardHeight)]">
          <Show
            when={user() && osFolders.state === "ready" && osFolders()!.length > 0}
            fallback={
              osFolders.state === "pending" && (
                <Skeleton class="h-32 w-24 sm:h-44 sm:w-32 md:h-48 md:w-36 lg:h-52 lg:w-40" />
              )
            }
          >
            <For each={osFolders()}>
              {(folder) => (
                <OsFolderCard folder={folder} user={user} refetch={refetch} />
              )}
            </For>
          </Show>
          <Show when={user()}>
            <AddNewSkeleton user={user} refetch={refetch} />
          </Show>
        </div>
      </section>
    </main>
  );
}
