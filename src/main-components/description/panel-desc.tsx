import { Component } from "solid-js";
import { MangaPanel } from "../../models";
import { bytesToMB, getTitlesFromPath, splitTitleDots } from "./desc-util";

export const MangaPanelDescription: Component<{ panel: () => MangaPanel }> = (props) => {

  const title = splitTitleDots(props.panel().title);

  return (
    <div class="z-50 absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-start justify-between text-white px-2.5 py-1.5 backdrop-blur-sm w-full rounded-sm">
      <div>
        <p class="text-[13px] font-semibold text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 leading-none truncate">
          {getTitlesFromPath(props.panel().parent_path)[0]}
        </p>
        <div class="flex flex-row">
          <p class="text-xl font-semibold text-zinc-100 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 underline">
            {title[0]}
          </p>
          <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
            .{title[1]}
          </p>
        </div>
        <div class="absolute bottom-0 right-0 flex flex-col items-end m-2">
          <p class="text-[12px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 leading-tight">
            {props.panel().update_date}
          </p>
          <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 leading-tight">
            {props.panel().update_time}
          </p>
        </div>
        <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 mt-2">
          {bytesToMB(props.panel().metadata.size)}
        </p>
      </div>
    </div>
  );
};

