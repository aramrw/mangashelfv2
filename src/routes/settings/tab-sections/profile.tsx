import IconMpv from "../../../main-components/icons/icon-mpv";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  TabsContent,
} from "../../../components/ui/tabs";
import {
  TextField,
  TextFieldLabel,
  TextFieldRoot,
} from "../../../components/ui/textfield";
import { IconUserFilled } from "@tabler/icons-solidjs";
import { UserType } from "../../../models";

export default function ProfileTabSection({ user }: { user: UserType | undefined }) {
  return (
      <TabsContent value="profile" class="">
        <Card class="w-full">
          <CardHeader>
            <CardTitle>
              Profile
              <IconUserFilled class="h-4 w-4" />
            </CardTitle>
            <CardDescription>
              Customize your profile.
            </CardDescription>
            {/* <ImageRoot */}
            {/*   class="relative h-20 w-20 cursor-pointer shadow-md transition-all duration-75 ease-in-out hover:border-2 hover:border-primary" */}
            {/*   onMouseEnter={() => setIsHovering(true)} */}
            {/*   onMouseLeave={() => setIsHovering(false)} */}
            {/* > */}
            {/*   <Image src="vegeta.png" class="h-20 w-20" /> */}
            {/*   {isHovering() && ( */}
            {/*     <IconCameraFilled class="absolute left-[27px] top-[27px] text-primary" /> */}
            {/*   )} */}
            {/*   <ImageFallback>HN</ImageFallback> */}
            {/* </ImageRoot> */}
          </CardHeader>
          <CardContent class="">
            <TextFieldRoot class="space-y-1">
              <TextFieldLabel>Name</TextFieldLabel>
              <TextField placeholder={user?.username ? user?.username : ""} />
            </TextFieldRoot>
          </CardContent>
          <CardFooter class="h-5">
            <Button variant="outline" class="text-xs">Save</Button>
          </CardFooter>
        </Card>
      </TabsContent>
  )
}
