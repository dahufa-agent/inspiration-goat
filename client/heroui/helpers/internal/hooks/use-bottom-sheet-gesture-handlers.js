import { useGestureEventsHandlersDefault, } from '@gorhom/bottom-sheet';
import { useBottomSheetIsDragging } from '../contexts/bottom-sheet-is-dragging-context';
export const useBottomSheetGestureHandlers = () => {
    const { isDragging } = useBottomSheetIsDragging();
    const defaultHandlers = useGestureEventsHandlersDefault();
    const handleOnStart = (source, payload) => {
        'worklet';
        isDragging.set(true);
        defaultHandlers.handleOnStart(source, payload);
    };
    const handleOnChange = (source, payload) => {
        'worklet';
        defaultHandlers.handleOnChange(source, payload);
    };
    const handleOnEnd = (source, payload) => {
        'worklet';
        isDragging.set(false);
        defaultHandlers.handleOnEnd(source, payload);
    };
    const handleOnFinalize = (source, payload) => {
        'worklet';
        isDragging.set(false);
        defaultHandlers.handleOnFinalize(source, payload);
    };
    return {
        handleOnStart,
        handleOnChange,
        handleOnEnd,
        handleOnFinalize,
    };
};
