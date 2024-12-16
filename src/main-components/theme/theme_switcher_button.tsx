import { Show } from "solid-js";
import { useColorMode } from "@kobalte/core";
import { IconSunFilled } from "@tabler/icons-solidjs";
import IconHeroMoon from "../icons/icon-hero-moon";

const ThemeSwitcherButton = () => {
  const { colorMode, setColorMode } = useColorMode();

  const toggleTheme = () => {
    setColorMode(colorMode() === "dark" ? "light" : "dark");
  };

  return (
    <div onClick={toggleTheme}>
      <Show when={colorMode() === "dark"}
        fallback={(
          <IconHeroMoon
            class="w-6 h-6 fill-secondary"
          />
        )}
      >
        <IconSunFilled
        />
      </Show>
    </div>
  );
};

export default ThemeSwitcherButton;

