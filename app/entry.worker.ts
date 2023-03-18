/// <reference lib="WebWorker" />

import { registerRoute, setDefaultHandler } from "workbox-routing";
import { CacheFirst, NetworkFirst, Strategy } from "workbox-strategies";
import type { StrategyHandler } from "workbox-strategies";

// import {
//   CachedResponseWillBeUsedCallback,
//   HandlerDidErrorCallback,
//   CachedResponseWillBeUsedCallbackParam,
//   RouteHandlerCallbackOptions,
// } from "workbox-core/types";

/* Plugins & Strategies */

// Loader Plugin
// const remixLoaderPlugin: RemixLoaderPlugin = {
//   cachedResponseWillBeUsed: async ({
//     cachedResponse,
//   }: CachedResponseWillBeUsedCallbackParam) => {
//     cachedResponse?.headers.set("X-Remix-Worker", "yes");
//     return cachedResponse;
//   },
//   handlerDidError: async () => {
//     console.log("handler error");
//     return new Response(JSON.stringify({ message: "Network Error" }), {
//       status: 500,
//       statusText: "Internal Server Error",
//       headers: {
//         "Content-Type": "application/json; charset=utf-8",
//         "X-Remix-Catch": "yes",
//         "X-Remix-Worker": "yes",
//       },
//     });
//   },
// };


// Loader Strategy
class NetworkFirstLoader extends Strategy {
  _handle(request: Request, handler: StrategyHandler): Promise<Response> {
    const networkRequest = handler.fetchAndCachePut(request);

    return new Promise((resolve) => {
      networkRequest
        .then((networkResponse) => resolve(networkResponse))
        .catch((_err) => {
          const cacheMatch = handler.cacheMatch(request);

          cacheMatch.then((cachedResponse) => {
            if (cachedResponse) {
              cachedResponse.headers.set('X-Remix-Worker', 'yes')
              resolve(cachedResponse);
            }

            const headers = new Headers();
            headers.set("Content-Type", "application/json; charset=utf-8");
            headers.set("X-Remix-Catch", "yes");
            headers.set("X-Remix-Worker", "yes");

            const errorResponse = new Response(
              JSON.stringify({ message: "Network Error" }),
              {
                status: 500,
                statusText: "Internal Server Error",
                headers,
              }
            );

            resolve(errorResponse);
          });
        })
    });
  }
}

//////////////////////////

type WBProps = {
  url: URL;
  request: Request;
  event: Event;
};

// type RemixLoaderPlugin = {
//   cachedResponseWillBeUsed: CachedResponseWillBeUsedCallback;
//   handlerDidError: HandlerDidErrorCallback;
// };

// type RemixDocumentPlugin = {
//   handlerDidError: HandlerDidErrorCallback;
// };

declare let self: ServiceWorkerGlobalScope;

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
registerRoute(matchAssetRequest, new CacheFirst());

// Loaders
registerRoute(matchLoaderRequest, new NetworkFirstLoader());

// Documents
registerRoute(matchDocumentRequest, new NetworkFirst());

setDefaultHandler(({ request, url }) => {
  console.log(request)
  console.log(url)

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

// self.addEventListener("message", (event) => {
//     event.waitUntil(handleMessage(event));
// });
