import { createContext, forwardRef, useContext, useEffect, useId } from 'react';
import { BackHandler, Pressable, Text, View, } from 'react-native';
import { useControllableState } from '../../helpers/internal/hooks';
import { Portal as PortalPrimitive } from '../portal';
import * as Slot from '../slot';
const DialogContext = createContext(null);
const Root = forwardRef(({ asChild, isOpen: isOpenProp, isDefaultOpen, onOpenChange: onOpenChangeProp, ...viewProps }, ref) => {
    const [isOpen = false, onOpenChange] = useControllableState({
        prop: isOpenProp,
        defaultProp: isDefaultOpen,
        onChange: onOpenChangeProp,
    });
    const nativeID = useId();
    const Component = asChild ? Slot.View : View;
    return (<DialogContext.Provider value={{
            isOpen,
            onOpenChange,
            nativeID,
        }}>
        <Component ref={ref} {...viewProps}/>
      </DialogContext.Provider>);
});
function useRootContext() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('Dialog compound components cannot be rendered outside the Dialog component');
    }
    return context;
}
Root.displayName = 'HeroUINative.Primitive.Dialog.Root';
// --------------------------------------------------
const Trigger = forwardRef(({ asChild, onPress: onPressProp, disabled = false, ...props }, ref) => {
    const { isOpen, onOpenChange } = useRootContext();
    function onPress(ev) {
        if (disabled)
            return;
        const newValue = !isOpen;
        onOpenChange(newValue);
        onPressProp?.(ev);
    }
    const Component = asChild ? Slot.Pressable : Pressable;
    return (<Component ref={ref} aria-disabled={disabled ?? undefined} role="button" onPress={onPress} disabled={disabled ?? undefined} {...props}/>);
});
Trigger.displayName = 'HeroUINative.Primitive.Dialog.Trigger';
// --------------------------------------------------
/**
 * @warning when using a custom `<PortalHost />`, you might have to adjust the Content's offset to account for nav elements like headers.
 */
function Portal({ forceMount, hostName, children }) {
    const value = useRootContext();
    if (!forceMount) {
        if (!value.isOpen) {
            return null;
        }
    }
    return (<PortalPrimitive hostName={hostName} name={`${value.nativeID}_portal`}>
      <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
    </PortalPrimitive>);
}
// --------------------------------------------------
const Overlay = forwardRef(({ asChild, forceMount, isCloseOnPress = true, onPress: OnPressProp, ...props }, ref) => {
    const { isOpen, onOpenChange } = useRootContext();
    function onPress(ev) {
        if (isCloseOnPress) {
            onOpenChange(!isOpen);
        }
        OnPressProp?.(ev);
    }
    if (!forceMount) {
        if (!isOpen) {
            return null;
        }
    }
    const Component = asChild ? Slot.Pressable : Pressable;
    return <Component ref={ref} onPress={onPress} {...props}/>;
});
Overlay.displayName = 'HeroUINative.Primitive.Dialog.Overlay';
// --------------------------------------------------
const Content = forwardRef(({ asChild, forceMount, ...props }, ref) => {
    const { isOpen, nativeID, onOpenChange } = useRootContext();
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onOpenChange(false);
            return true;
        });
        return () => {
            backHandler.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    if (!forceMount) {
        if (!isOpen) {
            return null;
        }
    }
    const Component = asChild ? Slot.View : View;
    return (<Component ref={ref} role="dialog" nativeID={nativeID} aria-labelledby={`${nativeID}_label`} aria-describedby={`${nativeID}_desc`} aria-modal={true} {...props}/>);
});
Content.displayName = 'HeroUINative.Primitive.Dialog.Content';
// --------------------------------------------------
const Close = forwardRef(({ asChild, onPress: onPressProp, disabled = false, ...props }, ref) => {
    const { onOpenChange } = useRootContext();
    function onPress(ev) {
        if (disabled)
            return;
        onOpenChange(false);
        onPressProp?.(ev);
    }
    const Component = asChild ? Slot.Pressable : Pressable;
    return (<Component ref={ref} aria-disabled={disabled ?? undefined} role="button" onPress={onPress} disabled={disabled ?? undefined} {...props}/>);
});
Close.displayName = 'HeroUINative.Primitive.Dialog.Close';
// --------------------------------------------------
const Title = forwardRef((props, ref) => {
    const { nativeID } = useRootContext();
    return (<Text ref={ref} role="heading" nativeID={`${nativeID}_label`} {...props}/>);
});
Title.displayName = 'HeroUINative.Primitive.Dialog.Title';
// --------------------------------------------------
const Description = forwardRef((props, ref) => {
    const { nativeID } = useRootContext();
    return <Text ref={ref} nativeID={`${nativeID}_desc`} {...props}/>;
});
Description.displayName = 'HeroUINative.Primitive.Dialog.Description';
// --------------------------------------------------
export { Close, Content, Description, Overlay, Portal, Root, Title, Trigger, useRootContext, };
