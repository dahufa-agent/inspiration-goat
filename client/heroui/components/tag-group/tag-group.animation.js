import { useCombinedAnimationDisabledState } from '../../helpers/internal/hooks';
import { getRootAnimationState } from '../../helpers/internal/utils';
/** Root animation hook for TagGroup */
export function useTagGroupRootAnimation(options) {
    const { animation } = options;
    getRootAnimationState(animation);
    const isAllAnimationsDisabled = useCombinedAnimationDisabledState(animation);
    return {
        isAllAnimationsDisabled,
    };
}
