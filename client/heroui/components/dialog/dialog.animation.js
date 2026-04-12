import { createContext } from '../../helpers/internal/utils';
const [DialogAnimationProvider, useDialogAnimation] = createContext({
    name: 'DialogAnimationContext',
});
export { DialogAnimationProvider, useDialogAnimation };
