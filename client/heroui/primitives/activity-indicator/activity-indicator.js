import { forwardRef } from 'react';
import { View } from 'react-native';
import * as Slot from '../slot';
// --------------------------------------------------
const Root = forwardRef(({ asChild, isLoading = true, ...props }, ref) => {
    const Component = asChild ? Slot.View : View;
    return (<Component ref={ref} accessible accessibilityRole="progressbar" accessibilityState={{ busy: isLoading }} {...props}/>);
});
Root.displayName = 'HeroUINative.Primitive.ActivityIndicator.Root';
// --------------------------------------------------
const Indicator = forwardRef(({ asChild, ...props }, ref) => {
    const Component = asChild ? Slot.View : View;
    return (<Component ref={ref} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...props}/>);
});
Indicator.displayName = 'HeroUINative.Primitive.ActivityIndicator.Indicator';
export { Indicator, Root };
