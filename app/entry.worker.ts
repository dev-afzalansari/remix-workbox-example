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

const PAGES = 'page-cache-v1'
const DATA = 'data-cache-v1'
const ASSETS = 'assets-cache-v1'

/* Plugins */

type RemixLoaderPlugin = {
  cachedResponseWillBeUsed: CachedResponseWillBeUsedCallback;
  handlerDidError: HandlerDidErrorCallback;
  fetchDidSucceed: FetchDidSucceedCallback;
};

function debug(...messages: any[]) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(...messages);
  }
}

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
  maxRetentionTime: 60 * 24,
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        const replayedResponse = await fetch(entry.request.clone());
        const dataCache = await caches.open(DATA)
        await dataCache.put(entry.request, replayedResponse.clone())

        debug(
          `Request for '${entry.request.url}' ` +
            `has been replayed in queue '${queue.name}'`,
        );
      } catch (error) {
        await queue.unshiftRequest(entry);

        debug(
          `Request for '${entry.request.url}' ` +
            `failed to replay, putting it back in queue '${queue.name}'`,
        );
      }
    }
    debug(
      `All requests in queue '${queue.name}' have successfully ` +
        `replayed; the queue is now empty!`,
    );
  }
})

//////////////////////////



async function handleInstall(event: ExtendableEvent) {
  debug("Service worker installed");
}

async function handleActivate(event: ExtendableEvent) {
  debug("Service worker activated");
}

const handlePush = async (event: PushEvent) => {
  const data = JSON.parse(event?.data!.text());
  const title = data.title ? data.title : "Remix PWA";

  const options = {
    body: data.body ? data.body : "Notification Body Text",
    icon: data.icon ? data.icon : "/icons/android-icon-192x192.png",
    badge: data.badge ? data.badge : "/icons/android-icon-48x48.png",
    dir: data.dir ? data.dir : "auto",
    image: data.image ? data.image : undefined,
    silent: data.silent ? data.silent : false,
  };

  self.registration.showNotification(title, {
    ...options,
  });
};

async function handleMessage(event: ExtendableMessageEvent) {
  const cachePromises: Map<string, Promise<void>> = new Map();

  if (event.data.type === "REMIX_NAVIGATION") {
    const { isMount, location, matches, manifest } = event.data;
    const documentUrl = location.pathname + location.search + location.hash;

    const [dataCache, documentCache, existingDocument] = await Promise.all([
      caches.open(DATA),
      caches.open(PAGES),
      caches.match(documentUrl),
    ]);

    if (!existingDocument || !isMount) {
      debug("Caching document for", documentUrl);
      cachePromises.set(
        documentUrl,
        documentCache.add(documentUrl).catch((error) => {
          debug(`Failed to cache document for ${documentUrl}:`, error);
        }),
      );
    }

    if (isMount) {
      for (const match of matches) {
        if (manifest.routes[match.id].hasLoader) {
          const params = new URLSearchParams(location.search);
          params.set("_data", match.id);
          let search = params.toString();
          search = search ? `?${search}` : "";
          const url = location.pathname + search + location.hash;
          if (!cachePromises.has(url)) {
            debug("Caching data for", url);
            cachePromises.set(
              url,
              dataCache.add(url).catch((error) => {
                debug(`Failed to cache data for ${url}:`, error);
              }),
            );
          }
        }
      }
    }
  }

  await Promise.all(cachePromises.values());
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
  cacheName: ASSETS,
}));

// Loaders
registerRoute(matchLoaderRequest, new NetworkFirst({
  cacheName: DATA,
  plugins: [backgroundSyncPlugin, remixLoaderPlugin]
}));

// Documents
registerRoute(matchDocumentRequest, new NetworkFirst({
  cacheName: PAGES,
}));

setDefaultHandler(({ request }) => {
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

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush(event))
})

self.addEventListener('message', (event) => {
  event.waitUntil(handleMessage(event))
})