module.exports = {
    content: ['./src/**/*.{html,js}'], // Specify where Tailwind should scan for classes
    theme: {
        extend: {
            animation: {
                neon: 'neon 1s linear infinite',
                'gradient-move': 'gradient-move 3s ease infinite',
                'stroke-gradient': 'stroke-gradient 3s ease-in-out infinite',
            },
            keyframes: {
                'gradient-move': {
                  '0%': { backgroundPosition: '0% 50%' },
                  '50%': { backgroundPosition: '100% 50%' },
                  '100%': { backgroundPosition: '0% 50%' },
                },
                neon: {
                    '0%': { backgroundPosition: '0% 50%' },
                    '100%': { backgroundPosition: '100% 50%' },
                },
                'stroke-gradient': {
                    '0%': { strokeDashoffset: '0' },
                    '50%': { strokeDashoffset: '-200%' },
                    '100%': { strokeDashoffset: '0' },
                },
            },
            colors: {
                primary: '#1B263B', // Deep grey zinc
                secondary: '#27272a', // Smoky Purple
                accent: '#ec4899', // Greenish-Teal WIP
                accentLight: '#d1fae5', // Greenish-Teal WIP
                highlight: '#E8A628', // Golden Yellow WIP
                background: '#f1f5f9', // Slate 100
                neutral: '#2B2B2B', // Muted Gray IP
                fontColor: '#0f172a', // slate 800
            },
            fontFamily: {
                sans: ['Roboto', 'Arial', 'sans-serif'],
            },
        },
    },
    plugins: [],
};