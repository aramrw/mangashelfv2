import { Accessor, createSignal, Show } from "solid-js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogAction
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";

interface ErrorAlertProps {
  error: string;
  onClick?: (event: MouseEvent) => void;
}

function ErrorAlert(props: ErrorAlertProps) {
  const [title, ...details] = props.error.split(/:(?![\\\/]|[^:]*[\\\/][^:]*$)/); // Title is the first part, the rest are details
  const [dialogOpen, setDialogOpen] = createSignal<boolean>(true);

  return (
    <AlertDialog open={dialogOpen()}>
      <AlertDialogTrigger />
      <AlertDialogContent class="min-h-40 min-w-40 border-destructive border-2">
        <AlertDialogHeader class="space-y-1">
          <h1 class="mb-4 text-2xl font-semibold bg-destructive w-fit rounded-sm text-destructive-foreground p-1 select-none">Error</h1>
          <AlertDialogTitle class="text-md w-full flex justify-center items-center">
            <code>{title}:</code>
          </AlertDialogTitle>
          <AlertDialogDescription class="font-medium rounded-sm p-2 w-full bg-muted">
            {/* If there are additional parts after the title, map over them */}
            {details.length > 0 ? (
              details.map((detail, index) => (
                <div class="font-bold">{detail}</div>
              ))
            ) : (
              <div>No further details available.</div> // Fallback if no additional details
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Show
            when={props.onClick}
            fallback={
              <Button
                variant="destructive"
                class="min-w-14 bg-destructive text-destructive-foreground hover:bg-primary"
                onClick={() => setDialogOpen(false)}>
                Close
              </Button>
            }>
            <AlertDialogAction onClick={props.onClick}>Continue</AlertDialogAction>
          </Show>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ErrorAlert;

