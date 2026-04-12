import { createContext } from '../../helpers/internal/utils';
/**
 * ControlField context provider and hook
 * Extracted to separate file to avoid circular dependencies with Checkbox/Switch animation files
 */
const [ControlFieldProvider, useControlField] = createContext({
    name: 'ControlFieldContext',
    strict: false,
});
export { ControlFieldProvider, useControlField };
