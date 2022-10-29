module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  important: true,
  theme: {
    extend: {
      colors: {
        "brand-1": "#21bbb1",
        "brand-2": "#2e2e2e",
        "brand-3": "#121212",
        "brand-4": "#474747",
        "brand-5": "#ffffff",
        "border-1": "#474747",
      },
      screens: {
        xxs: "340px",
        // => @media (min-width: 340px) { ... }

        xs: "400px",
        // => @media (min-width: 400px) { ... }

        sm: "640px",
        // => @media (min-width: 640px) { ... }

        md: "768px",
        // => @media (min-width: 768px) { ... }

        lg: "1024px",
        // => @media (min-width: 1024px) { ... }

        xl: "1280px",
        // => @media (min-width: 1280px) { ... }

        "2xl": "1536px",
        // => @media (min-width: 1536px) { ... }

        "3xl": "1792px",
        // => @media (min-width: 2048px) { ... }

        "4xl": "2048px",
        // => @media (min-width: 2048px) { ... }

        "5xl": "2304px",
        // => @media (min-width: 2048px) { ... }

        "6xl": "2560px",
        // => @media (min-width: 2048px) { ... }
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
