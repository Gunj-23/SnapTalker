/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'saffron': '#FF9933',
                'white-india': '#FFFFFF',
                'green-india': '#138808',
                'navy-blue': '#000080',
                'orange-india': '#FF6B35',
            },
            fontFamily: {
                'hindi': ['Noto Sans Devanagari', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
