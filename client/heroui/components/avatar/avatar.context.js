import { createContext } from '../../helpers/internal/utils';
/**
 * Avatar context provider and hook
 * Provides size, color, and animation state to child components
 */
export const [AvatarProvider, useInnerAvatarContext] = createContext({
    name: 'AvatarContext',
});
