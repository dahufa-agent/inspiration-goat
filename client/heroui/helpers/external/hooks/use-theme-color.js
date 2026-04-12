import { useCSSVariable } from 'uniwind';
/**
 * Theme colors as const array for efficient mapping
 * Ordered to match the order in src/styles/theme.css
 */
const THEME_COLORS = [
    'background',
    'foreground',
    'surface',
    'surface-foreground',
    'surface-hover',
    'overlay',
    'overlay-foreground',
    'muted',
    'accent',
    'accent-foreground',
    'segment',
    'segment-foreground',
    'border',
    'separator',
    'focus',
    'link',
    'default',
    'default-foreground',
    'success',
    'success-foreground',
    'warning',
    'warning-foreground',
    'danger',
    'danger-foreground',
    'field',
    'field-foreground',
    'field-placeholder',
    'field-border',
    'background-secondary',
    'background-tertiary',
    'background-inverse',
    'default-hover',
    'accent-hover',
    'success-hover',
    'warning-hover',
    'danger-hover',
    'field-hover',
    'field-focus',
    'field-border-hover',
    'field-border-focus',
    'accent-soft',
    'accent-soft-foreground',
    'accent-soft-hover',
    'danger-soft',
    'danger-soft-foreground',
    'danger-soft-hover',
    'warning-soft',
    'warning-soft-foreground',
    'warning-soft-hover',
    'success-soft',
    'success-soft-foreground',
    'success-soft-hover',
    'surface-secondary',
    'surface-tertiary',
    'on-surface',
    'on-surface-foreground',
    'on-surface-hover',
    'on-surface-focus',
    'on-surface-secondary',
    'on-surface-secondary-foreground',
    'on-surface-secondary-hover',
    'on-surface-secondary-focus',
    'on-surface-tertiary',
    'on-surface-tertiary-foreground',
    'on-surface-tertiary-hover',
    'on-surface-tertiary-focus',
    'separator-secondary',
    'separator-tertiary',
    'border-secondary',
    'border-tertiary',
];
export function useThemeColor(themeColor) {
    const isArray = Array.isArray(themeColor);
    const cssVariables = isArray
        ? themeColor.map((color) => `--color-${color}`)
        : [`--color-${themeColor}`];
    const resolvedColors = useCSSVariable(cssVariables);
    const processedColors = resolvedColors.map((color) => {
        if (typeof color === 'string') {
            return color;
        }
        if (typeof color === 'number') {
            return String(color);
        }
        return 'invalid';
    });
    if (isArray) {
        return processedColors;
    }
    return processedColors[0];
}
