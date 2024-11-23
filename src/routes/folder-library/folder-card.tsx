import { OsFolder, UserType, } from "../../models";
import { Accessor, Resource, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import { Transition } from "solid-transition-group";
import FolderCardContextMenuContent from "../../dashboard/components/folder-card-cm-context";
import { platform } from "@tauri-apps/plugin-os";
import { cn } from "../../libs/cn";
import IconHeroSlashEye from "../../main-components/icons/icon-hero-slash-eye";
import { escapeCSSUrl } from "./header";

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
          <div class={cn(`w-full h-52 min-h-30 cursor-pointer relative border-[1.5px] 
						border-transparent rounded-sm shadow-black/20 shadow-md flex items-center 
						justify-center overflow-hidden will-change-transform transition-all group`,
            folder.is_hidden && "brightness-50"
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
                class="object-cover w-full h-full relative select-none object-top"
              />
            </Show>

            {/* Hover Overlay for Extended Description */}
            <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200
                        flex items-center justify-center text-white p-4 z-20 backdrop-blur-sm">
              <p class="text-sm font-medium absolute left-2 top-2 text text-zinc-100 bg-transparent 
												 mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
                {folder.title}
              </p>
              <p class="text-[13px] font-medium absolute left-2 top-7 text text-zinc-300 bg-transparent 
												 mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
                {folder.last_read_panel?.title}
              </p>
              <p class="text-[12px] font-medium absolute right-2 bottom-2 text text-zinc-300 bg-transparent 
												mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
                {folder.update_date}
              </p>
              <p class="text-[13px] font-medium absolute right-2 bottom-6 text text-zinc-300 bg-transparent 
												mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
                {folder.update_time}
              </p>
            </div>

            {/* folder title */}
            <div class="h-fit absolute left-0 top-0 bg-primary/80 font-medium 
												border-b-4 border-b-secondary/10 shadow-sm shadow-black/50 rounded-br-sm 
                        text-border text-xs p-1 backdrop-blur-sm mix-blend-plus-darker 
												group-hover:opacity-0 transition-all duration-300 will-change-transform"
            >
              {folder.title}
            </div>

            <Show when={folder.is_hidden}>
              <div
                class="group-hover:opacity-0 transition-all duration-300 
								w-full h-full flex justify-center items-center absolute left-0 top-0 mix-blend-plus-lighter"
              >
                <IconHeroSlashEye class="h-2/3 
									group-hover:opacity-0 transition-all duration-300 fill-secondary/80" />
              </div>
            </Show>

          </div>
        </ContextMenuTrigger>
        <FolderCardContextMenuContent
          user={user}
          folder={folder}
          currentPlatform={currentPlatform}
          refetch={refetchChildFolders}
        />
      </ContextMenu>
    </Transition >
  );
};

export default LibraryFolderCard;


