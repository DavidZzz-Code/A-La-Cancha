import {CourtFavoritesProvider} from '../src/features/profile/CourtFavorites';
import {ThemeProvider} from '../src/lib/theme';
import { AuthProvider,useAuth } from '../src/features/auth/AuthProvider';
import { Stack } from 'expo-router';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import { Provider } from '../src/lib/context';
export default function Layout() { const [loaded,error] = useFonts({Manrope_400Regular,Manrope_500Medium,Manrope_700Bold,SpaceGrotesk_700Bold}); if (!loaded && !error) return <ActivityIndicator accessibilityLabel="Cargando tipografía"/>; return <SafeAreaProvider><ThemeProvider><Provider><AuthProvider><CourtFavoritesProvider><Routes/></CourtFavoritesProvider></AuthProvider></Provider></ThemeProvider></SafeAreaProvider>; }

function Routes(){
 const {role,session}=useAuth();
 return <Stack screenOptions={{headerShown:false,animation:'slide_from_right'}}>
 <Stack.Screen name="index"/><Stack.Screen name="profile"/>
 <Stack.Protected guard={!!session&&role==='owner'}>{['owner-home','owner-courts','owner-metrics','owner-agenda','owner-maintenance'].map(name=><Stack.Screen key={name} name={name}/>)}</Stack.Protected>
 <Stack.Protected guard={!session||role==='player'}>{['remote-agenda','remote-reservations','favorites','reservations','booking/[id]','court/[id]','confirmation/[id]'].map(name=><Stack.Screen key={name} name={name}/>)}</Stack.Protected>
 </Stack>;
}
