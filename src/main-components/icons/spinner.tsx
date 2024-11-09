import { IconLoader } from "@tabler/icons-solidjs";
import { DynamicPropsType } from "./icon-type";

export default function Spinner(props: DynamicPropsType) {
  return (
    <IconLoader class={`animate-spin ${props.class}`} onClick={props.onClick} />
  )
}
