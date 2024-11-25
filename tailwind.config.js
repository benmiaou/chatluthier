module.exports = {
    content: ['./src/**/*.{html,js}'], // Specify where Tailwind should scan for classes
    theme: {
        extend: {
            colors: {
                primary: '#1B263B', // Deep grey zinc
                secondary: '#27272a', // Smoky Purple
                accent: '#065f46', // Greenish-Teal WIP
                accentLight: '#d1fae5', // Greenish-Teal WIP
                highlight: '#E8A628', // Golden Yellow WIP
                neutral: '#2B2B2B', // Muted Gray IP
            },
            fontFamily: {
                sans: ['Roboto', 'Arial', 'sans-serif'],
            },
        },
    },
    plugins: [],
};