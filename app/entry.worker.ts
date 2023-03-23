/// <reference lib="WebWorker" />
import { registerRoute, setDefaultHandler } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { BackgroundSyncPlugin } from "workbox-background-sync";

import {
  CachedResponseWillBeUsedCallback,
  HandlerDidErrorCallback,
  CachedResponseWillBeUsedCallbackParam,
  FetchDidSucceedCallback,
  FetchDidSucceedCallbackParam
} from "workbox-core/types";

declare let self: ServiceWorkerGlobalScope;

type WBProps = {
  url: URL;
  request: Request;
  event: Event;
};

/* Plugins */

type RemixLoaderPlugin = {
  cachedResponseWillBeUsed: CachedResponseWillBeUsedCallback;
  handlerDidError: HandlerDidErrorCallback;
  fetchDidSucceed: FetchDidSucceedCallback;
};

// Loader Plugin
const remixLoaderPlugin: RemixLoaderPlugin = {
  fetchDidSucceed: async ({ response }: FetchDidSucceedCallbackParam) => {
    // @ts-ignore
    console.log('manifest', self.__remixManifest)
    return response
  },
  cachedResponseWillBeUsed: async ({
    cachedResponse,
  }: CachedResponseWillBeUsedCallbackParam) => {
    cachedResponse?.headers.set("X-Remix-Worker", "yes");
    return cachedResponse;
  },
  handlerDidError: async () => {
    return new Response(JSON.stringify({ message: "Network Error" }), {
      status: 500,
      statusText: "Internal Server Error",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Remix-Catch": "yes",
        "X-Remix-Worker": "yes",
      },
    });
  },
};

const backgroundSyncPlugin = new BackgroundSyncPlugin('loaderQueue', {
  maxRetentionTime: 2
})

//////////////////////////


function debug(...messages: any[]) {
  if (process.env.NODE_ENV === "development") {
    console.debug(...messages);
  }
}


async function handleInstall(event: ExtendableEvent) {
  debug("Service worker installed");
}

async function handleActivate(event: ExtendableEvent) {
  debug("Service worker activated");
}

function matchAssetRequest({ request }: WBProps) {
  return (
    isMethod(request, ["get"]) &&
    ["/build/", "/icons"].some((publicPath) =>
      request.url.includes(publicPath)
    )
  );
}

function matchDocumentRequest({ request }: WBProps) {
  return isMethod(request, ["get"]) && request.mode === "navigate";
}

function matchLoaderRequest({ request }: WBProps) {
  const url = new URL(request.url);
  return isMethod(request, ["get"]) && url.searchParams.get("_data");
}

// Assets
registerRoute(matchAssetRequest, new CacheFirst({
  cacheName: "assets",
}));

// Loaders
registerRoute(matchLoaderRequest, new NetworkFirst({
  cacheName: "data",
  plugins: [backgroundSyncPlugin, remixLoaderPlugin]
}));

// Documents
registerRoute(matchDocumentRequest, new NetworkFirst({
  cacheName: "pages",
}));

setDefaultHandler(({ request, url }) => {
  return fetch(request.clone())
})

function isMethod(request: Request, methods: string[]) {
  return methods.includes(request.method.toLowerCase());
}

self.addEventListener("install", (event) => {
  event.waitUntil(handleInstall(event).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(handleActivate(event).then(() => self.clients.claim()));
});