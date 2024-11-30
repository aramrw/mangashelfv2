import { OsFolder, UserType } from "../../models";
import { Accessor, Resource, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ContextMenu, ContextMenuTrigger } from "../../components/ui/context-menu";
import { Transition } from "solid-transition-group";
import FolderCardContextMenuContent from "../../dashboard/components/folder-card-cm-context";
import { platform } from "@tauri-apps/plugin-os";
import { cn } from "../../libs/cn";
import IconHeroSlashEye from "../../main-components/icons/icon-hero-slash-eye";
import { IconBookFilled } from "@tabler/icons-solidjs";
import { OsFolderDescription } from "../../main-components/description/folder-desc";

const LibraryFolderCard = ({
  user,
  index,
  folder,
  mainParentFolder,
  refetchChildFolders,
  onClick,
}: {
  user: Resource<UserType | null>;
  index: Accessor<number>;
  folder: OsFolder;
  mainParentFolder: Resource<OsFolder | null>;
  refetchChildFolders: (info?: unknown) => OsFolder[] | Promise<OsFolder[] | null | undefined> | null | undefined;
  onClick: (event: MouseEvent) => void;
}) => {
  const currentPlatform = platform();
  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800 });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 800 });
        a.finished.then(done);
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger class="w-full flex justify-center items-center">
          <div
            class={cn(
              `w-full h-48 lg:h-56 min-h-30 cursor-pointer relative border-[1.5px]
						border-transparent rounded-sm shadow-black/30 shadow-md flex items-center
						justify-center overflow-hidden will-change-auto transition-all group`,
            )}
            onClick={onClick}
          >
            {/* <div class="w-7 h-7 bg-secondary absolute left-0 top-0 z-20 rounded-br-sm" /> */}
            {/* Folder Image */}
            <Show when={folder.cover_img_path}>
              <img
                src={folder.cover_img_path && convertFileSrc(folder.cover_img_path)}
                class={cn("object-cover w-full h-full relative select-none object-top", folder.is_read && "brightness-[0.3]")}
              />
            </Show>

            <OsFolderDescription folder={() => folder} />
            <h1
              class="w-fit flex flex-col items-center justify-start h-full text-xs absolute left-0 top-0 bg-primary/80 font-semibold
								border-r-4 border-r-secondary/10 shadow-sm shadow-black/50 text-nowrap
								text-border backdrop-blur-sm mix-blend-plus-darker
								group-hover:opacity-90 transition-all duration-300 will-change-auto"
            >
              <p class="w-full h-fit font-bold text-base border-b-2 border-secondary/10 p-1 text-center">{index() + 1}</p>
              <p class="p-1 h-full w-full [writing-mode:vertical-rl] [text-orientation:upright] [letter-spacing:]">{folder.title}</p>
            </h1>
            <Show when={folder.is_hidden}>
              <IconHeroSlashEye
                class="h-[40%] w-fit ml-5 bg-primary rounded-md absolute p-1 opacity-60
									group-hover:opacity-0 transition-all duration-300 fill-secondary"
              />
            </Show>
            <Show when={folder.is_read && !folder.is_hidden}>
              <IconBookFilled
                class="h-[40%] w-fit bg-primary/80 rounded-md absolute p-1 opacity-90
									group-hover:opacity-0 transition-all duration-300 fill-secondary"
              />
            </Show>
          </div>
        </ContextMenuTrigger>
        <FolderCardContextMenuContent user={user} folder={folder} currentPlatform={currentPlatform} refetch={refetchChildFolders} />
      </ContextMenu>
    </Transition>
  );
};

export default LibraryFolderCard;
