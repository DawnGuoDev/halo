import "@/setup/setupStyles";
import "@/setup/setupFormKitRuntime";
import { createApp, h } from "vue";
import { i18n } from "@/locales";
import LocaleZhCN from "@/locales/zh-CN.json";
import { setupComponents } from "@/setup/setupComponents";
import AnnouncementPreviewApp from "./AnnouncementPreviewApp.vue";

// 独立原型入口：直接内联中文语言包，避免运行期加载语言文件的网络请求。
i18n.global.setLocaleMessage("zh-CN", LocaleZhCN);
i18n.global.locale.value = "zh-CN";

const app = createApp({ render: () => h(AnnouncementPreviewApp) });
app.use(i18n);
setupComponents(app);
app.mount("#app");
