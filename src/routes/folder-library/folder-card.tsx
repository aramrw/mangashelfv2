import { OsFolder, } from "../../models";
import { Accessor, createEffect, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import { Transition } from "solid-transition-group";
import { IconFolderFilled } from "@tabler/icons-solidjs";

const LibraryFolderCard = ({
  index,
  folder,
  mainParentFolder,
  onClick,
}: {
  index: Accessor<number>;
  folder: OsFolder;
  mainParentFolder: OsFolder;
  onClick: (event: MouseEvent) => void;
}) => {

  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1000 });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1000 });
        a.finished.then(done);
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger class="w-fit">
          <div class="w-44 h-52 min-h-30 cursor-pointer relative border-[1.5px] 
						border-transparent rounded-sm shadow-black/20 shadow-md flex items-center 
						justify-center overflow-hidden will-change-transform transition-all group"
            onClick={onClick}
          >
            <div
              class="absolute inset-0 z-0"
              style={{
                "background-image":
                  `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),url(${folder.cover_img_path && convertFileSrc(folder.cover_img_path)})`,
                "background-size": "cover",
                "background-repeat": "no-repeat",
                "background-position": "center",
                filter: "blur(2px)",
              }}
            />

            {/* <div class="w-7 h-7 bg-secondary absolute left-0 top-0 z-20 rounded-br-sm" /> */}
            {/* Folder Image */}
            <div class="folder-card-container inset-0"
            >
              <Show when={folder.cover_img_path}>
                <img
                  src={folder.cover_img_path && convertFileSrc(folder.cover_img_path)}
                  class="object-cover w-full h-full relative select-none"
                />
              </Show>
            </div>

            {/* Hover Overlay for Extended Description */}
            <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200
                        flex items-center justify-center text-white p-4 z-20">
              <p class="text-sm font-medium absolute left-2 top-2 text text-zinc-100 bg-transparent 
												 mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
                {folder.title}
              </p>
              <p class="text-[12px] font-medium absolute left-2 bottom-2 text text-zinc-300 bg-transparent 
												mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
                {folder.update_date}
              </p>
              <p class="text-[13px] font-medium absolute left-2 bottom-6 text text-zinc-300 bg-transparent 
												mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
                {folder.update_time}
              </p>
            </div>

            {/* folder.Title at Bottom */}
            <div class="h-fit absolute left-0 bottom-0 bg-primary/80 
												border-t-2 border-t-secondary/10 shadow-md 
                        text-border text-xs p-1 mix-blend-plus-darker 
												group-hover:opacity-0 transition-opacity duration-300"
            >
              {folder.title}
            </div>

          </div>
        </ContextMenuTrigger>
      </ContextMenu>
    </Transition >
  );
};

export default LibraryFolderCard;


