import IconMpv from "../../../main-components/icons/icon-mpv";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { TabsContent } from "../../../components/ui/tabs";
import { TextField, TextFieldLabel, TextFieldRoot } from "../../../components/ui/textfield";
import { Switch, SwitchControl, SwitchThumb } from "../../../components/ui/switch";
import { IconFolderSearch } from "@tabler/icons-solidjs";
import { Platform, platform } from "@tauri-apps/plugin-os";
import { open as openShell } from "@tauri-apps/plugin-shell";
import { open } from "@tauri-apps/plugin-dialog";
import { UserType } from "../../../models";
import { appDataDir as getAppDataDir, join } from "@tauri-apps/api/path";
import { Accessor, createResource, createSignal, onCleanup, onMount, Setter, Show } from "solid-js";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import Spinner from "../../../main-components/icons/spinner";
import update_user from "../../../tauri-cmds/update-user";

export default function MpvTabSection({ user }: { user: UserType }) {
  console.log(user);

  const [appDataDir] = createResource<string>(getAppDataDir);
  const [downloadPercent, setDownloadPercent] = createSignal<number>(0);
  const currentPlatform = platform();

  // onCleanup must be called from the root
  // so you have to pass the unlisten function up from onMount
  let unlisten: UnlistenFn | null;

  onMount(async () => {
    unlisten = await listen("progress", (event) => {
      if (typeof event.payload === "number") {
        setDownloadPercent(event.payload as number);
      }
    });
  });

  onCleanup(() => {
    if (unlisten) {
      unlisten();
    }
  });

  return (
    <TabsContent value="mpv">
      <Card>
        <CardHeader>
          <CardTitle>
            <IconMpv class="w-4 stroke-[2.4px]" />
            mpv Settings
          </CardTitle>
          <CardDescription class="flex flex-col gap-2 items-start">
            Tweak mpv player's config, plugins, behavior, & more.
            <DownloadMpvAlertDialog user={user} platform={currentPlatform} downloadPercent={downloadPercent} setDownloadPercent={setDownloadPercent} />
          </CardDescription>
        </CardHeader>
        <CardContent class="w-fit">
          <div class="flex flex-row justify-center sm:justify-start items-center gap-x-4 flex-wrap">
            <FilePickerTextField platform={currentPlatform} label={"Config"} extensions={["config"]} defaultPath={appDataDir.latest!} />
            <Show when={appDataDir.latest}>
              <TextFieldRoot class="">
                <TextFieldLabel>Plugins</TextFieldLabel>
                <div class="flex flex-row justify-center items-center">
                  <TextField class="rounded-r-none z-10 ml-0" placeholder={user.settings.plugins_path ? user.settings.plugins_path : appDataDir.latest} />
                  <Button
                    variant="outline"
                    class=" border border-l-0 rounded-none rounded-r-sm p-0"
                    onClick={async () => {
                      const dir = await open({
                        defaultPath: await join(appDataDir.latest!, "plugins"),
                        directory: true,
                        title: "Plugins",
                      });
                    }}
                  >
                    <IconFolderSearch class="p-[3.5px] stroke-[1.9px]" />
                  </Button>
                </div>
              </TextFieldRoot>
            </Show>
          </div>
          <FilePickerTextField
            platform={currentPlatform}
            label={"mpv"}
            extensions={["exe"]}
            filterName={"mpv"}
            placeholder={user.settings.mpv_path}
            defaultPath={user.settings.mpv_path ? user.settings.mpv_path : appDataDir.latest}
          />
          <Switch checked={user.settings.autoplay} class="w-fit shadow-sm my-3 flex flex-row justify-between items-center gap-2 rounded-sm p-2 border">
            <label class="font-medium text-xs">Autoplay</label>
            <SwitchControl>
              <SwitchThumb />
            </SwitchControl>
          </Switch>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

function FilePickerTextField({
  platform,
  label,
  extensions,
  defaultPath,
  filterName,
  placeholder,
}: {
  platform: Platform;
  label: string;
  extensions: string[];
  defaultPath?: string;
  filterName?: string;
  placeholder?: string;
}) {
  return (
    <TextFieldRoot class="">
      <TextFieldLabel>{label}</TextFieldLabel>
      <div class="w-fit flex flex-row justify-center items-center">
        <TextField class="z-10 rounded-r-none" placeholder={placeholder} />
        <Button
          variant="outline"
          class="border border-l-0 rounded-none rounded-r-sm p-0"
          onClick={async () => {
            const file = await open({
              defaultPath,
              title: label,
              filters: [
                {
                  name: filterName ? filterName : "",
                  extensions,
                },
              ],
            });
          }}
        >
          <IconFolderSearch class="p-[3.5px] stroke-[1.9px]" />
        </Button>
      </div>
    </TextFieldRoot>
  );
}

function DownloadMpvAlertDialog({
  user,
  platform,
  downloadPercent,
  setDownloadPercent,
}: {
  user: UserType;
  platform: Platform;
  downloadPercent: Accessor<number>;
  setDownloadPercent: Setter<number>;
}) {
  const [isOpen, setIsOpen] = createSignal(false); // Track the open state

  const handleDownload = async () => {
    setIsOpen(true);
    let downloadPath = await invoke("download_mpv_binary");

    const newUser: UserType = {
      ...user,
      settings: {
        ...user.settings,
        mpv_path: downloadPath as string,
      },
    };

    await update_user(newUser);
    setIsOpen(false);
    setDownloadPercent(0);
  };

  return (
    <>
      <AlertDialog open={isOpen()} onOpenChange={setIsOpen}>
        <AlertDialogTrigger>
          <Button variant="outline" class="text-xs p-0.5 px-1">
            Download mpv
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent class="bg-popover" data-open={isOpen() ? "true" : "false"}>
          <AlertDialogHeader>
            <AlertDialogTitle class="underline w-fit">
              <Show when={downloadPercent() > 0} fallback="Download mpv Player?">
                Downloading mpv Player for ({platform}).
              </Show>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Show
                when={!downloadPercent() && downloadPercent() === 0}
                fallback={
                  <>
                    <span>Downloading to your system's appdata folder, please wait...</span>
                    <br />
                    <span class="px-1 text-lg mt-1 rounded-sm bg-muted">{downloadPercent()} %</span>
                  </>
                }
              >
                mpv shelf can download, install, & manage mpv for you.
                <br />
                <span class="text-primary">How would you like to continue?</span>
              </Show>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Show
            when={downloadPercent() === 0}
            fallback={
              <div class="w-full flex justify-end">
                <Spinner />
              </div>
            }
          >
            <AlertDialogFooter>
              <AlertDialogClose
                onClick={() => {
                  setIsOpen(false); // Close the dialog on Manual
                  openShell("https://mpv.io/installation/");
                }}
              >
                Manual
              </AlertDialogClose>
              <Button onClick={handleDownload}>Automatic</Button>
            </AlertDialogFooter>
          </Show>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
