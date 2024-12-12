import { Component, Show } from "solid-js";
import { IconBookFilled } from "@tabler/icons-solidjs";
import { OsFolder } from "../../models";
import { bytesToMB, getTitlesFromPath, splitTitleDots } from "./desc-util";
import IconHeroSlashEye from "../icons/icon-hero-slash-eye";

export const OsFolderDescription: Component<{ folder: () => OsFolder }> = (props) => {

  const [lrp_title, lrp_ext] = splitTitleDots(props.folder()?.last_read_panel?.title);

  return (
    <div class="z-50 absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-start justify-between text-white px-2.5 py-1.5 backdrop-blur-sm w-full rounded-sm p-3">
      <div>
        <div class="flex flex-col">
          <div class="flex flex-row text-md xl:text-xl font-semibold text-zinc-100 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 underline">
            {props.folder().title}
            <Show when={props.folder().is_read}>
              <IconBookFilled class="h-4 transition-all duration-300 fill-secondary/80" />
            </Show>
            <Show when={props.folder().is_hidden}>
              <IconHeroSlashEye class="h-4 transition-all duration-300 fill-secondary/80" />
            </Show>
          </div>
          <div class="flex flex-row">
            <p class="text-sm font-semibold text-zinc-100 mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
              {lrp_title}
            </p>
            <p class="text-xs font-medium text-zinc-300 mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
              .{lrp_ext}
            </p>
            <p class="text-[13px] text-center font-medium text-zinc-300mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
              / {props.folder().metadata?.contains.files}
            </p>
          </div>

          <div class="mt-1">
            <Show when={props.folder().metadata?.contains.folders > 0}>
              <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
                {props.folder().metadata?.contains.folders} dirs
              </p>
            </Show>
            <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
              {bytesToMB(props.folder().metadata?.size)}
            </p>
          </div>
        </div>
        <div class="absolute bottom-0 right-0 flex flex-col items-end m-2">
          <p class="text-[12px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 leading-tight">
            {props.folder().update_date}
          </p>
          <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 leading-tight">
            {props.folder().update_time}
          </p>
        </div>
      </div>
    </div>
  );
};

