module.exports = {
    content: ['./src/**/*.{html,js}'], // Specify where Tailwind should scan for classes
    theme: {
        extend: {
            animation: {
                neon: 'neon 1s linear infinite',
                'gradient-move': 'gradient-move 3s ease infinite',
                'stroke-gradient': 'stroke-gradient 3s ease-in-out infinite',
                'neon-glow': 'neonGlow 2s ease-in-out infinite',
            },
            boxShadow: {
                'neon': '0 0 7px #ec4899, 0 0 14px #3b82f6, 0 0 28px #8b5cf6',
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
                neonGlow: {
                  '0%': { boxShadow: '0 0 4px #ec4899, 0 0 8px #3b82f6, 0 0 16px #8b5cf6' },
                  '5%': { boxShadow: '0 0 4.5px #ec4899, 0 0 9px #3b82f6, 0 0 18px #8b5cf6' },
                  '10%': { boxShadow: '0 0 5px #ec4899, 0 0 10px #3b82f6, 0 0 20px #8b5cf6' },
                  '15%': { boxShadow: '0 0 5.5px #ec4899, 0 0 11px #3b82f6, 0 0 22px #8b5cf6' },
                  '20%': { boxShadow: '0 0 6px #ec4899, 0 0 12px #3b82f6, 0 0 24px #8b5cf6' },
                  '25%': { boxShadow: '0 0 6.5px #ec4899, 0 0 13px #3b82f6, 0 0 26px #8b5cf6' },
                  '30%': { boxShadow: '0 0 7px #ec4899, 0 0 14px #3b82f6, 0 0 28px #8b5cf6' },
                  '35%': { boxShadow: '0 0 7.5px #ec4899, 0 0 15px #3b82f6, 0 0 30px #8b5cf6' },
                  '40%': { boxShadow: '0 0 8px #ec4899, 0 0 16px #3b82f6, 0 0 32px #8b5cf6' },
                  '45%': { boxShadow: '0 0 9px #ec4899, 0 0 18px #3b82f6, 0 0 36px #8b5cf6' },
                  '50%': { boxShadow: '0 0 10px #ec4899, 0 0 20px #3b82f6, 0 0 40px #8b5cf6' },
                  '55%': { boxShadow: '0 0 9px #ec4899, 0 0 18px #3b82f6, 0 0 36px #8b5cf6' },
                  '60%': { boxShadow: '0 0 8px #ec4899, 0 0 16px #3b82f6, 0 0 32px #8b5cf6' },
                  '65%': { boxShadow: '0 0 7.5px #ec4899, 0 0 15px #3b82f6, 0 0 30px #8b5cf6' },
                  '70%': { boxShadow: '0 0 7px #ec4899, 0 0 14px #3b82f6, 0 0 28px #8b5cf6' },
                  '75%': { boxShadow: '0 0 6.5px #ec4899, 0 0 13px #3b82f6, 0 0 26px #8b5cf6' },
                  '80%': { boxShadow: '0 0 6px #ec4899, 0 0 12px #3b82f6, 0 0 24px #8b5cf6' },
                  '85%': { boxShadow: '0 0 5.5px #ec4899, 0 0 11px #3b82f6, 0 0 22px #8b5cf6' },
                  '90%': { boxShadow: '0 0 5px #ec4899, 0 0 10px #3b82f6, 0 0 20px #8b5cf6' },
                  '95%': { boxShadow: '0 0 4.5px #ec4899, 0 0 9px #3b82f6, 0 0 18px #8b5cf6' },
                  '100%': { boxShadow: '0 0 4px #ec4899, 0 0 8px #3b82f6, 0 0 16px #8b5cf6' },
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