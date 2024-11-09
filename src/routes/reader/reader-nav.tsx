import { IconAdjustments, IconArrowNarrowLeftDashed, IconChalkboard, IconColumns2, IconDeviceDesktopAnalytics, IconList, IconMenu, IconZoomIn, IconZoomOut } from "@tabler/icons-solidjs";
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "../../components/ui/sheet";
import { A, useNavigate } from "@solidjs/router";
import { Accessor, createSignal, onCleanup, onMount, Setter } from "solid-js";
import { MangaPanel, OsFolder, UserType } from "../../models";
import { invoke } from "@tauri-apps/api/core";
import { update_os_folders } from "../../tauri-cmds/os_folders";
import { handleNextPanel, handleNextSinglPanel, handlePrevPanel, handlePrevSinglePanel } from "./reader";

export default function ReaderNavbar({
  user,
  folder,
  panels,
  panelIndex,
  isDoublePanels,
  currentZoomLevel,
  setZoom,
  setPanelIndex,
  handleSetDoublePanels
}: {
  user: UserType;
  folder: OsFolder;
  panels: MangaPanel[];
  panelIndex: Accessor<number>;
  isDoublePanels: Accessor<boolean>;
  currentZoomLevel: Accessor<number>;
  setZoom: Setter<number>;
  setPanelIndex: Setter<number>,
  handleSetDoublePanels(): Promise<void>;
}) {

  console.log(folder);

  const navigate = useNavigate();

  // Define refs for the intervals
  const [zoomInInterval, setZoomInInterval] = createSignal<number | undefined>(undefined);
  const [zoomOutInterval, setZoomOutInterval] = createSignal<number | undefined>(undefined);

  const handleZoomStart = (
    type: "magnify" | "minify",
    setZoom: Setter<number>,
  ) => {
    handleZoomStop();  // Stop any ongoing zoom intervals before starting a new one
    if (type === "magnify") {
      setZoomInInterval(window.setInterval(() => {
        setZoom((prev) => prev + 10);
      }, 80));
    } else {
      setZoomOutInterval(window.setInterval(() => {
        setZoom((prev) => prev - 10);
      }, 80));
    }
  };

  const handleZoomStop = async () => {
    if (zoomInInterval() !== undefined) {
      clearInterval(zoomInInterval()!);
      setZoomInInterval(undefined);
    }
    if (zoomOutInterval() !== undefined) {
      clearInterval(zoomOutInterval()!);
      setZoomOutInterval(undefined);
    }
    let newFolder = structuredClone(folder);
    newFolder.zoom = currentZoomLevel();
    await update_os_folders([newFolder], user.id);
  };


  const keyDownHandler = async (event: KeyboardEvent) => {
    handleZoomStop()
    if (event.ctrlKey && event.key === "=") {
      setZoom((prev) => prev + 10); // Zoom in by 10 units
    } else if (event.ctrlKey && event.key === "-") {
      setZoom((prev) => prev - 10); // Zoom out by 10 units
    } else {
      // Other keybinds handling as before
      await handleKeyDown(
        event,
        panels,
        panelIndex(),
        isDoublePanels(),
        setPanelIndex,
        setZoom,
        handleSetDoublePanels,
        handleZoomStart
      );
    }
  };

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
    <nav class="md:px-[115px] lg:px-[148px] xl:px-[200px] w-full h-8 bg-primary shadow-md z-[100]">
      <ul class="h-full w-full flex flex-row items-center justify-between">
        <div class="w-fit flex flex-row h-full">
          <li class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer"
            onClick={() => navigate(-1)}
          >
            <IconArrowNarrowLeftDashed class="text-secondary fill-accent stroke-[2]" />
          </li>
          <li class="p-1 w-5 h-full flex flex-row justify-center items-center">
          </li>
          <li
            class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer"
            onClick={async () => await handleSetDoublePanels()}
          >
            <IconColumns2 class="text-secondary fill-accent stroke-[1.5]" />
          </li>
          <li
            class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer"
            onMouseDown={() => handleZoomStart("minify", setZoom)}
            onMouseUp={() => handleZoomStop()}
            onMouseLeave={() => handleZoomStop()}
          >
            <IconZoomOut class="text-secondary fill-accent stroke-[1.5]" />
          </li>
          <li
            class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer"
            onMouseDown={() => handleZoomStart("magnify", setZoom)}
            onMouseUp={() => handleZoomStop()}
            onMouseLeave={() => handleZoomStop()}
          >
            <IconZoomIn class="text-secondary fill-accent stroke-[1.5]" />
          </li>
        </div>
        <li class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
          <A href="/settings/default">
            <IconAdjustments class="text-secondary fill-accent stroke-[1.5]" />
          </A>
        </li>
      </ul>
    </nav>
  );
}

const handleKeyDown = async (
  event: KeyboardEvent,
  panels: MangaPanel[],
  panelIndex: number,
  isDoublePanels: boolean,
  setPanelIndex: Setter<number>,
  setZoom: Setter<number>,
  handleSetDoublePanels: () => Promise<void>,
  handleZoomStart: (type: "magnify" | "minify", setZoom: Setter<number>) => void
) => {
  // set first and last panel
  if (event.ctrlKey && event.key === "ArrowRight") {
    //handleSetFirstPanel();
  } else if (event.ctrlKey && event.key === "ArrowLeft") {
    //handleSetLastPanel();
  }
  // previous panels
  else if (event.shiftKey && event.key === "ArrowRight") {
    handlePrevSinglePanel(panelIndex, setPanelIndex);
  } else if (event.key === "ArrowRight") {
    if (isDoublePanels) {
      handlePrevPanel(panelIndex, setPanelIndex);
    } else {
      handlePrevSinglePanel(panelIndex, setPanelIndex);
    }
  }
  // next panels
  else if (event.shiftKey && event.key === "ArrowLeft") {
    handleNextSinglPanel(panels, panelIndex, setPanelIndex);
  } else if (event.key === "ArrowLeft") {
    if (isDoublePanels) {
      handleNextPanel(panels, panelIndex, setPanelIndex);
    } else {
      handleNextSinglPanel(panels, panelIndex, setPanelIndex);
    }
  }
  // double panels
  else if (event.key === "p") {
    await handleSetDoublePanels();
  }

  // handle zoom level
  if (event.ctrlKey && event.key === "=") {
    handleZoomStart("magnify", setZoom);
  } else if (event.ctrlKey && event.key === "-") {
    handleZoomStart("minify", setZoom);
  }
}



