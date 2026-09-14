import { travelsApi } from '@/src/api';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { TripListCard } from '@/src/components/ui/TripCards';
import type { TravelSummary } from '@/src/types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

export default function MyTripsScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<TravelSummary[]>([]);

  useEffect(() => {
    travelsApi.getMyTrips().then(setTrips);
  }, []);

  return (
    <Screen>
      <ScreenHeader title="여행 기록 보기" onBack={() => router.back()} showBell />
      <ScrollView contentContainerStyle={styles.content}>
        {trips.map((trip) => (
          <TripListCard
            key={trip.travel_plan_id}
            trip={trip}
            onPress={() => router.push(`/itinerary/${trip.travel_plan_id}`)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10 },
});
