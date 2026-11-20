import type { PluginModule } from "@halo-dev/ui-shared";
import announcementModule from "../announcement/module";

const modules = import.meta.glob("./**/module.ts", {
  eager: true,
  import: "default",
}) as Record<string, PluginModule>;

// 独立目录（不属于 modules/**）的站内公告模块，显式登记以进入控制台路由。
(modules as Record<string, PluginModule>)["./announcement/module.ts"] =
  announcementModule;

export default modules;
