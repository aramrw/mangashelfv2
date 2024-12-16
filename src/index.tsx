/* @refresh reload */
import "./App.css";
import { lazy, Suspense } from "solid-js";
import { Router, RouteSectionProps } from "@solidjs/router";
import { render } from "solid-js/web";
import { ColorModeProvider, ColorModeScript } from "@kobalte/core";

const routes = [
  {
    path: "/",
    component: lazy(() => import("./App")),
  },
  {
    path: "/dashboard",
    component: lazy(() => import("./dashboard/dashboard")),
  },
  {
    path: "/library/:folder",
    component: lazy(() => import("./routes/folder-library/library")),
  },
  {
    path: "/settings/:section",
    component: lazy(() => import("./routes/settings/settings")),
  },
  {
    path: "/create-profile",
    component: lazy(() => import("./profile/create-profile")),
  },
  {
    path: "/reader/:folder",
    component: lazy(() => import("./routes/reader/reader")),
  },
];

render(() => (
  <Router
    root={(props: RouteSectionProps<unknown>) => (
      <>
        <ColorModeScript />
        <ColorModeProvider>{props.children}</ColorModeProvider>
      </>
    )}
  >
    {routes}
  </Router>
), document.getElementById("root") as HTMLElement);

