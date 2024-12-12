import { createResource, createSignal, For, Show } from "solid-js";
import NavBar from "../main-components/navbar";
import { OsFolder, UserType } from "../models";
import AddNewSkeleton from "./components/add-new-skeleton";
import { get_os_folders } from "../tauri-cmds/os_folders/get_os_folders";
import get_default_user from "../tauri-cmds/users";
import OsFolderCard from "./components/os-folder-card";

export default function Dashboard() {
  const [user, setUser] = createSignal<UserType | null>(null);
  const [osFolders, { refetch }] = createResource<OsFolder[]>(async () => {
    const user = await get_default_user();
    if (user) {
      setUser(user);
      const folders = await get_os_folders(user.id, "updated");
      //console.log("dashboard folders: ", folders);
      console.log(user);
      return folders || [];
    }
    return [];
  });
  const [showHiddenFolders, setShowHiddenFolders] = createSignal(false);

  return (
    <main>
      <NavBar showHiddenFolders={showHiddenFolders} setShowHiddenFolders={setShowHiddenFolders} />
      <section class="h-fit w-full flex flex-row gap-2">
        <Show when={user() && osFolders.state === "ready"}>
          <div class="w-full flex flex-col gap-2 pt-3.5">
            <section id="manga_folders_section"
              class="flex flex-row flex-wrap gap-2.5 px-3 md:px-16 lg:px-28 xl:px-44"
            >
              <AddNewSkeleton user={user} refetch={refetch} />
              <Show when={user()?.last_read_manga_folder}>
                <Show when={showHiddenFolders() && user()?.last_read_manga_folder?.is_hidden}>
                  <OsFolderCard
                    folder={user()?.last_read_manga_folder!}
                    user={user}
                    refetch={refetch}
                    isLastReadMangaFolder={true}
                  />
                </Show>
                <Show when={!user()?.last_read_manga_folder?.is_hidden}>
                  <OsFolderCard
                    folder={user()?.last_read_manga_folder!}
                    user={user}
                    refetch={refetch}
                    isLastReadMangaFolder={true}
                  />
                </Show>
              </Show>
              <For each={osFolders()}>
                {(folder) => (
                  <>
                    <Show when={folder.is_manga_folder && folder.path !== user()?.last_read_manga_folder?.path}>
                      <Show when={showHiddenFolders() && folder.is_hidden}>
                        <OsFolderCard folder={folder} user={user} refetch={refetch} />
                      </Show>
                      <Show when={!folder.is_hidden}>
                        <OsFolderCard folder={folder} user={user} refetch={refetch} />
                      </Show>
                    </Show>
                  </>
                )}
              </For>
            </section>
            <div class="w-full h-7 bg-popover shadow-sm my-1.5"></div>
            <section id="manga_folders_section"
              class="flex flex-row gap-2.5
							px-3 md:px-16 lg:px-28 xl:px-44"
            >
              <For each={osFolders()}>
                {(folder) => (
                  <>
                    <Show when={!folder.is_manga_folder}>
                      <Show when={showHiddenFolders() && folder.is_hidden}>
                        <OsFolderCard folder={folder} user={user} refetch={refetch} />
                      </Show>
                      <Show when={!folder.is_hidden}>
                        <OsFolderCard folder={folder} user={user} refetch={refetch} />
                      </Show>
                    </Show>
                  </>
                )}
              </For>
            </section>
          </div>
        </Show>
      </section>
    </main>
  );
}
