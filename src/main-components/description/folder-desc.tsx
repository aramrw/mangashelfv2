import { Component, Show } from "solid-js";
import { IconBookFilled, IconFolder, IconFolderFilled } from "@tabler/icons-solidjs";
import { OsFolder } from "../../models";
import { bytesToMB, splitTitleDots } from "./desc-util";
import IconHeroSlashEye from "../icons/icon-hero-slash-eye";

export const OsFolderDescription: Component<{ folder: () => OsFolder }> = (props) => {

  const [lrp_title, lrp_ext] = splitTitleDots(props.folder()?.last_read_panel?.title);

  return (
    <div
      class="z-50 absolute inset-0 bg-black/80 opacity-0 
			group-hover:opacity-100 transition-all duration-75 
			flex flex-col items-start justify-between text-white 
			px-2.5 py-1.5 backdrop-blur-sm w-ful p-2.5 will-change-auto">
      <div class="flex flex-col">
        <div
          class="flex flex-row text-md xl:text-xl 
						font-semibold text-zinc-100 bg-transparent mix-blend-difference 
						w-fit z-10 shadow-2xl px-0.5 underline will-change"
        >
          {props.folder().title}
          <Show when={props.folder().is_read}>
            <IconBookFilled
              class="h-4 transition-all duration-75 fill-secondary/80 dark:fill-secondary-foreground/80"
            />
          </Show>
          <Show when={props.folder().is_hidden}>
            <IconHeroSlashEye
              class="h-4 transition-all duration-75 
								fill-secondary/80 dark:fill-secondary-foreground/80
							"
            />
          </Show>
        </div>
        <div class="flex flex-row">
          <p
            class="text-sm font-semibold text-zinc-100 
							mix-blend-difference w-fit z-10 shadow-2xl px-0.5">
            {lrp_title}
          </p>
          <p class="text-xs font-medium text-zinc-300 
							mix-blend-difference w-fit z-10 shadow-2xl px-0.5">
            .{lrp_ext}
          </p>
          {/*      <p */}
          {/*        class="text-[13px] text-center font-medium text-zinc-300 container */}
          {/* mix-blend-difference w-fit z-10 shadow-2xl px-0.5"> */}
          {/*        / {props.folder().metadata?.contains.files} */}
          {/*      </p> */}
        </div>

        <div class="mt-1">
          <Show when={props.folder().metadata?.contains.folders > 0}>
            <p
              class="text-[13px] font-medium text-zinc-300 bg-transparent 
								mix-blend-difference w-fit z-10 shadow-2xl px-0.5
								flex flex-row justify-center items-start
							">
              {props.folder().metadata?.contains.folders}
              <IconFolderFilled
                class="h-auto w-3 pl-0.5" />
            </p>
          </Show>
          <p class="text-[13px] font-medium text-zinc-300 
							bg-transparent mix-blend-difference 
							w-fit z-10 shadow-2xl px-0.5">
            {bytesToMB(props.folder().metadata?.size)}
          </p>
        </div>
      </div>
      <div class="absolute bottom-0 right-0 flex flex-col items-end m-2">
        <p
          class="text-[12px] font-medium text-zinc-300 
						bg-transparent 
						mix-blend-difference w-fit z-10 shadow-2xl
						px-0.5 leading-tight">
          {props.folder().update_date}
        </p>
        <p
          class="text-[13px] font-medium text-zinc-300 
						bg-transparent 
						mix-blend-difference w-fit z-10 shadow-2xl 
						px-0.5 leading-tight">
          {props.folder().update_time}
        </p>
      </div>
    </div>
  );
};

