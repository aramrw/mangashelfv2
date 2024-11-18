import { useParams } from "@solidjs/router";
import { Accessor, createEffect, createResource, createSignal, Show } from "solid-js";
import get_os_folder_by_path from "../../tauri-cmds/mpv/get_os_folder_by_path";
import ReaderNavbar from "./reader-nav";
import get_user_by_id from "../../tauri-cmds/get_user_by_id";
import { get_panels } from "../../tauri-cmds/get_panels";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-solidjs";
import { update_os_folders } from "../../tauri-cmds/os_folders";
import { OsFolder } from "../../models";
import { Transition } from "solid-transition-group";
import { cn } from "../../libs/cn";
import upsert_read_os_dir from "../../tauri-cmds/handle_stale_folder";
import ErrorAlert from "../../main-components/error-alert";

export default function MangaReader() {
  const params = useParams();
  const [folderPath, setFolderPath] = createSignal(decodeURIComponent(params.folder));
  const [currentMangaFolder, { mutate: setCurrentMangaFolder }] = createResource(folderPath, async (folderPath) => {
    try {
      return await get_os_folder_by_path(folderPath);
    } catch (error) {
      SetError("FAILED TO LOAD PANELS:" + (error instanceof Error ? error : "Unknown error"));
      return null; // return null or an empty object in case of an error
    }
  }); const [parentFolder] = createResource(() => (currentMangaFolder() ? currentMangaFolder()?.parent_path : null), get_os_folder_by_path);
  const [user] = createResource(() => (currentMangaFolder() ? currentMangaFolder()?.user_id : null), get_user_by_id);

  const [panels, { refetch: refetchPanels }] = createResource(() => (currentMangaFolder() ? currentMangaFolder()?.path : null), get_panels);
  const [panelIndex, setPanelIndex] = createSignal<number>(0);
  const [isDoublePanels, setIsDoublePanels] = createSignal(false);
  const [isfullyHydrated, setIsFullyHydrated] = createSignal(false)
  const [hasInitialized, setHasInitialized] = createSignal(false);
  const [error, SetError] = createSignal<string | null>(null);

  createEffect(async () => {
    if (
      !isfullyHydrated()
      && folderPath()
      && currentMangaFolder()
      && user()
      && panels()
    ) {
      const is_refetch = await upsert_read_os_dir(
        currentMangaFolder()?.path!,
        currentMangaFolder()?.parent_path,
        user()?.id!,
        undefined,
        panels()!
      );
      if (is_refetch) {
        console.log("the panels are stale, refetching...");
        await refetchPanels();
      }
      setIsFullyHydrated(true);
    }
  });

  createEffect(() => {
    if (currentMangaFolder.state === "ready" && panels.state === "ready" && !hasInitialized() && isfullyHydrated()) {
      // Set zoom and double panels from the current folder
      setIsDoublePanels(currentMangaFolder()?.is_double_panels!);

      // Find the panel index based on last read panel path
      for (let i = 0; i < panels()!.length; i++) {
        if (panels()![i].path === currentMangaFolder()?.last_read_panel?.path) {
          setPanelIndex(i);
          //handleUpdateFolders();
          break;
        }
      }

      // Mark initialization as complete so this effect doesn't run again
      setHasInitialized(true);
    }
  });


  const CURRENT_PANELS = () => ({
    // For right-to-left reading, the "first" (right) panel is the current index
    first: panels()?.[panelIndex()],
    // The "second" (left) panel is the next index in double panel mode
    second: isDoublePanels() ? panels()?.[panelIndex() + 1] : null,
  });

  const NEXT_PANELS = () => ({
    // Next panels move forward by 2 if in double panel mode, 1 if in single
    first: panels()?.[panelIndex() + (isDoublePanels() ? 2 : 1)],
    second: isDoublePanels() ? panels()?.[panelIndex() + 3] : null,
  });

  const PREV_PANELS = () => ({
    // Previous panels move backward by 2 if in double panel mode, 1 if in single
    first: panels()?.[panelIndex() - (isDoublePanels() ? 2 : 1)],
    second: isDoublePanels() ? panels()?.[panelIndex() - 1] : null,
  });



  const handleUpdateFolders = async () => {
    if (currentMangaFolder.state === "ready" && panelIndex() !== undefined && panels.state === "ready" && user.state === "ready") {
      let newFolder = structuredClone(currentMangaFolder()!);
      newFolder.last_read_panel = panels()![panelIndex()];

      let foldersToUpdate = [newFolder];

      if (parentFolder.state === "ready" && parentFolder()) {
        let newParentFolder = structuredClone(parentFolder()!);
        newParentFolder.last_read_panel = panels()![panelIndex()];
        foldersToUpdate.push(newParentFolder);
      }
      setCurrentMangaFolder(newFolder);
      await update_os_folders(foldersToUpdate, user()!.id);
    }
  };

  async function handleSetDoublePanels() {
    setIsDoublePanels((prev) => !prev);
    if (currentMangaFolder.state === "ready" && user.state === "ready") {
      let newFolder = structuredClone(currentMangaFolder());
      if (newFolder) {
        newFolder.is_double_panels = isDoublePanels();
        await update_os_folders([newFolder], user()!.id).then(() => {
          setCurrentMangaFolder(newFolder);
        });
      }
    }
  }

  const handleSetFirstPanel = async () => {
    if (panelIndex() === 0) {
      let prev: OsFolder | null = null;
      try {
        prev = await invoke("get_prev_folder", { parentPath: parentFolder()?.path, currentFolder: currentMangaFolder() });
      } catch {
        // prolly nothing important
      }
      if (prev && prev.path !== currentMangaFolder()?.path) {
        setFolderPath(prev.path);
        setHasInitialized(false);
        await handleUpdateFolders();
      }
    } else {
      setPanelIndex(0);
      await handleUpdateFolders();
    }
  };

  const handleSetLastPanel = async () => {
    if (panels.state !== "ready") {
      return;
    }

    let panelLen = panels()!.length - 1;
    if (panelIndex() === panelLen) {
      let next: OsFolder | null = null;
      try {
        next = await invoke("get_next_folder", { parentPath: parentFolder()?.path, currentFolder: currentMangaFolder() });
      } catch {
        // prolly nothin important
      }
      if (next && next.path !== currentMangaFolder()?.path) {
        setFolderPath(next.path);
        setHasInitialized(false);
      }
    } else {
      setPanelIndex(panelLen);
      await handleUpdateFolders();
    }
  };

  const handleNextPanel = async () => {
    if (panels.state === "ready" && panelIndex() + 2 <= panels()!.length - 1) {
      setPanelIndex((prev) => prev + 2);
      await handleUpdateFolders();
    }
  };

  const handleNextSinglePanel = async () => {
    if (panels.state === "ready" && panelIndex() + 1 <= panels()!.length - 1) {
      setPanelIndex((prev) => prev + 1);
      await handleUpdateFolders();
    }
  };

  const handlePrevPanel = async () => {
    if (panels.state === "ready") {
      // Decrease by 2, but ensure it doesn't go below 0
      const newIndex = Math.max(panelIndex() - 2, 0);
      setPanelIndex(newIndex);
    }
    await handleUpdateFolders();
  };

  const handlePrevSinglePanel = async () => {
    if (panels.state === "ready") {
      // Decrease by 1, but ensure it doesn't go below 0
      const newIndex = Math.max(panelIndex() - 1, 0);
      setPanelIndex(newIndex);
    }
    await handleUpdateFolders();
  };

  return (
    <main class="overflow-hidden relative h-[100dvh]" >
      <ReaderNavbar
        user={user}
        folder={currentMangaFolder}
        parentFolder={parentFolder}
        panels={panels}
        panelIndex={panelIndex}
        isDoublePanels={isDoublePanels}
        setPanelIndex={setPanelIndex}
        setCurrentMangaFolder={setCurrentMangaFolder}
        handleSetDoublePanels={handleSetDoublePanels}
        handleSetFirstPanel={handleSetFirstPanel}
        handleSetLastPanel={handleSetLastPanel}
        handlePrevSinglePanel={handlePrevSinglePanel}
        handlePrevPanel={handlePrevPanel}
        handleNextSinglePanel={handleNextSinglePanel}
        handleNextPanel={handleNextPanel}
      />
      <Show when={error()}>
        <ErrorAlert error={error as Accessor<string>} />
      </Show>
      <Transition
        appear={true}
        onEnter={(el, done) => {
          const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700 });
          a.finished.then(done);
        }}
        onExit={(el, done) => {
          const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600 });
          a.finished.then(done);
        }}
      >
        <Show when={currentMangaFolder.state === "ready"}>
          <Show when={panels.state === "ready" && user.state === "ready"}>
            <div class="h-full w-full flex justify-center items-center pb-8">
              <div
                class="h-[96.6%] w-1/4 z-20 absolute left-0 flex items-center cursor-pointer
							justify-center hover:bg-primary/15 transition-all opacity-0 hover:opacity-30"
                onClick={async () => {
                  if (isDoublePanels()) {
                    await handleNextPanel();
                  } else {
                    await handleNextSinglePanel();
                  }
                }}
              >
                <IconChevronLeft class="h-20 md:h-28 w-auto bg-primary/10 pr-1 text-primary/50 " />
              </div>
              <div
                class="h-[96.6%] w-1/4 z-20 absolute right-0 flex items-center cursor-pointer
							justify-center hover:bg-primary/15 transition-all opacity-0 hover:opacity-30"
                onClick={async () => {
                  if (isDoublePanels()) {
                    await handlePrevPanel();
                  } else {
                    await handlePrevSinglePanel();
                  }
                }}
              >
                <IconChevronRight class="h-20 md:h-28 w-auto bg-primary/10 pl-1 text-primary/50 " />
              </div>
              <h2
                class="text-nowrap text-secondary rounded-b-sm hover:shadow-md hover:shadow-primary/15
								select-none font-medium px-3 z-50 h-fit pb-0.5 opacity-0
								hover:opacity-100 hover:bg-primary transition-all duration-300"
                style={{
                  position: "absolute",
                  top: "29px",
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                {currentMangaFolder()?.title}
              </h2>

              <div class="relative flex flex-row justify-center items-center"
              >
                {/* Previous Panels - Absolute positioned, opacity 0.01 */}
                <Show when={PREV_PANELS().first && PREV_PANELS().second && panelIndex() - 2 >= 1}>
                  <div class="absolute left-0 top-0 flex transition-opacity duration-0" style={{ opacity: 0.01 }}>
                    {/* Left panel (shown only in double panel mode) */}
                    <Show when={isDoublePanels()}>
                      <img
                        src={convertFileSrc(PREV_PANELS().second?.path!)}
                        alt={PREV_PANELS().second?.title}
                        class="select-none 
												shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black 
												object-contain max-h-[calc(100vh-37px)] max-w-[calc(100vw-50px)]"
                      />
                    </Show>
                    {/* Right panel (always shown) */}
                    <img
                      src={convertFileSrc(PREV_PANELS().first?.path!)}
                      alt={PREV_PANELS().first?.title}
                      class="select-none 
											shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black 
											object-contain max-h-[calc(100vh-37px)] max-w-[calc(100vw-50px)]"
                    />
                  </div>
                </Show>

                {/* Current Panels - Visible */}
                <div class="flex flex-row justify-center items-center w-full h-full">
                  {/* Left panel (shown only in double panel mode) */}
                  <Show when={isDoublePanels() && panelIndex() + 1 <= panels()!.length - 1}>
                    <img
                      src={convertFileSrc(CURRENT_PANELS().second?.path!)}
                      alt={CURRENT_PANELS().second?.title}
                      class="select-none 
												shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black 
												object-contain max-h-[calc(100vh-37px)] 
												max-w-[calc((100vw-10px)/2)]"  // Half the screen width
                    />
                  </Show>

                  {/* Right panel (always shown) */}
                  <img
                    src={convertFileSrc(CURRENT_PANELS().first?.path!)}
                    alt={CURRENT_PANELS().first?.title}
                    class={cn(`select-none 
											shadow-[10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black 
											object-contain max-h-[calc(100vh-37px)] 
											max-w-[calc((100vw-10px)/2)]`,
                      !isDoublePanels() && "max-w-[calc((100vw-10px))]"
                    )}
                  />
                </div>
                {/* Next Panels - Absolute positioned, opacity 0.01 */}
                <Show when={panelIndex() + 1 <= panels()!.length - 1}>
                  <div class="absolute left-0 top-0 flex transition-opacity duration-0" style={{ opacity: 0.01 }}>
                    {/* Left panel (shown only in double panel mode) */}
                    <Show when={isDoublePanels()}>
                      <img
                        src={convertFileSrc(NEXT_PANELS().second?.path!)}
                        alt={NEXT_PANELS().second?.title}
                        class="select-none 
												shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black 
												object-contain max-h-[calc(100vh-37px)] max-w-[calc(100vw-50px)]"
                      />
                    </Show>
                    {/* Right panel (always shown) */}
                    <img
                      src={convertFileSrc(NEXT_PANELS().first?.path!)}
                      alt={NEXT_PANELS().first?.title}
                      class="select-none 
												shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.6)] bg-black 
												object-contain max-h-[calc(100vh-37px)] max-w-[calc(100vw-50px)]"
                    />
                  </div>
                </Show>
              </div>
              <h2
                class="rounded-t-sm hover:shadow-md hover:shadow-primary select-none text-accent/35 font-medium px-3 py-1 hover:text-secondary hover:bg-primary transition-all duration-300"
                style={{
                  position: "absolute",
                  bottom: "0",
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                {panelIndex()}/{panels()?.length! - 1}
              </h2>
              <p class="text-sm select-none absolute right-0 bottom-0 text-muted font-medium px-3 py-1">{CURRENT_PANELS().first?.title}</p>
              <Show when={isDoublePanels()}>
                <p class="text-sm select-none absolute left-0 bottom-0 text-muted font-medium px-3 py-1">{CURRENT_PANELS().second?.title}</p>
              </Show>
            </div>
          </Show>
        </Show>
      </Transition>
    </main>
  );
}
