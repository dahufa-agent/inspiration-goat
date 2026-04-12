/* eslint-disable react-hooks/refs */
import { cloneElement, forwardRef, isValidElement, } from 'react';
import { composeRefs, isTextChildren, mergeProps } from './utils';
// --------------------------------------------------
const Pressable = forwardRef((props, forwardedRef) => {
    const { children, ...pressableSlotProps } = props;
    if (!isValidElement(children)) {
        console.log('Slot.Pressable - Invalid asChild element', children);
        return null;
    }
    return cloneElement(isTextChildren(children) ? <></> : children, {
        ...mergeProps(pressableSlotProps, children.props),
        ref: forwardedRef
            ? composeRefs(forwardedRef, children.ref)
            : children.ref,
    });
});
Pressable.displayName = 'HeroUINative.Primitive.Slot.Pressable';
// --------------------------------------------------
const View = forwardRef((props, forwardedRef) => {
    const { children, ...viewSlotProps } = props;
    if (!isValidElement(children)) {
        console.log('Slot.View - Invalid asChild element', children);
        return null;
    }
    return cloneElement(isTextChildren(children) ? <></> : children, {
        ...mergeProps(viewSlotProps, children.props),
        ref: forwardedRef
            ? composeRefs(forwardedRef, children.ref)
            : children.ref,
    });
});
View.displayName = 'HeroUINative.Primitive.Slot.View';
// --------------------------------------------------
const Text = forwardRef((props, forwardedRef) => {
    const { children, ...textSlotProps } = props;
    if (!isValidElement(children)) {
        console.log('Slot.Text - Invalid asChild element', children);
        return null;
    }
    return cloneElement(isTextChildren(children) ? <></> : children, {
        ...mergeProps(textSlotProps, children.props),
        ref: forwardedRef
            ? composeRefs(forwardedRef, children.ref)
            : children.ref,
    });
});
Text.displayName = 'HeroUINative.Primitive.Slot.Text';
// --------------------------------------------------
const Image = forwardRef((props, forwardedRef) => {
    const { children, ...imageSlotProps } = props;
    if (!isValidElement(children)) {
        console.log('Slot.Image - Invalid asChild element', children);
        return null;
    }
    return cloneElement(isTextChildren(children) ? <></> : children, {
        ...mergeProps(imageSlotProps, children.props),
        ref: forwardedRef
            ? composeRefs(forwardedRef, children.ref)
            : children.ref,
    });
});
Image.displayName = 'HeroUINative.Primitive.Slot.Image';
export { Image, Pressable, Text, View };
