const gradientSlider = document.getElementById('gradientSlider');

gradientSlider.addEventListener('DOMContentLoaded', function () {
    const value = gradientSlider.value;

    // Map input value to gradient colors
    let color;
    if (value < 33) {
        color = '#ec4899'; // Pink
    } else if (value < 66) {
        color = '#a855f7'; // Violet
    } else {
        color = '#3b82f6'; // Blue
    }

    // Update thumb color dynamically
    gradientSlider.style.setProperty('--thumb-color', color);

    // Update styles for the slider
    gradientSlider.style.background = `linear-gradient(to right, ${color} ${value}%, #e5e7eb ${value}%)`;
});
