import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// GitHub Solutions–inspired: dark nav #161b22, accent blue #0969da
const colors = {
  brand: {
    50: '#e7f3ff',
    100: '#b3d7ff',
    200: '#80bbff',
    300: '#4d9fff',
    400: '#1a83ff',
    500: '#0969da',
    600: '#0854b3',
    700: '#063f8c',
    800: '#042b66',
    900: '#02163f',
  },
  nav: {
    bg: '#161b22',
    border: '#30363d',
    link: '#c9d1d9',
    linkHover: '#58a6ff',
    linkActive: '#ffffff',
  },
};

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors: {
    ...colors,
    blue: colors.brand,
  },
  fonts: {
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  radii: {
    md: '6px',
    lg: '8px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      baseStyle: {
        borderRadius: '6px',
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: '8px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      baseStyle: {
        field: {
          borderRadius: '6px',
        },
      },
    },
    Select: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      baseStyle: {
        field: {
          borderRadius: '6px',
        },
      },
    },
    FormLabel: {
      baseStyle: {
        color: 'gray.700',
      },
    },
  },
});

export default theme;
