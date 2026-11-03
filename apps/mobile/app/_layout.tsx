import { AuthProvider } from '../src/features/auth/AuthProvider';
import { Stack } from 'expo-router';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import { Provider } from '../src/lib/context';
export default function Layout() { const [loaded,error] = useFonts({Manrope_400Regular,Manrope_500Medium,Manrope_700Bold,SpaceGrotesk_700Bold}); if (!loaded && !error) return <ActivityIndicator accessibilityLabel="Cargando tipografía"/>; return <SafeAreaProvider><Provider><AuthProvider><Stack screenOptions={{headerShown:false,animation:'slide_from_right'}}/></AuthProvider></Provider></SafeAreaProvider>; }
