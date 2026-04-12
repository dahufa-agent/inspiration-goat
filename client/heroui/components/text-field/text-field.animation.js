import { useCombinedAnimationDisabledState } from '../../helpers/internal/hooks';
// --------------------------------------------------
/**
 * Animation hook for TextField Root component
 * Handles root-level animation configuration and provides context for child components
 */
export function useTextFieldRootAnimation(options) {
    const { animation } = options;
    const isAllAnimationsDisabled = useCombinedAnimationDisabledState(animation);
    return {
        isAllAnimationsDisabled,
    };
}
