import { Accessor, createSignal, For, Show } from "solid-js";
import { OsFolder, UserType } from "../../models";
import play_video from "../../tauri-cmds/mpv/play_video";
import ErrorAlert from "../../main-components/error-alert";
import LibraryFolderCard from "./folder-card";
import { A, useLocation, useNavigate } from "@solidjs/router";

export default function LibraryFoldersSection({
  user,
  mainParentFolder,
  childFolders
}: {
  user: UserType;
  mainParentFolder: OsFolder;
  childFolders: OsFolder[];
}
) {
  const navigate = useNavigate();
  const [error, setError] = createSignal<string | null>();

  return (
    <>
      <Show when={error()}>
        <ErrorAlert error={error()!} />
      </Show>
      <section
        class="md:px-4 overflow-hidden w-full h-fit px-2 pb-4 relative 
				border-b-white border-b-2 shadow-lg shadow-primary/10">
        <ul
          class="h-fit w-fit grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 
					xl:grid-cols-4 gap-3 justify-start items-start">
          <For each={childFolders}>
            {(folder, index) => (
              <LibraryFolderCard
                index={index}
                folder={folder}
                mainParentFolder={mainParentFolder}
                onClick={() => {
                  if (folder.last_read_panel) {
                    navigate(`/reader/${encodeURIComponent(folder.path)}`);
                  } else {
                    navigate(`/library/${encodeURIComponent(folder.path)}`);
                  }
                }}
              />
            )}
          </For>
        </ul>
      </section>
    </>
  )
}

