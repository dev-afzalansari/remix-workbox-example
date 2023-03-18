import * as React from "react";
import type { MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useMatches,
  useCatch
} from "@remix-run/react";

import styles from "./styles/index.css";

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "New Remix App",
  viewport: "width=device-width,initial-scale=1",
});

let isMount = true;

export default function App() {
  // let location = useLocation();
  // let matches = useMatches();

  // function isPromise(p: any): boolean {
  //   if (typeof p === "object" && typeof p.then === "function") {
  //     return true;
  //   }

  //   return false;
  // }

  // React.useEffect(() => {
  //   let mounted = isMount;
  //   isMount = false;

  //   if ("serviceWorker" in navigator) {
  //     if (navigator.serviceWorker.controller) {
  //       navigator.serviceWorker.controller?.postMessage({
  //         type: "REMIX_NAVIGATION",
  //         isMount: mounted,
  //         location,
  //         matches: matches.filter((route) => {
  //           if (route.data) {
  //             return (
  //               Object.values(route.data!).filter((elem) => {
  //                 return isPromise(elem);
  //               }).length === 0
  //             );
  //           }
  //           return true;
  //         }),
  //         manifest: window.__remixManifest,
  //       });
  //     } else {
  //       let listener = async () => {
  //         await navigator.serviceWorker.ready;
  //         navigator.serviceWorker.controller?.postMessage({
  //           type: "REMIX_NAVIGATION",
  //           isMount: mounted,
  //           location,
  //           matches: matches.filter((route) => {
  //             if (route.data) {
  //               return (
  //                 Object.values(route.data!).filter((elem) => {
  //                   return isPromise(elem);
  //                 }).length === 0
  //               );
  //             }
  //             return true;
  //           }),
  //           manifest: window.__remixManifest,
  //         });
  //       };
  //       navigator.serviceWorker.addEventListener("controllerchange", listener);
  //       return () => {
  //         navigator.serviceWorker.removeEventListener(
  //           "controllerchange",
  //           listener
  //         );
  //       };
  //     }
  //   }
  // }, [location, matches]);

  return (
    <html lang="en">
      <head>
        <Meta />
        <link rel="manifest" href="/resources/manifest.webmanifest" />
        <link rel="stylesheet" href={styles} />
        <LinkExample />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

function LinkExample() {
  return (
    <>
      <link
        rel="apple-touch-icon"
        sizes="57x57"
        href="/icons/apple-icon-57x57.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="60x60"
        href="/icons/apple-icon-60x60.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="72x72"
        href="/icons/apple-icon-72x72.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="76x76"
        href="/icons/apple-icon-76x76.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="114x114"
        href="/icons/apple-icon-114x114.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="120x120"
        href="/icons/apple-icon-120x120.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="144x144"
        href="/icons/apple-icon-144x144.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="152x152"
        href="/icons/apple-icon-152x152.png"
      />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/icons/apple-icon-180x180.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="192x192"
        href="/icons/android-icon-192x192.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/icons/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="96x96"
        href="/icons/favicon-96x96.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/icons/favicon-16x16.png"
      />
    </>
  );
}


export function CatchBoundary() {
  const caught = useCatch()

  return <div>
    <h1>Something Went Wrong</h1>
    <h2>Server responded with {caught.status} {caught.statusText} {caught.data.message}</h2>
  </div>
}

export function ErrorBoundary({ error }: { error: any}) {
  console.log(error)
  return <div>
    <h1>{error.message}</h1>
  </div>
}