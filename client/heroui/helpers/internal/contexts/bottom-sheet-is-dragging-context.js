import { createContext } from '../utils';
const [BottomSheetIsDraggingProvider, useBottomSheetIsDragging] = createContext({
    name: 'BottomSheetIsDraggingContext',
});
export { BottomSheetIsDraggingProvider, useBottomSheetIsDragging };
