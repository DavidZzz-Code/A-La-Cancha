import { View,useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { addDays,localDate } from '@alacancha/domain';
import { Page,Heading,Empty } from '../../components/ui';
import { courts } from '../../lib/catalog';
import { useApp } from '../../lib/context';
import { CourtCard } from './CourtCard';
export default function FavoritesScreen() { const {favorites} = useApp(); const router = useRouter(); const {width} = useWindowDimensions(); const selected = courts.filter(court => favorites.includes(court.id)); return <Page><Heading title="Las que quieres repetir" subtitle="Tus favoritas, cerca del próximo partido."/>{selected.length ? <View style={{flexDirection:'row',flexWrap:'wrap',gap:20}}>{selected.map(court => <View key={court.id} style={{width:width >= 900 ? '31.9%' : '100%'}}><CourtCard court={court} date={addDays(localDate(),1)} time="" duration={60}/></View>)}</View> : <Empty title="Aquí empieza tu selección" message="Toca el corazón de una cancha para guardarla en este dispositivo." onPress={() => router.push('/')}/>}</Page>; }
