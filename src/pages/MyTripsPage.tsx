import { travelsApi } from '@/api';
import { Header } from '@/components/Header';
import { TripListCard } from '@/components/TripCards';
import type { TravelSummary } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function MyTripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TravelSummary[]>([]);

  useEffect(() => {
    travelsApi.getMyTrips().then(setTrips);
  }, []);

  return (
    <section className="screen">
      <Header title="여행 기록 보기" onBack={() => navigate(-1)} showBell />
      <div className="scroll my-trips-scroll">
        <div className="my-trips-list">
          {trips.map((trip) => (
            <TripListCard key={trip.travel_plan_id} trip={trip} onClick={() => navigate(`/itinerary/${trip.travel_plan_id}`)} />
          ))}
        </div>
      </div>
    </section>
  );
}
