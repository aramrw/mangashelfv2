import { Accessor, createSignal, For, Resource, Setter, Show } from "solid-js";
import { OsFolder, UserType } from "../../models";
import ErrorAlert from "../../main-components/error-alert";
import LibraryFolderCard from "./folder-card";
import { A, useLocation, useNavigate } from "@solidjs/router";

export default function LibraryFoldersSection({
  user,
  mainParentFolder,
  childFolders,
  refetchChildFolders,
  showHiddenChildFolders,
}: {
  user: Resource<UserType | null>;
  mainParentFolder: Resource<OsFolder | null>;
  childFolders: Resource<OsFolder[] | null>;
  refetchChildFolders: (info?: unknown) => OsFolder[] | Promise<OsFolder[] | null | undefined> | null | undefined;
  showHiddenChildFolders: Accessor<boolean>;
}
) {
  const navigate = useNavigate();
  //const [error, setError] = createSignal<string | null>();

  return (
    <>
      <section
        class="md:px-4 overflow-hidden w-full h-fit px-2 pb-4 relative 
				border-b-white border-b-2 shadow-lg shadow-primary/10">
        <ul
          class="mx-auto h-fit w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 
					xl:grid-cols-4 gap-3 lg:px-32 place-items-center">
          <For each={childFolders()}>
            {(folder, index) => (
              <>
                <Show when={!folder.is_hidden}>
                  <LibraryFolderCard
                    user={user}
                    index={index}
                    folder={folder}
                    mainParentFolder={mainParentFolder}
                    refetchChildFolders={refetchChildFolders}
                    onClick={() => {
                      if (folder.is_manga_folder) {
                        navigate(`/reader/${encodeURIComponent(folder.path)}`);
                      } else {
                        navigate(`/library/${encodeURIComponent(folder.path)}`);
                      }
                    }}
                  />
                </Show>
                <Show when={showHiddenChildFolders() && folder.is_hidden}>
                  <LibraryFolderCard
                    user={user}
                    index={index}
                    folder={folder}
                    mainParentFolder={mainParentFolder}
                    refetchChildFolders={refetchChildFolders}
                    onClick={() => {
                      if (folder.is_manga_folder) {
                        navigate(`/reader/${encodeURIComponent(folder.path)}`);
                      } else {
                        navigate(`/library/${encodeURIComponent(folder.path)}`);
                      }
                    }}
                  />
                </Show>
              </>
            )}
          </For>
        </ul>
      </section>
    </>
  )
}

