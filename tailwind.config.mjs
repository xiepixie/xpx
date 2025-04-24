/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],

  theme: {
    extend: {
      screens: {
        "2xl": "1536px",
        "3xl": "1920px",
        "4xl": "2560px",
        "5xl": "3840px", // 4K屏幕
      },
      maxWidth: {
        "8xl": "88rem", // 1408px
        "9xl": "96rem", // 1536px
        "10xl": "120rem", // 1920px
      },
      containers: {
        "4xl": "2320px",
        "5xl": "3000px",
      },
    },
  },
  plugins: [require("daisyui"),require('@tailwindcss/typography')],
  
  daisyui: {
    themes: ["winter", "valentine", "dracula", "synthwave"],
    logs: false,
  },
};