import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useResolveClassNames } from 'uniwind';
function useResolvedStyleProperty(params) {
    const { className, style } = params;
    const resolvedClassName = useResolveClassNames(className ?? '');
    const resolvedStyle = useMemo(() => (style ? StyleSheet.flatten(style) : undefined), [style]);
    return useMemo(() => {
        // Check if we're resolving multiple properties
        if ('propertyNames' in params) {
            return params.propertyNames.map((propertyName) => {
                // Style prop takes precedence over className
                if (resolvedStyle && propertyName in resolvedStyle) {
                    return resolvedStyle[propertyName];
                }
                // Fall back to className-resolved styles
                if (resolvedClassName && propertyName in resolvedClassName) {
                    return resolvedClassName[propertyName];
                }
                return undefined;
            });
        }
        // Single property resolution
        const propertyName = params.propertyName;
        // Style prop takes precedence over className
        if (resolvedStyle && propertyName in resolvedStyle) {
            return resolvedStyle[propertyName];
        }
        // Fall back to className-resolved styles
        if (resolvedClassName && propertyName in resolvedClassName) {
            return resolvedClassName[propertyName];
        }
        return undefined;
    }, [resolvedStyle, resolvedClassName, params]);
}
export { useResolvedStyleProperty };
