import { createResource, createSignal, onMount, Show } from "solid-js";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "../../components/ui/card";
import {
  Tabs,
  //TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
// import {
//   TextField,
//   TextFieldLabel,
//   TextFieldRoot,
// } from "../../components/ui/textfield";
import { useParams, Params } from "@solidjs/router";
import MpvTabSection from "./tab-sections/mpv";
import get_default_user from "../../tauri-cmds/users";
import { UserType } from "../../models";
import { IconAdjustments, IconUserFilled } from "@tabler/icons-solidjs";
import IconMpv from "../../main-components/icons/icon-mpv";
import ProfileTabSection from "./tab-sections/profile";
import SettingsErrorCard from "./tab-sections/error-card";
import NavBar from "../../main-components/navbar";

const handleSettingParams = (params: Params): string[] | string => {
  // example param: mpv_ERROR_Error: This is a test Error.
  const decodedParams = decodeURIComponent(params.section).split("_");

  if (decodedParams.length > 1) {
    // would be ["mpv", "Error: This is a test Error"].
    return [decodedParams[0], decodedParams.slice(2).join("_")];
  }

  // would just be "mpv"
  return decodedParams[0];
}

export default function Settings() {

  const rawParams = useParams();
  const params = handleSettingParams(rawParams);
  const errorMessage = typeof params === "string" ? null : params[1];

  const [selectedTab, setSelectedTab] = createSignal<string>(typeof params === "string" ? params : params[0]);
  const [user] = createResource<UserType | null>(get_default_user);


  return (
    <>
      <NavBar />
      <main class=" w-full h-full pt-10 lg:pt-20 p-3 md:px-16 lg:px-36 xl:px-52 flex flex-col justify-center items-center">
        <header class=" border-2 rounded-t-lg bg-popover py-5 pt-4 px-6 border-b-2 border-muted mb-2 w-full rounded-[3px] shadow-lg">
          <h1 class="text-3xl select-none font-semibold underline flex flex-row justify-start items-center gap-1">
            Settings
            <IconAdjustments class="stroke-[1.7] h-9 w-auto" />
          </h1>
        </header>
        {errorMessage && <SettingsErrorCard message={errorMessage} />}
        <Tabs
          defaultValue="profile"
          class="w-full"
          orientation="vertical"
          value={selectedTab()}
          onChange={setSelectedTab}
          disabled={errorMessage ? true : false}
        >
          <TabsList class="rounded-bl-lg w-40 min-w-20 h-fit">
            <TabsTrigger value="profile">
              Profile
              <IconUserFilled class="w-3 h-auto p-0" />
            </TabsTrigger>
            <TabsTrigger value="mpv">
              mpv
              <IconMpv class="ml-0.5 w-3 stroke-[2.4px]" />
            </TabsTrigger>
            <TabsIndicator />
          </TabsList>
          <Show when={user.latest}>
            <ProfileTabSection user={user.latest!} />
            <MpvTabSection user={user.latest!} />
          </Show>
        </Tabs>
      </main>
    </>
  );
};


