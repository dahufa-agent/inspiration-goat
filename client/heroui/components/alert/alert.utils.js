import { DEFAULT_ICON_SIZE } from './alert.constants';
import { DefaultIcon } from './default-icon';
import { SuccessIcon } from './success-icon';
import { WarningIcon } from './warning-icon';
/**
 * Resolves the default icon component based on the current alert status.
 */
export function getStatusIcon(status, iconProps) {
    const { size = DEFAULT_ICON_SIZE, color } = iconProps;
    switch (status) {
        case 'success':
            return <SuccessIcon size={size} color={color}/>;
        case 'warning':
            return <WarningIcon size={size} color={color}/>;
        default:
            return <DefaultIcon size={size} color={color}/>;
    }
}
