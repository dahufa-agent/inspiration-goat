import { useCombinedAnimationDisabledState } from '../../helpers/internal/hooks';
export function useInputGroupRootAnimation(options) {
    const { animation } = options;
    const isAllAnimationsDisabled = useCombinedAnimationDisabledState(animation);
    return {
        isAllAnimationsDisabled,
    };
}
