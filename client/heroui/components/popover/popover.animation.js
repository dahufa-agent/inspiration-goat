import { createContext } from '../../helpers/internal/utils';
const [PopoverAnimationProvider, usePopoverAnimation] = createContext({
    name: 'PopoverAnimationContext',
});
export { PopoverAnimationProvider, usePopoverAnimation };
