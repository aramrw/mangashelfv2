import { Component } from "solid-js";
import { MangaPanel } from "../../models";
import { bytesToMB, getTitlesFromPath, splitTitleDots } from "./desc-util";

export const MangaPanelDescription: Component<{ panel: () => MangaPanel }> = (props) => {
  const title = splitTitleDots(props.panel().title);

  return (
    <div
      class="absolute inset-0 z-50 flex flex-col items-start justify-between 
             px-3 py-3.5 w-full rounded-sm bg-black/80 opacity-0 
             group-hover:opacity-100 transition-all duration-100 text-white backdrop-blur-sm"
    >
      <div>
        <p
          class="z-10 w-fit rounded-none px-0.5 text-[13px] leading-none 
                 font-semibold text-zinc-300 bg-transparent mix-blend-difference shadow-2xl"
        >
          {getTitlesFromPath(props.panel().parent_path)[0]}
        </p>
        <div class="flex flex-row">
          <p
            class="z-10 w-fit rounded-none px-0.5 text-xl font-semibold 
                   text-zinc-100 bg-transparent mix-blend-difference shadow-2xl underline"
          >
            {title[0]}
          </p>
          <p
            class="z-10 w-fit rounded-none px-0.5 text-[13px] font-medium 
                   text-zinc-300 bg-transparent mix-blend-difference shadow-2xl"
          >
            .{title[1]}
          </p>
        </div>
        <div class="absolute bottom-0 right-0 m-2 flex flex-col items-end">
          <p
            class="z-10 w-fit rounded-none px-0.5 text-[12px] leading-tight 
                   font-medium text-zinc-300 bg-transparent mix-blend-difference shadow-2xl"
          >
            {props.panel().update_date}
          </p>
          <p
            class="z-10 w-fit rounded-none px-0.5 text-[13px] leading-tight 
                   font-medium text-zinc-300 bg-transparent mix-blend-difference shadow-2xl"
          >
            {props.panel().update_time}
          </p>
        </div>
        <p
          class="z-10 w-fit rounded-none px-0.5 mt-2 text-[13px] font-medium 
                 text-zinc-300 bg-transparent mix-blend-difference shadow-2xl"
        >
          {bytesToMB(props.panel().metadata.size)}
        </p>
      </div>
    </div>
  );
};

