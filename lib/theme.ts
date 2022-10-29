import { createTheme } from "@mui/material";

const coreTheme = {
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    palette: {
      secondary: {
        main: '#21bbb1',
      },
    },
  };
  
  export const darkTheme = createTheme({
    palette: {
      mode: "dark",
    },
	 breakpoints: {
		values: {
			xs: 0,
			sm: 640,
			md: 768,
			lg: 1024,
			xl: 1280,
			// xxl: 1536
		},
	},
  });
  
  export const lightTheme = createTheme({
    palette: {
      mode: "light",
    }
  });