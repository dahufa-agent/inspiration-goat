import { useCombinedAnimationDisabledState } from '../../helpers/internal/hooks';
// --------------------------------------------------
/**
 * Animation hook for RadioGroup root component.
 * Handles cascading animation disabled state to child components.
 */
export function useRadioGroupRootAnimation(options) {
    const { animation } = options;
    const isAllAnimationsDisabled = useCombinedAnimationDisabledState(animation);
    return {
        isAllAnimationsDisabled,
    };
}
