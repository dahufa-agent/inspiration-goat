import { forwardRef } from 'react';
import { Pressable, Text as RNText } from 'react-native';
import * as Slot from '../slot';
const Root = forwardRef(({ asChild, ...props }, ref) => {
    const Component = asChild ? Slot.Pressable : Pressable;
    return <Component ref={ref} {...props}/>;
});
Root.displayName = 'HeroUINative.Primitive.Label.Root';
// --------------------------------------------------
const Text = forwardRef(({ asChild, ...props }, ref) => {
    const Component = asChild ? Slot.Text : RNText;
    return <Component ref={ref} {...props}/>;
});
Text.displayName = 'HeroUINative.Primitive.Label.Text';
export { Root, Text };
