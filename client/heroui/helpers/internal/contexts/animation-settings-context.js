import { createContext } from '../utils';
const [AnimationSettingsProvider, useAnimationSettings] = createContext({
    name: 'AnimationSettingsContext',
    strict: false,
});
export { AnimationSettingsProvider, useAnimationSettings };
