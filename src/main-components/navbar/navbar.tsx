import "../../App.css";
import { IconAdjustments, IconArrowNarrowLeftDashed, IconChalkboard, IconDeviceDesktopAnalytics, IconEye, IconEyeX, IconList, IconMenu } from "@tabler/icons-solidjs";
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "../../components/ui/sheet";
import { A, useNavigate } from "@solidjs/router";
import { Accessor, Setter, Show, JSX } from "solid-js";
import ThemeSwitcherButton from ".././theme/theme_switcher_button";
import IconHeroEye from ".././icons/icon-hero-eye";
import IconHeroSlashEye from ".././icons/icon-hero-slash-eye";

export default function NavBar({
  showHiddenFolders,
  setShowHiddenFolders,
}: {
  showHiddenFolders: Accessor<boolean> | undefined;
  setShowHiddenFolders: Setter<boolean> | undefined;
}) {

  const navigate = useNavigate();

  return (
    <nav class="sm:px-2 md:px-16 lg:px-36 xl:px-60 
			w-full h-8 bg-primary shadow-md z-[21784895]
			dark:bg-popover"
    >
      <ul class="h-full w-full flex flex-row 
				items-center justify-between">
        <Sheet>
          <div class="flex flex-row h-full">
            <NavbarListItem
              onClick={() => navigate(-1)}
            >
              <IconArrowNarrowLeftDashed
                class="text-secondary dark:text-secondary-foreground stroke-[2]"
              />
            </NavbarListItem>
            <SheetTrigger class="h-full outline-none">
              <NavbarListItem>
                <IconMenu
                  class="text-secondary dark:text-secondary-foreground stroke-[2]"
                />
              </NavbarListItem>
            </SheetTrigger>
          </div>
          <SheetContent side="top"
            class="p-0 dark:bg-popover h-8 sm:px-2 md:px-16 lg:px-36 xl:px-44  
						flex justify-center items-center border-none">
            <ul class="h-full w-full flex flex-row items-center">
              <NavbarListItem>
                <A href="/dashboard">
                  <IconChalkboard
                    class="text-secondary dark:text-secondary-foreground 
										stroke-[1.5]"
                  />
                </A>
              </NavbarListItem>
              <li
                class="p-1 w-5 h-full flex flex-row justify-center items-center" />
              <Show when={setShowHiddenFolders && showHiddenFolders}>
                <NavbarListItem
                  onClick={() => setShowHiddenFolders!((prev) => !prev)}
                >
                  <Show when={!showHiddenFolders!()}
                    fallback={
                      <IconHeroSlashEye
                        class="h-auto w-6 
												fill-[#f4f4f5] stroke-[1.6]"
                      />
                    }
                  >
                    <IconHeroEye
                      class="h-auto w-6 
											text-secondary dark:text-secondary-foreground stroke-[1.6]"
                    />
                  </Show>
                </NavbarListItem>
              </Show>
              <NavbarListItem>
                <IconList
                  class="text-secondary dark:text-secondary-foreground stroke-[1.9]"
                />
              </NavbarListItem>
            </ul>
          </SheetContent>
        </Sheet>
        <div class="w-fit flex flex-row h-full">
          {/* ------------ theme switcher ------------ */}
          <NavbarListItem>
            <ThemeSwitcherButton />
          </NavbarListItem>
          {/* ------------ stats link ------------ */}
          <NavbarListItem>
            <IconDeviceDesktopAnalytics
              class="text-secondary dark:text-secondary-foreground stroke-[1.5]"
            />
          </NavbarListItem>
          {/* ------------ settings link ------------ */}
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
    </nav >
  );
}


export function NavbarListItem({
  children,
  onClick
}: {
  children: JSX.Element
  onClick?: (e: MouseEvent) => void,
}) {

  return (
    <li class="px-1 h-full flex flex-row 
						justify-center items-center 
						hover:bg-accent transition-colors cursor-pointer"
      onClick={onClick}
    >
      {children}
    </li>
  )
}
