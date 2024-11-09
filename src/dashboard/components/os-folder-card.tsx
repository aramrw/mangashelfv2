import { OsFolder, UserType } from "../../models";
import { Accessor, Setter, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import { platform } from '@tauri-apps/plugin-os';
import FolderCardContextMenuContent from "./folder-card-cm-context";
import { useNavigate } from "@solidjs/router";
import { Transition } from "solid-transition-group";

const OsFolderCard = ({
  folder,
  user,
  refetch
}: {
  folder: OsFolder,
  user: Accessor<UserType | null>,
  refetch: (info?: unknown) => OsFolder[] | Promise<OsFolder[] | undefined> | null | undefined
}
) => {
  const currentPlatform = platform();
  const encodedFolderPath = encodeURIComponent(folder.path);
  const navigate = useNavigate();

  console.log(folder)

  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 600
        });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 600
        });
        a.finished.then(done);
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <div class=" w-fit 
					flex items-center 
					hover:translate-y-[-1.5px] hover:opacity-80 transition-all 
						cursor-pointer duration-200 ease-in-out select-none">
            <div class="h-32 w-24 sm:h-44 sm:w-32 md:h-48 md:w-36 lg:h-52 lg:w-40 
							rounded-sm shadow-md bg-white 
							flex items-center justify-center overflow-hidden relative will-change-transform "
              onClick={() => {
                if (folder.is_manga_folder) {
                  navigate(`/reader/${encodedFolderPath}`)
                } else {
                  navigate(`/library/${encodedFolderPath}`)
                }
              }
              }
            >
              <div class="folder-card-container absolute inset-0">
                <Show when={folder.cover_img_path}>
                  <img
                    src={convertFileSrc(folder.cover_img_path!)}
                    class="object-cover w-full h-full relative z-10 bg-black will-change-auto subpixel-antialiased"
                  />
                </Show>
              </div>
              <Show when={!folder.cover_img_path}>
                <span class="mix-blend-multiply px-2 text-sm font-medium 
														 whitespace-nowrap overflow-hidden relative z-10"
                >
                  {folder.title}
                </span>
              </Show>
            </div>
          </div>
        </ContextMenuTrigger>
        <FolderCardContextMenuContent
          user={user}
          folder={folder}
          refetch={refetch}
          currentPlatform={currentPlatform}
        />
      </ContextMenu>
    </Transition>
  );
};


export default OsFolderCard;

