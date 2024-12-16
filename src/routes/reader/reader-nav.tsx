import { IconAdjustments, IconArrowNarrowLeftDashed, IconChalkboard, IconColumns1, IconColumns2 } from "@tabler/icons-solidjs";
import { A, useNavigate } from "@solidjs/router";
import { Accessor, createSignal, onCleanup, onMount, Resource, Setter, Show } from "solid-js";
import { MangaPanel, OsFolder, UserType } from "../../models";
import { NavbarListItem } from "../../main-components/navbar/navbar";
import ThemeSwitcherButton from "../../main-components/theme/theme_switcher_button";

export default function ReaderNavbar({
  user,
  folder,
  parentFolder,
  panels,
  panelIndex,
  isDoublePanels,
  setPanelIndex,
  setCurrentMangaFolder,
  handleSetDoublePanels,
  handleSetFirstPanel,
  handleSetLastPanel,
  handlePrevSinglePanel,
  handlePrevPanel,
  handleNextSinglePanel,
  handleNextPanel,
}: {
  user: Resource<UserType | null>;
  folder: Resource<OsFolder | null>;
  parentFolder: Resource<OsFolder | null>;
  panels: Resource<MangaPanel[] | null>;
  panelIndex: Accessor<number>;
  isDoublePanels: Accessor<boolean>;
  setPanelIndex: Setter<number>,
  setCurrentMangaFolder: Setter<OsFolder | undefined>
  handleSetDoublePanels(): Promise<void>;
  handleSetFirstPanel: () => Promise<void>;
  handleSetLastPanel: () => Promise<void>;
  handlePrevSinglePanel: () => Promise<void>;
  handlePrevPanel: () => Promise<void>;
  handleNextSinglePanel: () => Promise<void>;
  handleNextPanel: () => Promise<void>;
}) {
  const navigate = useNavigate();

  // Define refs for the intervals
  const [zoomInInterval, setZoomInInterval] = createSignal<number | undefined>(undefined);
  const [zoomOutInterval, setZoomOutInterval] = createSignal<number | undefined>(undefined);

  // const handleZoomStart = (type: "magnify" | "minify", setZoom: Setter<number>) => {
  //   // Stop any ongoing zoom intervals before starting a new one
  //   handleZoomStop().then(() => {
  //     const zoomFunction = (type === "magnify")
  //       ? () => setZoom((prev) => Math.min(prev + 1, 900)) // Increase by 1, max zoom 200
  //       : () => setZoom((prev) => Math.max(prev - 1, 1)); // Decrease by 1, min zoom 1
  //
  //     const zoomLoop = () => {
  //       zoomFunction();
  //       if (zoomInInterval()) {
  //         requestAnimationFrame(zoomLoop); // Keep zooming as long as the interval is active
  //       }
  //     };
  //
  //     setZoomInInterval(() => requestAnimationFrame(zoomLoop)); // Start the animation loop
  //   });
  // };

  // const handleZoomStop = async () => {
  //   // Clear the zoom loop
  //   if (zoomInInterval() !== undefined) {
  //     cancelAnimationFrame(zoomInInterval()!);
  //     setZoomInInterval(undefined);
  //   }
  //   if (zoomOutInterval() !== undefined) {
  //     cancelAnimationFrame(zoomOutInterval()!);
  //     setZoomOutInterval(undefined);
  //   }
  //   let newFolder = structuredClone(folder());
  //   if (newFolder && user()?.id) {
  //     newFolder.zoom = currentZoomLevel();
  //     await update_os_folders([newFolder], user()!.id).then(() => {
  //       setCurrentMangaFolder(newFolder);
  //     });
  //   }
  // };


  const keyDownHandler = async (event: KeyboardEvent) => {
    event.preventDefault();  // Prevent default behavior like page navigation on keydown
    event.stopPropagation();  // Stop the event from propagating to other listeners 
    // handleZoomStop()
    // if (event.ctrlKey && event.key === "=") {
    //   setZoom((prev) => prev + 10);
    // } else if (event.ctrlKey && event.key === "-") {
    //   setZoom((prev) => prev - 10);
    // } 
    await handleKeyDown(
      event,
    );
  };


  const handleKeyDown = async (
    event: KeyboardEvent,
  ) => {
    // set first and last panel
    if (event.ctrlKey && event.key === "ArrowRight") {
      await handleSetFirstPanel();
    } else if (event.ctrlKey && event.key === "ArrowLeft") {
      await handleSetLastPanel();
    }
    // previous panels
    else if (event.shiftKey && event.key === "ArrowRight") {
      await handlePrevSinglePanel();
    } else if (event.key === "ArrowRight") {
      if (isDoublePanels()) {
        await handlePrevPanel();
      } else {
        await handlePrevSinglePanel();
      }
    }
    // next panels
    else if (event.shiftKey && event.key === "ArrowLeft") {
      await handleNextSinglePanel();
    } else if (event.key === "ArrowLeft") {
      if (isDoublePanels()) {
        await handleNextPanel();
      } else {
        await handleNextSinglePanel();
      }
    }
    // double panels
    else if (event.key === "p") {
      await handleSetDoublePanels();
    }

    // handle zoom level
    // if (event.ctrlKey && event.key === "=") {
    //   handleZoomStart("magnify", setZoom);
    // } else if (event.ctrlKey && event.key === "-") {
    //   handleZoomStart("minify", setZoom);
    // }
  }

  onMount(() => {
    addEventListener("keydown", keyDownHandler);
  });

  onCleanup(() => {
    removeEventListener("keydown", keyDownHandler);
  });
  onMount(() => {
    addEventListener("keydown", keyDownHandler);

  });

  onCleanup(() => {
    removeEventListener("keydown", keyDownHandler);
    clearInterval(zoomInInterval())
    clearInterval(zoomOutInterval())
  });

  return (
    <nav class="sm:px-2 md:px-16 lg:px-36 xl:px-72 
			w-full min-h-8 bg-primary shadow-md z-[21784895]
			dark:bg-popover"
    >
      <ul class="h-full w-full flex flex-row items-center justify-between relative">
        <div class="w-fit flex flex-row h-full">
          <NavbarListItem
            onClick={() => {
              navigate(-1);
            }}
          >
            <IconArrowNarrowLeftDashed
              class="text-secondary dark:text-secondary-foreground 
							fill-accent stroke-[2]"
            />
          </NavbarListItem>
          <NavbarListItem>
            <A href="/dashboard">
              <IconChalkboard
                class="text-secondary dark:text-secondary-foreground 
										stroke-[1.5]"
              />
            </A>
          </NavbarListItem>

          <NavbarListItem
            onClick={async () =>
              await handleSetDoublePanels()}
          >
            <Show when={isDoublePanels()}
              fallback={
                <IconColumns2
                  class="p-[0.5px] text-secondary dark:text-secondary-foreground stroke-[1.5]"
                />
              }
            >
              <IconColumns1
                class="p-[0.5px] text-secondary dark:text-secondary-foreground stroke-[1.5]"
              />
            </Show>
          </NavbarListItem>
        </div>
        <div class="w-fit flex flex-row h-full">
          <NavbarListItem>
            <ThemeSwitcherButton />
          </NavbarListItem>
          <NavbarListItem>
            <A href="/settings/default">
              <IconAdjustments
                class="
								text-secondary dark:text-secondary-foreground 
								stroke-[1.5]"
              />
            </A>
          </NavbarListItem>
        </div>
      </ul>
    </nav>
  );
}

