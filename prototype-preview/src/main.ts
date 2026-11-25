import { createApp } from "vue";
import { vTooltip } from "@halo-dev/components";
import "./setup";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);
app.directive("tooltip", vTooltip as never);
app.use(router);
app.mount("#app");
