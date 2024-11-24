import { useParams } from "@solidjs/router";
import { Accessor, createEffect, createResource, createSignal, ErrorBoundary, Show } from "solid-js";
import get_os_folder_by_path from "../../tauri-cmds/mpv/get_os_folder_by_path";
import ReaderNavbar from "./reader-nav";
import get_user_by_id from "../../tauri-cmds/get_user_by_id";
import { get_panels } from "../../tauri-cmds/get_panels";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-solidjs";
import { update_os_folders } from "../../tauri-cmds/os_folders";
import { MangaPanel, OsFolder } from "../../models";
import { Transition } from "solid-transition-group";
import { cn } from "../../libs/cn";
import upsert_read_os_dir from "../../tauri-cmds/handle_stale_folder";
import ErrorAlert from "../../main-components/error-alert";
import { Platform, platform } from "@tauri-apps/plugin-os";
import img_err from "../../main-components/img/img_err.jpeg"


export default function MangaReader() {
  const params = useParams();
  const currentPlatform = platform();
  const [folderPath, setFolderPath] = createSignal(decodeURIComponent(params.folder));
  const [currentMangaFolder, { mutate: setCurrentMangaFolder }] = createResource(folderPath, get_os_folder_by_path);
  const [parentFolder] = createResource(() => (currentMangaFolder() ? currentMangaFolder()?.parent_path : null), get_os_folder_by_path);
  const [user] = createResource(() => (currentMangaFolder() ? currentMangaFolder()?.user_id : null), get_user_by_id);

  const [panels, { refetch: refetchPanels }] = createResource(() => (currentMangaFolder() ? currentMangaFolder()?.path : null), get_panels);
  const [panelIndex, setPanelIndex] = createSignal<number>(0);
  const [isDoublePanels, setIsDoublePanels] = createSignal(false);
  const [isfullyHydrated, setIsFullyHydrated] = createSignal(false)
  const [hasInitialized, setHasInitialized] = createSignal(false);

  createEffect(() => {
    console.log(currentMangaFolder());
  });

  // hydrates stale folders
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

  // makes sure everything is ready on startup
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

      if (panelIndex() === panels()!.length - 1) {
        newFolder.is_read = true;
      }

      let foldersToUpdate = [newFolder];

      if (parentFolder.state === "ready" && parentFolder()) {
        let newParentFolder = structuredClone(parentFolder()!);
        // set the last read panel
        newParentFolder.last_read_panel = panels()![panelIndex()];
        // set the folders status as fully read 
        foldersToUpdate.push(newParentFolder);
      }
      setCurrentMangaFolder(newFolder);
      await update_os_folders(foldersToUpdate, user()!.id);
    }
  };

  async function handleSetDoublePanels() {
    // Check if you are NOT on the last panel
    if (currentMangaFolder() && user() && panels() && panelIndex() < panels()?.length! - 1) {
      setIsDoublePanels((prev) => !prev);
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
    if (!panels()) {
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
    if (panels()) {
      setPanelIndex(Math.min(panelIndex() + 2, panels()?.length! - 1));
      await handleUpdateFolders();
    }
  };

  const handleNextSinglePanel = async () => {
    if (panels()) {
      setPanelIndex(Math.min(panelIndex() + 1, panels()?.length! - 1))
      await handleUpdateFolders();
    }
  };

  const handlePrevPanel = async () => {
    if (panels()) {
      // Decrease by 2, but ensure it doesn't go below 0
      setPanelIndex(Math.max(panelIndex() - 2, 0));
    }
    await handleUpdateFolders();
  };

  const handlePrevSinglePanel = async () => {
    if (panels()) {
      // Decrease by 1, but ensure it doesn't go below 0
      setPanelIndex(Math.max(panelIndex() - 1, 0));
    }
    await handleUpdateFolders();
  };

  return (
    <main class={cn("overflow-hidden flex flex-col justify-start relative h-[100dvh] pb-2 will-change-auto",
      currentPlatform === "macos" && "h-full"
    )}>
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
      <ErrorBoundary fallback={
        (err, reset) => <ErrorAlert error={err.toString()} onClick={reset} />
      }>
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
              <div class="h-full w-full flex justify-center items-center pt-0.5">
                <NavigationButtons
                  isLastPanel={() => panelIndex() === panels()?.length! - 1}
                  isFirstPanel={() => panelIndex() === 0}
                  isDoublePanels={isDoublePanels}
                  handleNextPanel={handleNextPanel}
                  handlePrevPanel={handlePrevPanel}
                  handleNextSinglePanel={handleNextSinglePanel}
                  handlePrevSinglePanel={handlePrevSinglePanel}
                  handleSetLastPanel={handleSetLastPanel}
                  handleSetFirstPanel={handleSetFirstPanel}
                />
                <div class="relative flex flex-row justify-center items-center"
                >
                  <div
                    class="w-full h-fit pb-20 text-lg flex justify-center z-50 opacity-0 group hover:opacity-100 transition-opacity duration-300 absolute"
                    style={{
                      top: "0",
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    <h1
                      class="p-1 leading-none truncated w-fit text-center text-nowrap text-secondary bg-primary 
										group-hover:shadow-md group-hover:mix-blend-luminosity
										select-none px-3 h-fit pb-1.5 rounded-b-sm 										
											font-semibold will-change-auto z-50"
                    >
                      {currentMangaFolder()?.title}
                    </h1>
                  </div>

                  {/* Previous Panels - Absolute positioned, opacity 0.01 */}
                  <Show when={PREV_PANELS().first && PREV_PANELS().second && panelIndex() - 2 >= 1}>
                    <Show when={panelIndex() + 1 <= panels()!.length - 1}>
                      <RenderImagePanels
                        component={PREV_PANELS}
                        className="select-none bg-black object-contain max-h-[calc(100vh-37px)] max-w-[calc((100vw-10px)/2)]"
                        isDoublePanels={isDoublePanels}
                      />
                    </Show>
                  </Show>

                  {/* Current Panels - Visible */}
                  <div class="flex flex-row justify-center items-center w-full h-full">
                    {/* Left panel (shown only in double panel mode) */}
                    <Show when={isDoublePanels() && panelIndex() + 1 <= panels()!.length - 1}>
                      <img
                        src={convertFileSrc(CURRENT_PANELS().second?.path!)}
                        alt={CURRENT_PANELS().second?.title}
                        class="select-none 
											 bg-black will-change-auto 
											 object-contain 
											 max-h-[calc(100vh-37px)] max-w-[calc((100vw-10px)/2)] 
											 shadow-[-10px_0_20px_-14px_rgba(0,0,0,0.6)]"  // Shadow only on the outer left
                      />
                    </Show>

                    {/* Right panel (always shown) */}
                    <img
                      src={convertFileSrc(CURRENT_PANELS().first?.path!)}
                      alt={CURRENT_PANELS().first?.title}
                      class={cn(
                        `select-none 
											 bg-black will-change-auto
											 object-contain max-h-[calc(100vh-37px)] 
											 max-w-[calc((100vw-10px)/2)]`,
                        isDoublePanels()
                          ? "shadow-[10px_0_20px_-14px_rgba(0,0,0,0.6)]"
                          : "max-w-[calc((100vw-10px))] shadow-[0_0_20px_-10px_rgba(0,0,0,0.6)]"
                      )}
                      onError={(e) => {
                        e.preventDefault();
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = img_err;
                      }} />
                  </div>

                  {/* ALL Next Panels - Absolute positioned, opacity 0.01 */}
                  <Show when={panelIndex() + 1 <= panels()!.length - 1}>
                    <RenderImagePanels
                      component={NEXT_PANELS}
                      className="select-none bg-black object-contain max-h-[calc(100vh-37px)] max-w-[calc((100vw-10px)/2)]"
                      isDoublePanels={isDoublePanels}
                    />
                  </Show>

                  <div
                    class={cn("w-full h-fit pt-20 flex justify-between items-end text-lg z-50 opacity-0 group hover:opacity-100 transition-opacity duration-300 absolute",
                      !isDoublePanels && "justify-center"
                    )}
                    style={{
                      bottom: "0",
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  >
                    <Show when={isDoublePanels()}>
                      <p class="bg-primary text-sm select-none text-muted font-medium py-1 px-2">
                        {CURRENT_PANELS().second?.title}
                      </p>
                    </Show>
                    <h1
                      class={cn("w-fit flex flex-col text-center text-nowrap text-secondary bg-primary group-hover:shadow-md group-hover:mix-blend-luminosity select-none px-3 h-fit pb-0.5 rounded-t-sm font-semibold will-change-auto z-50",
                        !isDoublePanels() && "rounded-none"
                      )}
                    >
                      {panelIndex() + 1}/{panels()?.length!}
                    </h1>
                    <p class="bg-primary text-sm select-none text-muted font-medium py-1 px-2">
                      {CURRENT_PANELS().first?.title}
                    </p>
                  </div>

                </div>
              </div>
            </Show>
          </Show>
        </Transition>
      </ErrorBoundary>
    </main >
  );
}

interface NavigationButtonsProps {
  isLastPanel: () => boolean;
  isFirstPanel: () => boolean;
  isDoublePanels: () => boolean;
  handleNextPanel: () => Promise<void>;
  handlePrevPanel: () => Promise<void>;
  handleNextSinglePanel: () => Promise<void>;
  handlePrevSinglePanel: () => Promise<void>;
  handleSetLastPanel: () => Promise<void>;
  handleSetFirstPanel: () => Promise<void>;
}

const NavigationButtons = ({
  isLastPanel,
  isFirstPanel,
  isDoublePanels,
  handleNextPanel,
  handlePrevPanel,
  handleNextSinglePanel,
  handlePrevSinglePanel,
  handleSetLastPanel,
  handleSetFirstPanel
}: NavigationButtonsProps) => (
  <>
    {/* Left Button */}
    <div
      class={cn(
        "h-full w-1/4 z-20 absolute left-0 flex items-center cursor-pointer justify-center hover:bg-primary/15 transition-all opacity-0 hover:opacity-30 will-change-auto",
      )}
      onClick={async () => {
        if (isLastPanel()) {
          handleSetLastPanel();
          return;
        }
        if (isDoublePanels()) {
          await handleNextPanel();
        } else {
          await handleNextSinglePanel();
        }
      }}
    >
      <Show when={isLastPanel()}
        fallback={
          <IconChevronLeft class="h-20 md:h-32 lg:h-40 xl:h-56 w-auto bg-primary/10 pl-1 text-primary/50 rounded-md" />
        }
      >
        <IconChevronsLeft class="h-20 md:h-32 lg:h-40 xl:h-56 w-auto bg-primary/15 pl-1 text-primary/50 rounded-md" />

      </Show>
    </div>

    {/* Right Button */}
    <div
      class={cn(
        "h-full w-1/4 z-20 absolute right-0 flex items-center cursor-pointer justify-center hover:bg-primary/15 transition-all opacity-0 hover:opacity-30 will-change-auto",
        isFirstPanel() && "hover:opacity-70"
      )}
      onClick={async () => {
        if (isFirstPanel()) {
          handleSetFirstPanel();
          return;
        }

        if (isDoublePanels()) {
          await handlePrevPanel();
        } else {
          await handlePrevSinglePanel();
        }
      }}
    >
      <Show when={isFirstPanel()}
        fallback={
          <IconChevronRight class="h-20 md:h-32 lg:h-40 xl:h-56 w-auto bg-primary/10 pl-1 text-primary/50 rounded-md" />
        }
      >
        <IconChevronsRight class="h-20 md:h-32 lg:h-40 xl:h-56 w-auto bg-primary/10 pl-1 text-primary/50 rounded-md" />
      </Show>
    </div>
  </>
);

type PanelComponent = {
  first: MangaPanel | undefined;
  second: MangaPanel | null | undefined;
}

const RenderImagePanels = ({
  component,
  className,
  isDoublePanels
}: {
  component: () => PanelComponent
  className: string | undefined;
  isDoublePanels: Accessor<boolean>;
}) => {
  return (
    <div class="absolute left-0 top-0 flex flex-row transition-opacity duration-0 will-change-auto" style={{ opacity: 0.01 }}>
      {/* Left panel (SECOND; shown only in double panel mode) */}
      <Show when={isDoublePanels()}>
        <img
          src={convertFileSrc(component().second?.path!)}
          alt={component().second?.title}
          class={className}
        />
      </Show>
      {/* Right panel (FIRST; always shown) */}
      <img
        src={convertFileSrc(component().first?.path!)}
        alt={component().first?.title}
        class={className}
      />
    </div>

  );
};

