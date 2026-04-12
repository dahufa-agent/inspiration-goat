import { forwardRef, useLayoutEffect, useMemo, useRef } from 'react';
import { StyleSheet, } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { FullWindowOverlay, HeroText } from '../../helpers/internal/components';
import { AnimationSettingsProvider, useAnimationSettings, } from '../../helpers/internal/contexts';
import { usePopupDialogContentAnimation, usePopupOverlayAnimation, usePopupRootAnimation, } from '../../helpers/internal/hooks';
import * as DialogPrimitives from '../../primitives/dialog';
import { CloseButton } from '../close-button';
import { DialogAnimationProvider, useDialogAnimation, } from './dialog.animation';
import { DISPLAY_NAME } from './dialog.constants';
import { dialogClassNames, dialogStyleSheet } from './dialog.styles';
const AnimatedOverlay = Animated.createAnimatedComponent(DialogPrimitives.Overlay);
const useDialog = DialogPrimitives.useRootContext;
// --------------------------------------------------
const DialogRoot = forwardRef(({ children, isOpen, isDefaultOpen, onOpenChange, animation, ...props }, ref) => {
    const { progress, isDragging, isGestureReleaseAnimationRunning, isAllAnimationsDisabled, } = usePopupRootAnimation({
        animation,
    });
    const animationContextValue = useMemo(() => ({
        progress,
        isDragging,
        isGestureReleaseAnimationRunning,
    }), [progress, isDragging, isGestureReleaseAnimationRunning]);
    const animationSettingsContextValue = useMemo(() => ({
        isAllAnimationsDisabled,
    }), [isAllAnimationsDisabled]);
    return (<AnimationSettingsProvider value={animationSettingsContextValue}>
        <DialogAnimationProvider value={animationContextValue}>
          <DialogPrimitives.Root ref={ref} isOpen={isOpen} isDefaultOpen={isDefaultOpen} onOpenChange={onOpenChange} {...props}>
            {children}
          </DialogPrimitives.Root>
        </DialogAnimationProvider>
      </AnimationSettingsProvider>);
});
// --------------------------------------------------
const DialogTrigger = forwardRef((props, ref) => {
    return <DialogPrimitives.Trigger ref={ref} {...props}/>;
});
// --------------------------------------------------
const DialogPortal = ({ className, children, style, disableFullWindowOverlay = false, ...props }) => {
    const animationSettingsContext = useAnimationSettings();
    const animationContext = useDialogAnimation();
    const portalClassName = dialogClassNames.portal({ className });
    return (<DialogPrimitives.Portal {...props}>
      <AnimationSettingsProvider value={animationSettingsContext}>
        <DialogAnimationProvider value={animationContext}>
          <FullWindowOverlay disableFullWindowOverlay={disableFullWindowOverlay}>
            <Animated.View className={portalClassName} style={style} pointerEvents="box-none">
              {children}
            </Animated.View>
          </FullWindowOverlay>
        </DialogAnimationProvider>
      </AnimationSettingsProvider>
    </DialogPrimitives.Portal>);
};
// --------------------------------------------------
const DialogOverlay = forwardRef(({ className, style, animation, isAnimatedStyleActive = true, ...props }, ref) => {
    const { isOpen } = useDialog();
    const { progress, isDragging, isGestureReleaseAnimationRunning } = useDialogAnimation();
    const overlayClassName = dialogClassNames.overlay({ className });
    const { rContainerStyle, entering, exiting } = usePopupOverlayAnimation({
        progress,
        isDragging,
        isGestureReleaseAnimationRunning,
        animation,
    });
    if (!isOpen) {
        return null;
    }
    const overlayStyle = isAnimatedStyleActive
        ? [rContainerStyle, style]
        : style;
    return (<Animated.View entering={entering} exiting={exiting} style={StyleSheet.absoluteFill}>
        <AnimatedOverlay ref={ref} className={overlayClassName} style={overlayStyle} {...props}/>
      </Animated.View>);
});
// --------------------------------------------------
const DialogContent = forwardRef(({ className, style, children, animation, isSwipeable = true, ...props }, ref) => {
    const { isOpen, onOpenChange } = useDialog();
    const { progress, isDragging, isGestureReleaseAnimationRunning } = useDialogAnimation();
    const contentClassName = dialogClassNames.content({ className });
    const dragContainerRef = useRef(null);
    const { contentY, contentHeight, panGesture, rDragContainerStyle, entering, exiting, } = usePopupDialogContentAnimation({
        progress,
        isDragging,
        isGestureReleaseAnimationRunning,
        isOpen,
        onOpenChange,
        animation,
        isSwipeable,
    });
    useLayoutEffect(() => {
        dragContainerRef.current?.measure((_x, _y, _width, height, _pageX, pageY) => {
            contentY.set(pageY);
            contentHeight.set(height);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (<GestureDetector gesture={panGesture}>
        <Animated.View ref={dragContainerRef} entering={entering} exiting={exiting}>
          <Animated.View style={rDragContainerStyle} pointerEvents="box-none">
            <DialogPrimitives.Content ref={ref} className={contentClassName} style={[dialogStyleSheet.contentContainer, style]} {...props}>
              {children}
            </DialogPrimitives.Content>
          </Animated.View>
        </Animated.View>
      </GestureDetector>);
});
// --------------------------------------------------
const DialogClose = forwardRef((props, ref) => {
    const { onPress: onPressProp, ...restProps } = props;
    const { onOpenChange } = useDialog();
    const onPress = (ev) => {
        onOpenChange(false);
        if (typeof onPressProp === 'function') {
            onPressProp(ev);
        }
    };
    return <CloseButton ref={ref} onPress={onPress} {...restProps}/>;
});
// --------------------------------------------------
const DialogTitle = forwardRef(({ className, children, ...props }, ref) => {
    const { nativeID } = useDialog();
    const titleClassName = dialogClassNames.label({ className });
    return (<HeroText ref={ref} role="heading" accessibilityRole="header" nativeID={`${nativeID}_label`} className={titleClassName} {...props}>
        {children}
      </HeroText>);
});
// --------------------------------------------------
const DialogDescription = forwardRef(({ className, children, ...props }, ref) => {
    const { nativeID } = useDialog();
    const descriptionClassName = dialogClassNames.description({
        className,
    });
    return (<HeroText ref={ref} accessibilityRole="text" nativeID={`${nativeID}_desc`} className={descriptionClassName} {...props}>
        {children}
      </HeroText>);
});
// --------------------------------------------------
DialogRoot.displayName = DISPLAY_NAME.ROOT;
DialogTrigger.displayName = DISPLAY_NAME.TRIGGER;
DialogPortal.displayName = DISPLAY_NAME.PORTAL;
DialogOverlay.displayName = DISPLAY_NAME.OVERLAY;
DialogContent.displayName = DISPLAY_NAME.CONTENT;
DialogClose.displayName = DISPLAY_NAME.CLOSE;
DialogTitle.displayName = DISPLAY_NAME.TITLE;
DialogDescription.displayName = DISPLAY_NAME.DESCRIPTION;
/**
 * Compound Dialog component with sub-components
 *
 * @component Dialog.Root - Main container that manages open/close state.
 * Provides the dialog context to child components.
 *
 * @component Dialog.Trigger - Button or element that opens the dialog.
 * Accepts any pressable element as children.
 *
 * @component Dialog.Portal - Portal container for dialog overlay and content.
 * Renders children in a portal with centered layout.
 *
 * @component Dialog.Overlay - Background overlay that covers the screen.
 * Typically closes the dialog when clicked.
 *
 * @component Dialog.Content - The dialog content container.
 * Contains the main dialog UI elements.
 *
 * @component Dialog.Close - Close button for the dialog.
 * Can accept custom children or uses default close icon.
 *
 * @component Dialog.Title - The dialog title text.
 * Automatically linked for accessibility.
 *
 * @component Dialog.Description - The dialog description text.
 * Automatically linked for accessibility.
 *
 * @see Full documentation: https://v3.heroui.com/docs/native/components/dialog
 */
const Dialog = Object.assign(DialogRoot, {
    /** @optional Trigger element to open the dialog */
    Trigger: DialogTrigger,
    /** @optional Portal container for overlay and content */
    Portal: DialogPortal,
    /** @optional Background overlay */
    Overlay: DialogOverlay,
    /** @optional Main dialog content container */
    Content: DialogContent,
    /** @optional Close button for the dialog */
    Close: DialogClose,
    /** @optional Dialog title text */
    Title: DialogTitle,
    /** @optional Dialog description text */
    Description: DialogDescription,
});
export { useDialog, useDialogAnimation };
export default Dialog;
