import { createContext } from '../utils';
const [FormFieldProvider, useFormField] = createContext({
    name: 'FormFieldContext',
    strict: false,
});
export { FormFieldProvider, useFormField };
