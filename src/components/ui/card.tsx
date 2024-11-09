import { cn } from "../../libs/cn.ts";
import type { ComponentProps, ParentComponent } from "solid-js";
import { splitProps } from "solid-js";

export const Card = (props: ComponentProps<"div">) => {
	const [local, rest] = splitProps(props, ["class"]);

	return (
		<div
			class={cn(
				"rounded-sm rounded-t-none rounded-r-lg border-2 bg-card text-card-foreground shadow",
				local.class,
			)}
			{...rest}
		/>
	);
};

export const CardHeader = (props: ComponentProps<"div">) => {
	const [local, rest] = splitProps(props, ["class"]);

	return (
		<div class={cn("rounded-tr-lg shadow-md flex flex-col space-y-0.5 px-4 py-3", local.class)} {...rest} />
	);
};

export const CardTitle: ParentComponent<ComponentProps<"h1">> = (props) => {
	const [local, rest] = splitProps(props, ["class"]);

	return (
		<h1
			class={cn("select-none flex flex-row items-center gap-0.5 w-fit px-1 rounded-sm font-semibold leading-none tracking-tight text-lg", local.class)}
			{...rest}
		/>
	);
};

export const CardDescription: ParentComponent<ComponentProps<"h3">> = (
	props,
) => {
	const [local, rest] = splitProps(props, ["class"]);

	return (
		<h3 class={cn("select-none text-sm text-muted-foreground font-medium w-fit px-0.5 rounded-sm", local.class)} {...rest} />
	);
};

export const CardContent = (props: ComponentProps<"div">) => {
	const [local, rest] = splitProps(props, ["class"]);

	return <div class={cn("p-6 pt-2", local.class)} {...rest} />;
};

export const CardFooter = (props: ComponentProps<"div">) => {
	const [local, rest] = splitProps(props, ["class"]);

	return (
		<div class={cn("flex items-center p-6 pt-0 rounded-sm", local.class)} {...rest} />
	);
};
