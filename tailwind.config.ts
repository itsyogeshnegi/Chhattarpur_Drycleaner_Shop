import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc7fb",
          400: "#36a9f6",
          500: "#0b8de5",
          600: "#026fc4",
          700: "#03589f",
          800: "#074b83",
          900: "#0c3f6d",
          950: "#082848",
        },
        emeraldGold: {
          50: "#fbf8ee",
          100: "#f5eed4",
          200: "#ecdaa9",
          300: "#dfbf76",
          400: "#d3a54a",
          500: "#c28b30",
          600: "#aa6e26",
          700: "#865022",
          800: "#6f4122",
          900: "#5d3721",
        }
      },
    },
  },
  plugins: [],
} satisfies Config;

