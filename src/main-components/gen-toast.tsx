import { toaster } from "@kobalte/core";
import {
  Toast,
  ToastContent,
  ToastDescription,
  ToastProgress,
  ToastTitle,
} from "../components/ui/toast";

const showToast = () => {
  toaster.show((props) => (
    <Toast toastId={props.toastId}>
      <ToastContent>
        <ToastTitle>Scheduled: Catch up</ToastTitle>
        <ToastDescription>
          Friday, February 10, 2023 at 5:57 PM
        </ToastDescription>
      </ToastContent>
      <ToastProgress />
    </Toast>
  ));
};

export default showToast;

