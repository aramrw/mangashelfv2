import { useParams } from "@solidjs/router";
import { Transition } from "solid-transition-group";
import LibraryHeader from "./header";
import { createEffect, createResource, createSignal, Show } from "solid-js";
import NavBar from "../../main-components/navbar";
import get_user_by_id from "../../tauri-cmds/get_user_by_id";
import get_os_folder_by_path from "../../tauri-cmds/mpv/get_os_folder_by_path";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { IconFolderFilled } from "@tabler/icons-solidjs";
import LibraryFoldersSection from "./folders-section";
import get_os_folders_by_path from "../../tauri-cmds/get_os_folders_by_path";
import upsert_read_os_dir from "../../tauri-cmds/handle_stale_folder";

export default function Library() {
  const params = useParams();
  const [folderPath, setFolderPath] = createSignal(decodeURIComponent(params.folder).replace(/\)$/, ""));

  const [mainParentFolder, { refetch: refetchMainParentFolder }] = createResource(
    () => folderPath(),
    get_os_folder_by_path
  );
  const [user] = createResource(() => (mainParentFolder() ? mainParentFolder()?.user_id : null), get_user_by_id);
  const [childFolders, { refetch: refetchChildFolders }] = createResource(() => (mainParentFolder() ? mainParentFolder()?.path : null), get_os_folders_by_path);

  const [hasInitialized, setHasInitialized] = createSignal(false);

  createEffect(async () => {
    if (
      !hasInitialized()
      && folderPath()
      && mainParentFolder()
      && user()
      && childFolders()
    ) {
      const is_refetch = await upsert_read_os_dir(mainParentFolder()?.path!, user()?.id!, childFolders()!, undefined);
      console.log(is_refetch);
      if (is_refetch) {
        await refetchChildFolders();
        setHasInitialized(true);
      }
    }
  });

  return (
    <main class="w-full h-[100vh] relative overflow-auto" style={{ "scrollbar-gutter": "stable" }}>
      <NavBar />
      <Transition
        appear={true}
        onEnter={(el, done) => {
          const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
          a.finished.then(done);
        }}
        onExit={(el, done) => {
          const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600 });
          a.finished.then(done);
        }}
      >
        <Tabs defaultValue="volumes" class="w-full" orientation="horizontal">
          <Show when={mainParentFolder.state === "ready" && user.state === "ready"}>
            <Transition
              appear={true}
              onEnter={(el, done) => {
                const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
                a.finished.then(done);
              }}
              onExit={(el, done) => {
                const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600 });
                a.finished.then(done);
              }}
            >
              <LibraryHeader mainParentFolder={mainParentFolder} user={user} />
            </Transition>
            <TabsList class="w-full h-9 border">
              <Show when={childFolders()}>
                <TabsTrigger value="volumes" class="w-fit lg:text-base folders flex flex-row gap-x-0.5">
                  Volumes
                  <IconFolderFilled class="ml-0.5 w-3 stroke-[2.4px]" />
                </TabsTrigger>
              </Show>
              <TabsIndicator />
            </TabsList>
            <Show when={childFolders()}>
              <TabsContent value="volumes">
                <LibraryFoldersSection user={user} mainParentFolder={mainParentFolder} childFolders={childFolders} />
              </TabsContent>
            </Show>
          </Show>
        </Tabs>
      </Transition>
    </main>
  );
}
