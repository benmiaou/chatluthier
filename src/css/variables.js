// Force Vite to include CSS variables by referencing them in JavaScript
// This ensures the variables are not optimized away during build

// Reference the CSS variables to prevent them from being removed
const cssVariables = [
  '--main-button-color',
  '--main-button-hover-color',
  '--main-button-disable-color',
  '--main-button-active-color',
  '--main-button-active-hover-color',
  '--main-progressbar',
  '--main-background-color',
  '--main-background-color-secondary',
  '--main-background-color-transparency',
  '--main-border',
  '--main-text',
  '--main-text-placeholder',
  '--main-text-info',
  '--link-color',
  '--fontfamilly',
];

// This function is never called but ensures variables are referenced
export function getCssVariables() {
  return cssVariables;
}
