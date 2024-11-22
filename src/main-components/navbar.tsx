import "../App.css";
import { IconAdjustments, IconArrowNarrowLeftDashed, IconChalkboard, IconDeviceDesktopAnalytics, IconEye, IconEyeX, IconList, IconMenu } from "@tabler/icons-solidjs";
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "../components/ui/sheet";
import { A, useNavigate } from "@solidjs/router";
import { Accessor, Setter, Show } from "solid-js";

export default function NavBar({
  showHiddenFolders,
  setShowHiddenFolders,
}: {
  showHiddenFolders: Accessor<boolean>;
  setShowHiddenFolders: Setter<boolean>;
}) {

  const navigate = useNavigate();

  return (
    <nav class="sm:px-2 md:px-16 lg:px-36 xl:px-44 w-full h-8 bg-primary shadow-md z-[100]">
      <ul class="h-full w-full flex flex-row items-center justify-between">
        <Sheet>
          <div class="flex flex-row h-full">
            <li class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer"
              onClick={() => navigate(-1)}
            >
              <IconArrowNarrowLeftDashed class="text-secondary fill-accent stroke-[2]" />
            </li>
            <SheetTrigger class="h-full outline-none">
              <li class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
                <IconMenu class="text-secondary fill-accent stroke-[2]" />
              </li>
            </SheetTrigger>
          </div>
          <SheetContent side="top" class="p-0 sm:px-2 md:px-16 lg:px-36 xl:px-44  flex justify-center items-center border-none">
            <ul class="h-full w-full flex flex-row items-center">
              <li class="p-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
                <A href="/dashboard">
                  <IconChalkboard class="text-secondary fill-accent stroke-[1.5]" />
                </A>
              </li>
              <li class="p-1 w-5 h-full flex flex-row justify-center items-center" />
              <li class="p-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer"
                onClick={() => setShowHiddenFolders((prev) => !prev)}
              >
                <Show when={!showHiddenFolders()}
                  fallback={
                    <IconEyeX class="text-secondary stroke-[1.6]" />
                  }
                >
                  <IconEye class="text-secondary stroke-[1.6]" />
                </Show>
              </li>
              <li class="p-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
                <IconList class="text-secondary fill-accent stroke-[2]" />
              </li>
            </ul>
          </SheetContent>
        </Sheet>
        <div class="w-fit flex flex-row h-full">
          <li class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
            <IconDeviceDesktopAnalytics class="text-secondary fill-accent stroke-[1.5]" />
          </li>
          <li class="px-1 h-full flex flex-row justify-center items-center hover:bg-accent transition-colors cursor-pointer">
            <A href="/settings/default">
              <IconAdjustments class="text-secondary fill-accent stroke-[1.5]" />
            </A>
          </li>
        </div>
      </ul>
    </nav >
  );
}
