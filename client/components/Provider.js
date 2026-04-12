import { AuthProvider } from '@/contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WebOnlyColorSchemeUpdater } from './ColorSchemeUpdater';
import { HeroUINativeProvider } from '@/heroui';
function Provider({ children }) {
    return <WebOnlyColorSchemeUpdater>
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <HeroUINativeProvider>
          {children}
        </HeroUINativeProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  </WebOnlyColorSchemeUpdater>;
}
export { Provider, };
