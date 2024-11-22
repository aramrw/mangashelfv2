import { OsFolder, UserType } from "../../models";
import { Accessor, Resource, Setter, Show } from "solid-js";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "../../components/ui/context-menu";
import { Platform } from '@tauri-apps/plugin-os';
import show_in_folder from "../../tauri-cmds/show_in_folder";
import { delete_os_folders, update_os_folders } from "../../tauri-cmds/os_folders";
import { IconBackspace, IconBrandFinder, IconFolderSearch } from "@tabler/icons-solidjs";
import IconHeroEye from "../../main-components/icons/icon-hero-eye";
import IconHeroSlashEye from "../../main-components/icons/icon-hero-slash-eye";


export default function FolderCardContextMenuContent({
  folder,
  user,
  refetch,
  currentPlatform
}: {
  folder: OsFolder;
  user: Accessor<UserType | null> | Resource<UserType | null>;
  refetch: (info?: unknown) => OsFolder[] | Promise<OsFolder[] | null | undefined> | null | undefined
  currentPlatform: Platform;
}) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => show_in_folder(folder.path)}>
        <Show when={currentPlatform === "windows"}
          fallback={
            <div class="flex flex-row justify-center items-center gap-1">
              Open in Finder
              <IconBrandFinder class="h-auto w-4" />
            </div>
          }
        >
          <div class="flex flex-row justify-center items-center gap-1">
            Open in Explorer
            <IconFolderSearch class="h-auto w-5" />
          </div>
        </Show>
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuSubTrigger inset>Edit</ContextMenuSubTrigger>
        <ContextMenuSubContent class="w-fit ml-2">
          <Show when={user && user()}>
            <ContextMenuItem
              onClick={async () => {
                if (user && user() && refetch) {
                  const folderClone = structuredClone(folder);
                  folderClone.is_hidden = !folder.is_hidden;
                  await update_os_folders([folderClone], user()?.id!);
                  refetch();
                }
              }
              }
            >
              <Show when={!folder.is_hidden}
                fallback={
                  <>
                    Unhide
                    <IconHeroEye class="h-auto w-4" />
                  </>
                }
              >
                Hide
                <IconHeroSlashEye class="h-auto w-4" />
              </Show>
            </ContextMenuItem>
            <ContextMenuItem
              onClick={async () => {
                if (user && user() && refetch) {
                  await delete_os_folders([folder], user()?.id!);
                  refetch();
                }
              }}
            >
              Remove
              <IconBackspace class="h-auto w-5" />
            </ContextMenuItem>
          </Show>
        </ContextMenuSubContent>
      </ContextMenuSub >
    </ContextMenuContent >
  )
}
