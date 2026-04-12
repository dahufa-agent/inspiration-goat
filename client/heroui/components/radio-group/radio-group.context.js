import { createContext } from '../../helpers/internal/utils';
/**
 * RadioGroupItem context provider and hook
 * Extracted to separate file to avoid circular dependencies with Label component
 */
const [RadioGroupItemProvider, useRadioGroupItem] = createContext({
    name: 'RadioGroupItemContext',
    strict: false,
});
export { RadioGroupItemProvider, useRadioGroupItem };
