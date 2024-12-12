import { IconLoader, IconLoader2, IconLoader3 } from "@tabler/icons-solidjs";
import { DynamicPropsType } from "./icon-type";

export default function Spinner(props: DynamicPropsType) {
  return (
    <IconLoader2 class={`animate-spin ${props.class}`} onClick={props.onClick} />
  )
}
