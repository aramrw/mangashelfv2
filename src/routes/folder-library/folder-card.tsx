import { MangaPanel, OsFolder, UserType } from "../../models";
import { Accessor, Component, Resource, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ContextMenu, ContextMenuTrigger } from "../../components/ui/context-menu";
import { Transition } from "solid-transition-group";
import FolderCardContextMenuContent from "../../dashboard/components/folder-card-cm-context";
import { platform } from "@tauri-apps/plugin-os";
import { cn } from "../../libs/cn";
import IconHeroSlashEye from "../../main-components/icons/icon-hero-slash-eye";
import IconHeroEye from "../../main-components/icons/icon-hero-eye";
import { IconBookFilled } from "@tabler/icons-solidjs";

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
              `w-full h-52 lg:h-64 min-h-30 cursor-pointer relative border-[1.5px]
						border-transparent rounded-sm shadow-black/20 shadow-md flex items-center
						justify-center overflow-hidden will-change-auto transition-all group`,
              folder.is_hidden && "brightness-50",
            )}
            onClick={onClick}
          >
            {/*    <div */}
            {/*      class="absolute inset-0 z-0" */}
            {/*      style={{ */}
            {/*        "background-image": */}
            {/*          `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)), */}
            {/* url(${folder.cover_img_path && escapeCSSUrl(convertFileSrc(folder.cover_img_path))})`, */}
            {/*        "background-size": "cover", */}
            {/*        "background-repeat": "no-repeat", */}
            {/*        "background-position": "center", */}
            {/*        filter: "blur(2px)", */}
            {/*      }} */}
            {/*    /> */}

            {/* <div class="w-7 h-7 bg-secondary absolute left-0 top-0 z-20 rounded-br-sm" /> */}
            {/* Folder Image */}
            <Show when={folder.cover_img_path}>
              <img
                src={folder.cover_img_path && convertFileSrc(folder.cover_img_path)}
                class={cn("object-cover w-full h-full relative select-none object-top", folder.is_read && "brightness-[0.3]")}
              />
            </Show>

            <FolderDescription folder={() => folder} />

            {/* folder title */}
            <h1
              class="w-fit h-full text-md lg:text-lg xl:text-xl absolute left-0 top-0 bg-primary/80 font-semibold
								border-r-4 border-r-secondary/10 shadow-sm shadow-black/50 text-nowrap
								text-border p-1 pl-1.5 backdrop-blur-sm mix-blend-plus-darker
								group-hover:opacity-90 transition-all duration-300 will-change-auto
								[writing-mode:vertical-rl] [text-orientation:upright] [letter-spacing:-0.1em]"
            >
              {folder.title}
            </h1>
            <Show when={folder.is_hidden}>
              <div
                class="group-hover:opacity-0 transition-all duration-300
								w-full h-full flex justify-center items-center absolute left-0 top-0 mix-blend-plus-lighter"
              >
                <IconHeroSlashEye
                  class="h-2/3
									group-hover:opacity-0 transition-all duration-300 fill-secondary/80"
                />
              </div>
            </Show>
            <Show when={folder.is_read}>
              <IconBookFilled
                class="h-[60%] w-fit ml-5 bg-primary rounded-md absolute p-1 opacity-60
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

interface FolderDescriptionProps {
  folder: (() => OsFolder | null) | (() => MangaPanel | undefined);
}

export const FolderDescription: Component<FolderDescriptionProps> = (props) => {
  const folder = props.folder();

  // Check if the folder is an OsFolder by inspecting the last_read_panel or other properties unique to OsFolder
  const isOsFolder = folder && "last_read_panel" in folder;
  const getTitle = (title: string | undefined): [string, string] => {
    if (!title) return ["No Title", "No File Type"];

    const parts = title.split("."); // Split by dots
    // Get the file type (extension) — the last part after the last dot
    const ft = parts.length > 1 ? parts.pop()! : "No File Type";
    // Join the remaining parts with spaces
    const nTitle = parts.join(" ");
    return [nTitle, ft];
  };

  const getTitlesFromPath = (title: string | undefined): [string, string] => {
    if (!title) return ["No panel", "No parent"];

    // Split by both '/' and '\' using a regex
    const parts = title.split(/[\\/]/);

    // Get the file type (extension) — the part after the last dot
    const panel = parts.pop();
    const parent = parts.pop();
    if (!panel || !parent) return ["No panel", "No parent"];
    else return [panel, parent];
  };

  const bytesToMB = (bytes: number): string => {
    if (bytes <= 0) return "0 MB";
    const mb = bytes / (1024 * 1024); // Convert bytes to MB
    return `${mb.toFixed(2)}mb`; // Format to 2 decimal places
  };

  const title = getTitle(props.folder()?.title);

  console.log(folder);

  return (
    <div
      class={cn(
        "z-50 absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-start justify-between text-white px-2.5 py-1.5 backdrop-blur-sm w-full rounded-sm",
        !isOsFolder && "p-3",
      )}
    >
      {/* OS Folder Section */}
      <Show when={isOsFolder}>
        <div>
          <div class="flex flex-col">
            <div class="flex flex-row text-md xl:text-xl font-semibold text-zinc-100 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
              {folder?.title}
              <Show when={folder?.is_read}>
                <IconBookFilled class="h-4 transition-all duration-300 fill-secondary/80" />
              </Show>
            </div>
            <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
              {(folder as OsFolder)?.last_read_panel?.title}
            </p>
            <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5"></p>
          </div>
          <div class="absolute bottom-0 right-0 flex flex-col items-end m-2">
            <p class="text-[12px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 leading-tight">
              {folder?.update_date}
            </p>
            <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 leading-tight">
              {folder?.update_time}
            </p>
          </div>
        </div>
      </Show>

      {/* Manga Panel Section */}
      <Show when={!isOsFolder}>
        <div>
          <p
            class="text-[13px] font-semibold text-zinc-300 bg-transparent
  mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 leading-none truncate"
          >
            {getTitlesFromPath(folder?.parent_path)[0]}
          </p>
          <div class="flex flex-row">
            <p
              class="text-xl font-semibold text-zinc-100 bg-transparent
							mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 underline"
            >
              {title[0]}
            </p>
            <p
              class="text-[13px] font-medium text-zinc-300 bg-transparent
							mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5"
            >
              .{title[1]}
            </p>
          </div>
          <div class="absolute bottom-0 right-0 flex flex-col items-end m-2">
            <p
              class="text-[12px] font-medium text-zinc-300 bg-transparent
							mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 leading-tight"
            >
              {folder?.update_date}
            </p>
            <p
              class="text-[13px] font-medium text-zinc-300 bg-transparent
							mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 leading-tight"
            >
              {folder?.update_time}
            </p>
          </div>
          <p
            class="text-[13px] font-medium text-zinc-300 bg-transparent
						mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 mt-2"
          >
            {bytesToMB((folder as MangaPanel).metadata.size)}
          </p>
        </div>
      </Show>
    </div>
  );
};

export default LibraryFolderCard;
