import { convertFileSrc } from "@tauri-apps/api/core";
import { createResource, Show } from "solid-js";
import { OsFolder, UserType } from "../../models";
import play_video from "../../tauri-cmds/mpv/play_video";
import get_os_folder_by_path from "../../tauri-cmds/mpv/get_os_folder_by_path";
import { useNavigate } from "@solidjs/router";
import { IconBook, IconBookFilled } from "@tabler/icons-solidjs";

export default function ({ mainParentFolder, user }: { mainParentFolder: OsFolder, user: UserType }) {

  const navigate = useNavigate();
  const FILE_SRC_LWV_COVER_IMG_PATH = convertFileSrc(mainParentFolder?.cover_img_path!);
  const [lastReadMangaFolder] = createResource(
    () => mainParentFolder.last_read_panel ? mainParentFolder.last_read_panel?.parent_path : null,
    get_os_folder_by_path
  );

  return (
    <header class="sm:px-2 md:px-16 lg:px-30 xl:px-40 w-full h-fit py-3 px-2 relative">
      <Show when={mainParentFolder}>
        <div
          class="absolute inset-0 z-0"
          style={{
            "background-image":
              `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),url(${FILE_SRC_LWV_COVER_IMG_PATH})`,
            "background-size": "cover",
            "background-repeat": "no-repeat",
            "background-position": "center",
            filter: "blur(6px)",
          }}
        />
      </Show>
      <h1 class="text-secondary/70 bg-transparent mix-blend-luminosity w-fit font-semibold z-10 relative text-medium md:text-xl 
        lg:text-2xl shadow-2xl rounded-none px-0.5 border-secondary/70 border-2 mb-1">
        {mainParentFolder?.title}
      </h1>
      <div class="w-fit flex flex-row items-center gap-1">
        <h2 class="text-secondary/50 mb-2 text-xs w-fit font-semibold z-15 relative 
					bg-transparent mix-blend-luminosity rounded-none border-secondary/50 border-[1.5px] px-1 shadow-md">
          {mainParentFolder?.update_date}
        </h2>
        <h3 class="text-secondary/50 mb-2 text-xs w-fit font-semibold z-15 relative 
					bg-transparent mix-blend-luminosity rounded-none border-secondary/50 border-[1.5px] px-1 shadow-md">
          {mainParentFolder?.update_time}
        </h3>
      </div>
      <div class="relative w-fit flex items-start gap-2"> {/* Flex container for the image and SVG */}
        <Show when={mainParentFolder.title && mainParentFolder.cover_img_path}>
          <img
            alt={mainParentFolder?.title}
            src={mainParentFolder?.last_read_panel?.path ? convertFileSrc(mainParentFolder.last_read_panel.path) : FILE_SRC_LWV_COVER_IMG_PATH}
            class="select-none h-72 md:h-[320px] object-contain lg:h-[400px] 
              w-auto z-30 rounded-none bg-black 
              border-transparent border-2 shadow-md"
          />
          <Show when={mainParentFolder?.last_read_panel?.path}>
            <IconBookFilled
              class="text-secondary fill-secondary bg-primary/50 rounded-sm hover:opacity-50 transition-all
              cursor-pointer h-auto w-[40%] p-1 mix-blend-multiply absolute z-50 shadow-md shadow-primary/20"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)' // Center the Play button within the image
              }}
              onClick={() => {
                if (lastReadMangaFolder.state === "ready") {
                  navigate(`/reader/${encodeURIComponent(lastReadMangaFolder()?.path!)}`)
                }
              }}
            />
          </Show>
        </Show>
      </div>
    </header>
  );
}

