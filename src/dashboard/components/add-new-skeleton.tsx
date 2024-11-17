import { IconFilePlus, IconFolderPlus, IconPlus } from "@tabler/icons-solidjs";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { open } from '@tauri-apps/plugin-dialog';
import { OsFolder, UserType } from "../../models";
import { Accessor, Setter } from "solid-js";
import { Transition } from "solid-transition-group";
import upsert_read_os_dir from "../../tauri-cmds/handle_stale_folder";

const AddNewSkeleton = ({
  user,
  refetch,
}: {
  user: Accessor<UserType | null>,
  refetch: (info?: unknown) => OsFolder[] | Promise<OsFolder[] | undefined> | null | undefined;
}
) => {
  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 600
        });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 600
        });
        a.finished.then(done);
      }}
    >

      <Popover placement="right-start">
        <PopoverTrigger class="h-fit">
          <div class="
						w-fit relative flex items-center justify-center 
						hover:opacity-50 transition-opacity cursor-pointer duration-100 ease-in-out">
            <div
              class="
							h-32 w-24 
							sm:h-44 sm:w-32 
							md:h-48 md:w-36 
							lg:h-64 lg:w-48
							xl:h-80 xl:w-56 
							rounded-sm shadow-md bg-white"
            />
            <IconPlus
              class="
							w-9 h-9 
							sm:h-11 sm:w-11 
							md:h-14 md:w-14 
							lg:h-20 lg:w-20 
							xl:h-24 xl:w-24 
							absolute text-zinc-300 
							fill-red-500 stroke-[1.8] 
							top-0 bottom-0 left-0 right-0 m-auto" />
          </div>
        </PopoverTrigger>
        <PopoverContent class="p-0 bg-transparent border-none shadow-none text-sm flex flex-col justify-center items-center font-medium">
          <ul class="w-fit h-full flex flex-col gap-1">
            <li class="bg-white p-1 rounded-sm shadow-md flex flex-row justify-center items-center w-fit gap-0.5 hover:opacity-50 transition-opacity duration-100 ease-in-out cursor-pointer"
              onClick={() => {
                open({ directory: true }).then((dir_path) => {
                  if (dir_path) {
                    upsert_read_os_dir(dir_path, user()!.id, undefined).then(() => {
                      refetch();
                    });
                  }
                });
              }}
            >
              <IconFolderPlus
                class="
								w-6 h-6 sm:h-8 
								sm:w-8 md:h-9 md:w-9 
								lg:w-10 lg:h-10 
								text-primary fill-zinc-500 stroke-[2.2]"
              />
            </li>
            <li class="bg-white p-1 rounded-sm shadow-md flex flex-row justify-center items-center w-fit gap-0.5 hover:opacity-50 transition-opacity duration-100 ease-in-out cursor-pointer"
            >
              <IconFilePlus
                class="
								w-6 h-6 
								sm:h-8 sm:w-8 
								md:h-9 md:w-9 
								lg:h-10 lg:w-10 
								text-primary fill-zinc-500 stroke-[2.2]"
              />
            </li>
          </ul>
        </PopoverContent>
      </Popover>
    </Transition>
  );
};

export default AddNewSkeleton;

