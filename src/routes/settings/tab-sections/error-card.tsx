import { Card, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";

export default function SettingsErrorCard(props: { message: string }) {

  const [errKind, errDesc] = props.message.split(":")

  return (
    <Card class="m-5 absolute top-0 right-0 w-60 shadow-md border border-destructive">
      <CardHeader class="border-none rounded-sm relative">
        <span class="absolute bg-red-500 h-3 w-3 right-[230px] bottom-[90px] rounded-lg animate-ping shadow-md" />
        <CardTitle class="mb-1 no-underline bg-destructive text-destructive-foreground">Error</CardTitle>
        <CardDescription class="text-destructive">
          <h1>{errKind}</h1>
          <p>{errDesc}</p>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
