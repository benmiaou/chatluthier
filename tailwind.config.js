module.exports = {
    content: ['./src/**/*.{html,js}'], // Specify where Tailwind should scan for classes
    theme: {
        extend: {
            colors: {
                primary: '#1a202c',
                secondary: '#2d3748',
            },
            fontFamily: {
                sans: ['Roboto', 'Arial', 'sans-serif'],
            },
        },
    },
    plugins: [],
};