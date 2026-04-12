import { Platform } from 'react-native';
import { FullWindowOverlay as NativeFullWindowOverlay } from 'react-native-screens';
/**
 * Wrapper for react-native-screens FullWindowOverlay with optional disable prop.
 *
 * @description
 * On iOS, FullWindowOverlay creates a separate native window for overlay content,
 * which breaks the React Native element inspector. Use `disableFullWindowOverlay`
 * when debugging to render content in the main window instead.
 */
export function FullWindowOverlay({ disableFullWindowOverlay, children, }) {
    if (Platform.OS !== 'ios' || disableFullWindowOverlay) {
        return <>{children}</>;
    }
    return <NativeFullWindowOverlay>{children}</NativeFullWindowOverlay>;
}
