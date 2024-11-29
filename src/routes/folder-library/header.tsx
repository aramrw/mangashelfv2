import { convertFileSrc } from "@tauri-apps/api/core";
import { Resource, Show } from "solid-js";
import { OsFolder, UserType } from "../../models";
import { useNavigate } from "@solidjs/router";
import { IconBookFilled } from "@tabler/icons-solidjs";
import { cn } from "../../libs/cn";
import { MangaPanelDescription } from "../../main-components/description/panel-desc";

export function escapeCSSUrl(url: string) {
  return url.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export default function ({
  mainParentFolder,
  user,
  lastReadMangaFolder,
}: {
  mainParentFolder: Resource<OsFolder | null>;
  user: Resource<UserType | null>;
  lastReadMangaFolder: Resource<OsFolder | null>;
}) {
  const navigate = useNavigate();

  return (
    <header class="sm:px-2 md:px-16 lg:px-30 xl:px-40 w-full h-fit py-3 px-2 relative will-change">
      <Show when={mainParentFolder() && mainParentFolder()?.cover_img_path}>
        <div
          class="absolute inset-0 z-0"
          style={{
            "background-image": `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),
						url(${
              mainParentFolder()?.last_read_panel
                ? escapeCSSUrl(convertFileSrc(mainParentFolder()?.last_read_panel?.path!))
                : escapeCSSUrl(convertFileSrc(mainParentFolder()?.cover_img_path!))
            })`,
            "background-size": "cover",
            "background-repeat": "no-repeat",
            "background-position": "start",
            filter: "blur(6px)",
          }}
        />
      </Show>
      <h1
        class="text-secondary/100 mix-blend-hard-light w-fit font-semibold z-10 relative
				text-2xl px-1 md:text-3xl md:py-0.5
				shadow-2xl rounded-[2px] border-secondary/70 border-2 mb-1 backdrop-blur-xl cursor-default"
      >
        {mainParentFolder()?.title}
      </h1>
      <div class="w-fit flex flex-row items-center gap-1">
        <h2
          class="text-secondary mb-2 w-fit font-semibold z-15 relative
					text-xs px-1 lg:text-md
					bg-transparent mix-blend-luminosity rounded-[2px]  border-secondary/50 border-[1.5px] shadow-md
					backdrop-blur-lg select-none cursor-default"
        >
          {mainParentFolder()?.update_date}
        </h2>
        <h3
          class="text-secondary mb-2 w-fit font-semibold z-15 relative
					text-xs px-1 lg:text-md
					bg-transparent mix-blend-luminosity rounded-[2px] border-secondary/50 border-[1.5px] shadow-md
					backdrop-blur-lg select-none cursor-default"
        >
          {mainParentFolder()?.update_time}
        </h3>
      </div>
      <Show when={mainParentFolder()?.title && mainParentFolder()?.cover_img_path}>
        <div
          class={cn("relative w-fit flex items-start gap-2 group", mainParentFolder()?.last_read_panel && "cursor-pointer")}
          onClick={() => {
            if (mainParentFolder()?.last_read_panel) {
              navigate(`/reader/${encodeURIComponent(lastReadMangaFolder()?.path!)}`);
            }
          }}
        >
          <Show when={mainParentFolder()?.last_read_panel?.path && lastReadMangaFolder()}>
            <img
              alt={mainParentFolder()?.title}
              onError={() => {}}
              src={
                mainParentFolder()?.last_read_panel?.path
                  ? convertFileSrc(mainParentFolder()?.last_read_panel?.path!)
                  : convertFileSrc(mainParentFolder()?.cover_img_path!)
              }
              class="select-none h-72 md:h-[320px] object-contain lg:h-[400px]
              w-auto z-30 bg-black
              border-transparent border-2 shadow-md"
            />
            <IconBookFilled
              class="text-secondary fill-secondary bg-primary/80 rounded-sm group-hover:opacity-0 transition-opacity duration-300
              cursor-pointer h-auto w-[40%] p-1 absolute z-50 shadow-md shadow-primary/20"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)", // Center the Play button within the image
              }}
            />
            <MangaPanelDescription panel={() => mainParentFolder()?.last_read_panel!} />
          </Show>
        </div>
      </Show>
    </header>
  );
}
