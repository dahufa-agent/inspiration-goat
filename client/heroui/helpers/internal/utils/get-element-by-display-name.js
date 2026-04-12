import React from 'react';
export const getElementByDisplayName = (children, displayName) => {
    const element = React.Children.toArray(children).find((child) => React.isValidElement(child) &&
        child.type?.displayName === displayName);
    return element;
};
