import aspectRatio from "@tailwindcss/aspect-ratio";
import containerQueries from "@tailwindcss/container-queries";
import forms from "@tailwindcss/forms";
import type { Config } from "tailwindcss";

// 主题取自业务仓库 ui/tailwind.config.ts（业务基线 f6c046cc2）
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,tsx}",
    "./node_modules/@halo-dev/components/dist/**/*.{js,css}",
  ],
  theme: {
    extend: {},
  },
  plugins: [aspectRatio, containerQueries, forms],
} satisfies Config;
