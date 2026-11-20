import type { Plugin } from "vite-plus";

export function devPlugin({ port }: { port: number }): Plugin {
  const DEV_SERVER_ORIGIN = `http://localhost:${port}`;

  return {
    name: "vite-dev-absolute-urls",
    apply: "serve",
    transformIndexHtml: {
      order: "post" as const,
      handler: (html: string) =>
        html.replace(/ (src|href)="(\/.+?)"/g, ` $1="${DEV_SERVER_ORIGIN}$2"`),
    },
    configureServer(server) {
      // The console uses web history: `/console/content-calendar` must serve
      // the console document in development too, like the production Halo
      // server does. Only HTML navigations are rewritten; API/asset requests
      // keep their paths.
      server.middlewares.use((request, _response, next) => {
        const path = (request.url || "").split("?", 1)[0];
        const wantsHtml = String(request.headers.accept || "").includes(
          "text/html"
        );
        if (
          wantsHtml &&
          (path === "/console" || path.startsWith("/console/"))
        ) {
          request.url = "/console.html";
        }
        next();
      });
    },
  };
}
