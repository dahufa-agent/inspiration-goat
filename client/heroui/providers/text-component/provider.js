import { createContext } from '../../helpers/internal/utils';
const [TextComponentProvider, useTextComponent] = createContext({
    name: 'TextComponentContext',
});
export { TextComponentProvider, useTextComponent };
