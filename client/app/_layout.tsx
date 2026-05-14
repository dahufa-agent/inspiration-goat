import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';
import { BeianFooter } from '@/components/BeianFooter';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
]);

export default function RootLayout() {
  return (
    <Provider>
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false
        }}
      >
        <Stack.Screen name="index" options={{ title: "" }} />
        <Stack.Screen name="edit" options={{ title: "" }} />
        <Stack.Screen name="auth" options={{ title: "" }} />
        <Stack.Screen name="polish" options={{ title: "" }} />
        <Stack.Screen name="extract" options={{ title: "" }} />
        <Stack.Screen name="history" options={{ title: "" }} />
        <Stack.Screen name="publish" options={{ title: "" }} />
        <Stack.Screen name="digital-human" options={{ title: "" }} />
        <Stack.Screen name="design-tools" options={{ title: "" }} />
        <Stack.Screen name="agent-workflow" options={{ title: "" }} />
        <Stack.Screen name="oneclick" options={{ title: "" }} />
        <Stack.Screen name="chinese-illustration" options={{ title: "" }} />
        <Stack.Screen name="name-generator" options={{ title: "" }} />
        <Stack.Screen name="classics" options={{ title: "" }} />
        <Stack.Screen name="health" options={{ title: "" }} />
        <Stack.Screen name="member" options={{ title: "" }} />
        <Stack.Screen name="terms" options={{ title: "" }} />
        <Stack.Screen name="privacy" options={{ title: "" }} />
        <Stack.Screen name="copyright" options={{ title: "" }} />
        <Stack.Screen name="minors" options={{ title: "" }} />
        <Stack.Screen name="guidelines" options={{ title: "" }} />
      </Stack>
      <BeianFooter />
      <Toast />
    </Provider>
  );
}
