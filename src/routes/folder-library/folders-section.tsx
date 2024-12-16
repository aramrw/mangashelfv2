import { Accessor, For, Resource, Show } from "solid-js";
import { OsFolder, UserType } from "../../models";
import LibraryFolderCard from "./folder-card";
import { useNavigate } from "@solidjs/router";

export type FolderSectionType = "manga" | "parent";

export default function LibraryFoldersSection({
  folderSectionType,
  user,
  mainParentFolder,
  childFolders,
  refetchChildFolders,
  showHiddenChildFolders,
  folderPath,
}: {
  folderSectionType: FolderSectionType;
  user: Resource<UserType | null>;
  mainParentFolder: Resource<OsFolder | null>;
  childFolders: Resource<OsFolder[] | null>;
  showHiddenChildFolders: Accessor<boolean>;
  refetchChildFolders: (info?: unknown) => OsFolder[] | Promise<OsFolder[] | null | undefined> | null | undefined;
  folderPath: () => string;
}) {
  const navigate = useNavigate();
  //const [error, setError] = createSignal<string | null>();

  return (
    <>
      <section
        class="md:px-4 overflow-hidden 
				w-full h-fit px-2 pb-4 relative will-change-auto
				border-b-popover dark:border-b-muted border-b-2
				shadow-lg shadow-primary/10 dark:shadow-primary-foreground/10"
      >
        <ul
          class="w-[86%] mx-auto h-fit md:w-[x-80%] xl:w-[73%] 
					grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3
					xl:grid-cols-4 gap-4 lg:px-12 place-items-center"
        >
          <For each={childFolders()}>
            {(folder, index) => (
              <>
                <Show when={(folderSectionType === "manga" && folder.is_manga_folder) || (folderSectionType !== "manga" && !folder.is_manga_folder)}>
                  <Show when={!folder.is_hidden}>
                    <FolderCardRenderer
                      folder={folder}
                      user={user}
                      index={index}
                      mainParentFolder={mainParentFolder}
                      refetchChildFolders={refetchChildFolders}
                      navigate={navigate}
                      folderPath={folderPath}
                    />
                  </Show>
                  <Show when={showHiddenChildFolders() && folder.is_hidden}>
                    <FolderCardRenderer
                      folder={folder}
                      user={user}
                      index={index}
                      mainParentFolder={mainParentFolder}
                      refetchChildFolders={refetchChildFolders}
                      navigate={navigate}
                      folderPath={folderPath}
                    />
                  </Show>
                </Show>
              </>
            )}
          </For>
        </ul>
      </section>
    </>
  );
}

export function FolderCardRenderer(props: {
  folder: OsFolder;
  user: Resource<UserType | null>;
  index: Accessor<number>;
  mainParentFolder: Resource<OsFolder | null>;
  refetchChildFolders: (info?: unknown) => OsFolder[] | Promise<OsFolder[] | null | undefined> | null | undefined;
  navigate: (path: string) => void;
  folderPath: () => string;
}) {
  const { folder, user, index, mainParentFolder, refetchChildFolders, navigate, folderPath } = props;

  const handleClick = () => {
    if (folder && folder?.path) {
      if (folder?.is_manga_folder) {
        navigate(`/reader/${encodeURIComponent(folder?.path!)}`);
      } else {
        navigate(`/library/${encodeURIComponent(folder?.path!)}`);
      }
    }
  };

  return (
    <LibraryFolderCard
      user={user}
      index={index}
      folder={folder}
      mainParentFolder={mainParentFolder}
      refetchChildFolders={refetchChildFolders}
      onClick={handleClick}
    />
  );
}
