import { forwardRef } from 'react';
import { Pressable, View } from 'react-native';
import * as Slot from '../slot';
// --------------------------------------------------
const Root = forwardRef(({ asChild, isSelected, onSelectedChange, isDisabled, 'onPress': onPressProp, 'aria-valuetext': ariaValueText, ...props }, ref) => {
    function onPress(ev) {
        if (isDisabled)
            return;
        const newValue = !isSelected;
        onSelectedChange?.(newValue);
        onPressProp?.(ev);
    }
    const Component = asChild ? Slot.Pressable : Pressable;
    return (<Component ref={ref} aria-disabled={isDisabled} role="switch" aria-checked={isSelected} aria-valuetext={(ariaValueText ?? isSelected) ? 'on' : 'off'} onPress={onPress} accessibilityState={{
            checked: isSelected,
            disabled: isDisabled,
        }} disabled={isDisabled} {...props}/>);
});
Root.displayName = 'HeroUINative.Primitive.Switch.Root';
// --------------------------------------------------
const Thumb = forwardRef(({ asChild, ...props }, ref) => {
    const Component = asChild ? Slot.View : View;
    return <Component ref={ref} role="presentation" {...props}/>;
});
Thumb.displayName = 'HeroUINative.Primitive.Switch.Thumb';
export { Root, Thumb };
