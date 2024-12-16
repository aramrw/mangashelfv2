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
  console.debug("HEADER:\n", mainParentFolder());

  return (
    <header
      class="sm:px-4 md:px-[70px] lg:px-30 xl:px-60
			w-full h-fit py-3 px-2 relative will-change overflow-hidden">
      <Show when={mainParentFolder() && mainParentFolder()?.cover_img_path}>
        <div
          class="absolute inset-0 z-0"
          style={{
            "background-image":
              `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),
      url(${mainParentFolder()?.last_read_panel
                ? escapeCSSUrl(
                  convertFileSrc(mainParentFolder()?.last_read_panel?.path!))
                : escapeCSSUrl(
                  convertFileSrc(mainParentFolder()?.cover_img_path!))
              })`,
            "background-size": "cover",
            "background-repeat": "no-repeat",
            "background-position": "start",
            filter: "blur(4.5px)",
          }}
        />
      </Show>
      <h1
        class="
				text-secondary dark:text-secondary-foreground 
				mix-blend-hard-light 
				w-fit font-semibold z-10 relative
				text-2xl px-1 md:text-3xl md:py-0.5
				shadow-2xl rounded-[2px] 
				border-secondary/70 dark:border-secondary-foreground/70 
				border-[1.5px]
				mb-1 backdrop-blur-xl cursor-default"
      >
        {mainParentFolder()?.title}
      </h1>
      <div class="w-fit flex flex-row items-center gap-1">
        <h3
          class="
					text-secondary dark:text-secondary-foreground
					mb-2 w-fit font-semibold z-15 relative
					text-xs px-1 lg:text-md
					bg-transparent mix-blend-luminosity rounded-[2px] 
					border-secondary/50 dark:border-secondary-foreground/50 
					border-[1.5px] shadow-md
					backdrop-blur-lg select-none cursor-default"
        >
          {mainParentFolder()?.update_date}
        </h3>
        <h3
          class="
					text-secondary dark:text-secondary-foreground
					mb-2 w-fit font-semibold z-15 relative
					text-xs px-1 lg:text-md
					bg-transparent mix-blend-luminosity rounded-[2px] 
					border-secondary/50 dark:border-secondary-foreground/50 
					border-[1.5px] shadow-md
					backdrop-blur-lg select-none cursor-default"
        >
          {mainParentFolder()?.update_time}
        </h3>
      </div>
      <Show when={mainParentFolder()?.title && mainParentFolder()?.cover_img_path}>
        <div
          class={cn("relative w-fit flex items-start gap-2 group shadow-lg",
            mainParentFolder()?.last_read_panel && "cursor-pointer")}
          onClick={() => {
            if (mainParentFolder()?.last_read_panel) {
              navigate(`/reader/
								${encodeURIComponent(lastReadMangaFolder()?.path!)}`);
            }
          }}
        >
          <Show
            when={
              mainParentFolder()?.last_read_panel?.path
              && lastReadMangaFolder()}>
            <img
              alt={mainParentFolder()?.title}
              onError={() => { }}
              decoding="async"
              src={
                mainParentFolder()?.last_read_panel?.path
                  ? convertFileSrc(mainParentFolder()?.last_read_panel?.path!)
                  : convertFileSrc(mainParentFolder()?.cover_img_path!)
              }
              class="select-none 
							h-60 md:h-[320px] lg:h-[340px]
              w-auto z-30 
							bg-black object-contain 
              border-transparent border-2 shadow-md"
            />
            <IconBookFilled
              class="
							fill-secondary dark:fill-secondary-foreground 
							bg-primary/80 dark:bg-primary-foreground/80
							rounded-sm group-hover:opacity-0 transition-opacity duration-100
              cursor-pointer h-auto w-[40%] 
							p-1 absolute z-50 shadow-md shadow-black/20"
              style={{
                top: "50%",
                left: "50%",
                // Center the Play button within the image
                transform: "translate(-50%, -50%)",
              }}
            />
            <MangaPanelDescription panel={() =>
              mainParentFolder()?.last_read_panel!}
            />
          </Show>
        </div>
      </Show>
    </header>
  );
}
