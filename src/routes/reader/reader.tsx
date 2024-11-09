import { useParams } from "@solidjs/router"
import { createEffect, createResource, createSignal, onCleanup, onMount, Resource, Setter, Show, Suspense } from "solid-js";
import get_os_folder_by_path from "../../tauri-cmds/mpv/get_os_folder_by_path";
import ReaderNavbar from "./reader-nav";
import get_user_by_id from "../../tauri-cmds/get_user_by_id";
import { get_panels } from "../../tauri-cmds/get_panels";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-solidjs";
import { update_os_folders } from "../../tauri-cmds/os_folders";
import { cn } from "../../libs/cn";
import { MangaPanel, OsFolder } from "../../models";

export default function MangaReader() {

  const params = useParams();
  const folderPath = () => decodeURIComponent(params.folder).replace(/\)$/, "");
  const [currentMangaFolder] = createResource(folderPath, get_os_folder_by_path);
  const [parentFolder] = createResource(
    () => currentMangaFolder() ? currentMangaFolder()?.parent_path : null,
    get_os_folder_by_path
  );
  const [user] = createResource(
    () => currentMangaFolder() ? currentMangaFolder()?.user_id : null,
    get_user_by_id
  );

  const [panels] = createResource(() => currentMangaFolder() ? currentMangaFolder()?.path : null, get_panels)
  const [panelIndex, setPanelIndex] = createSignal<number>(0);
  const [isDoublePanels, setIsDoublePanels] = createSignal<boolean>(false);
  const CURRENT_PANELS = () => ({
    first: panels()?.[panelIndex()],
    second: panels()?.[panelIndex() + 1]
  });

  const NEXT_PANELS = () => ({
    first: panels()?.[panelIndex() + (isDoublePanels() ? 2 : 1)],
    second: panels()?.[panelIndex() + (isDoublePanels() ? 3 : 2)]
  });

  const PREV_PANELS = () => ({
    first: panels()?.[panelIndex() - (isDoublePanels() ? 2 : 1)],
    second: panels()?.[panelIndex() - (isDoublePanels() ? 1 : 0)]
  });

  const [zoom, setZoom] = createSignal<number>(0);

  // sets the current panel on startup
  createEffect(() => {
    if (currentMangaFolder.state === "ready" && panels.state === "ready") {
      setZoom(currentMangaFolder()?.zoom!);
      setIsDoublePanels(currentMangaFolder()?.is_double_panels!);
      for (let i = 0; i < panels()!.length; i++) {
        if (panels()![i].path === currentMangaFolder()?.last_read_panel?.path) {
          setPanelIndex(i);
          break;
        }
      }
    }
  });

  createEffect(async () => {
    if (panelIndex() && panels.state === "ready") {
      let newFolder = structuredClone(currentMangaFolder()!);
      newFolder.last_read_panel = panels()![panelIndex()];

      let foldersToUpdate = [newFolder];

      if (parentFolder.state === "ready" && parentFolder()) {
        let newParentFolder = structuredClone(parentFolder()!);
        newParentFolder.last_read_panel = panels()![panelIndex()];
        foldersToUpdate.push(newParentFolder);
      }

      await update_os_folders(foldersToUpdate, user()!.id).then(() => {
        console.log("updating manga folder & parent folder");
      });
    }
  });

  async function handleSetDoublePanels() {
    setIsDoublePanels((prev) => !prev);
    if (currentMangaFolder.state === "ready" && user.state === "ready") {
      let newFolder = structuredClone(currentMangaFolder());
      newFolder!.is_double_panels = isDoublePanels();
      await update_os_folders([newFolder!], user()!.id).then(() => {
        console.log("updating double panels to ", isDoublePanels());
      })
    }
  }

  return (
    <main class="overflow-hidden relative h-[100dvh]">
      <Show when={currentMangaFolder()}>
        <Show when={panels() && user()}>
          <ReaderNavbar
            user={user()!}
            folder={currentMangaFolder()!}
            panels={panels()!}
            panelIndex={panelIndex}
            isDoublePanels={isDoublePanels}
            currentZoomLevel={zoom}
            setZoom={setZoom}
            setPanelIndex={setPanelIndex}
            handleSetDoublePanels={handleSetDoublePanels}
          />
          <div class="h-full w-full flex justify-center items-center pb-8">
            <div class="h-[96.6%] lg:px-4 xl:px-10 w-auto z-20 absolute left-0 flex items-center cursor-pointer 
							justify-center hover:bg-primary/15 transition-all opacity-0 hover:opacity-80"
              onClick={() => {
                if (panels.state === "ready") {
                  if (isDoublePanels()) {
                    handleNextPanel(panels.latest!, panelIndex(), setPanelIndex);
                  } else {
                    handleNextSinglPanel(panels.latest!, panelIndex(), setPanelIndex);
                  }
                }
              }}
            >
              <IconChevronLeft class="h-20 md:h-28 w-auto bg-primary/10 pr-1 text-primary/50 " />
            </div>
            <div class="h-[96.6%] lg:px-4 xl:px-10 w-auto z-20 absolute right-0 flex items-center cursor-pointer
							justify-center hover:bg-primary/15 transition-all opacity-0 hover:opacity-80"
              onClick={() => {
                if (panels.state === "ready") {
                  if (isDoublePanels()) {
                    handlePrevPanel(panelIndex(), setPanelIndex);
                  } else {
                    handlePrevSinglePanel(panelIndex(), setPanelIndex);
                  }
                }
              }}
            >
              <IconChevronRight class="h-20 md:h-28 w-auto bg-primary/10 pl-1 text-primary/50 " />
            </div>
            <div class="relative flex flex-row justify-center items-center">
              {/* Previous Panels - Absolute positioned, opacity 0 */}
              <div
                class="absolute left-0 top-0 flex transition-opacity duration-0"
                style={{ opacity: 0.01 }}
              >
                <img
                  src={convertFileSrc(PREV_PANELS().first?.path!)}
                  alt={PREV_PANELS().first?.title}
                  class={cn("select-none shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black",
                    isDoublePanels() ? "block" : "w-0"
                  )}
                  style={{
                    height: `${zoom()}px`,
                    width: "auto",
                  }}
                />
                <img
                  src={convertFileSrc(PREV_PANELS().second?.path!)}
                  alt={PREV_PANELS().second?.title}
                  class="select-none shadow-[10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black"
                  style={{
                    height: `${zoom()}px`,
                    width: "auto",
                  }}
                />
              </div>

              {/* Current Panels - Visible */}
              <div class="flex transition-opacity duration-0" style={{ opacity: 1 }}>
                <img
                  src={convertFileSrc(CURRENT_PANELS().first?.path!)}
                  alt={CURRENT_PANELS().first?.title}
                  class={cn("select-none shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black",
                    isDoublePanels() ? "block" : "w-0"
                  )}
                  style={{
                    height: `${zoom()}px`,
                    width: "auto",
                  }}
                />
                <img
                  src={convertFileSrc(CURRENT_PANELS().second?.path!)}
                  alt={CURRENT_PANELS().second?.title}
                  class="select-none shadow-[10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black"
                  style={{
                    height: `${zoom()}px`,
                    width: "auto",
                  }}
                />
              </div>

              {/* Next Panels - Absolute positioned, opacity 0 */}
              <div
                class="absolute left-0 top-0 flex transition-opacity duration-0"
                style={{ opacity: 0.01 }}
              >
                <img
                  src={convertFileSrc(NEXT_PANELS().first?.path!)}
                  alt={NEXT_PANELS().first?.title}
                  class={cn("select-none shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black",
                    isDoublePanels() ? "block" : "w-0"
                  )}
                  style={{
                    height: `${zoom()}px`,
                    width: "auto",
                  }}
                />
                <img
                  src={convertFileSrc(NEXT_PANELS().second?.path!)}
                  alt={NEXT_PANELS().second?.title}
                  class="select-none shadow-[10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black"
                  style={{
                    height: `${zoom()}px`,
                    width: "auto",
                  }}
                />
              </div>
            </div>
            <h2
              class="select-none text-accent/35 font-medium px-3 py-1"
              style={{
                position: "absolute",
                bottom: "0",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              {panelIndex()}/{panels()?.length! + 1}
            </h2>
            <p class="text-sm select-none absolute right-0 bottom-0 text-muted font-medium px-3 py-1">
              {CURRENT_PANELS().first?.title}
            </p>
            <Show when={isDoublePanels()}>
              <p class="text-sm select-none absolute left-0 bottom-0 text-muted font-medium px-3 py-1">
                {CURRENT_PANELS().second?.title}
              </p>
            </Show>
          </div>
        </Show>
      </Show>
    </main >
  );
}


export const handleNextPanel = (
  panels: MangaPanel[],
  panelIndex: number,
  setPanelIndex: Setter<number>,
) => {
  if (panelIndex + 2 <= panels.length - 1) {
    setPanelIndex((prev) => prev + 2);
  }
};

export const handleNextSinglPanel = (
  panels: MangaPanel[],
  panelIndex: number,
  setPanelIndex: Setter<number>,
) => {
  if (panelIndex + 1 <= panels.length - 1) {
    setPanelIndex((prev) => prev + 1);
  }
};

export const handlePrevPanel = (
  panelIndex: number,
  setPanelIndex: Setter<number>,
) => {
  if (panelIndex - 2 === -1) {
    setPanelIndex(0);
  } else if (panelIndex - 2 > -1) {
    setPanelIndex((prev) => prev - 2);
  }
};

export const handlePrevSinglePanel = (
  panelIndex: number,
  setPanelIndex: Setter<number>,
) => {
  if (panelIndex - 1 > -1) {
    setPanelIndex((prev) => prev - 1);
  }
};




