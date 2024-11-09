import { Button } from "../components/ui/button";
import "../App.css";

import {
  Card,
  CardContent,
  CardTitle
} from "../components/ui/card";

import { ImageRoot, ImageFallback, Image } from "../components/ui/image";
import { IconCameraFilled } from "@tabler/icons-solidjs";
import { createSignal, createEffect, For } from "solid-js";
import { UserType, UserFormType } from "../models";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "@solidjs/router";

export default function CreateProfile() {
  const initialUser: UserFormType = { username: "", /* add future fields here */ };
  const [user, setUser] = createSignal<UserFormType>({ ...initialUser });
  const [hasChanges, setHasChanges] = createSignal(false);
  const [isHovering, setIsHovering] = createSignal(false);
  const navigate = useNavigate();

  const handleInputChange = (field: keyof UserFormType, value: string) => {
    setUser(prevUser => ({ ...prevUser, [field]: value }));
  };

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    const dbUser: UserType = {
      id: "1",
      username: user().username,
      settings: {
        user_id: "1",
        autoplay: true,
        update_date: "",
        update_time: "",
      }
    };
    invoke("update_user", { user: dbUser }).then(() => {
      navigate("/dashboard");
    }).catch((e) => {
      console.error("Error updating user:", e);
    });
  };

  createEffect(() => {
    setHasChanges(JSON.stringify(user()) !== JSON.stringify(initialUser));
  });

  return (
    <main class="p-4">
      <Card class="flex flex-col p-4">
        <form onSubmit={handleSubmit} class="flex flex-col items-center justify-center">
          <div class="flex items-center space-x-6">
            <CardTitle class="rounded-sm bg-primary px-1.5 text-xl text-secondary shadow-md">Customize Profile</CardTitle>
            <ImageRoot
              class="relative h-20 w-20 cursor-pointer shadow-md transition-all duration-75 ease-in-out hover:border-2 hover:border-primary"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <Image src="vegeta.png" class="h-20 w-20" />
              {isHovering() && (
                <IconCameraFilled class="absolute left-[27px] top-[27px] text-primary" />
              )}
              <ImageFallback>HN</ImageFallback>
            </ImageRoot>
          </div>

          <CardContent>
            <div class="flex h-fit w-full flex-col">
              <For each={Object.keys(initialUser) as (keyof UserFormType)[]}>
                {(field) => (
                  <div class="flex flex-col">
                    <label for={field} class="ml-0.5 text-sm font-medium text-zinc-200">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <input
                      id={field}
                      name={field}
                      value={user()[field] || ""}
                      onInput={(e) => handleInputChange(field, e.currentTarget.value)}
                      class="rounded-sm border-2 border-zinc-300 px-1 shadow-sm"
                    />
                  </div>
                )}
              </For>
              <Button type="submit" class="mt-3 w-fit shadow-md">
                {hasChanges() ? "Submit" : "Skip"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </main>
  );
}
