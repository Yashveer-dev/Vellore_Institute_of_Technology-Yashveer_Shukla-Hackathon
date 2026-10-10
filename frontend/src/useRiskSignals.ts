import { useState, useEffect } from 'react';

export interface GeoRiskPin {
  id: string;
  source: string;
  headline: string;
  entity: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  impactScore: number;
  sentiment: number;
  category: "Geopolitical" | "Credit Event" | "Macroeconomic" | "Merger/Acquisition" | "Product Launch";
}

interface RawSignal {
  source?: string;
  headline_or_text?: string;
  entity_mentioned?: string;
  geolocation?: {
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  impact_score?: number;
  sentiment_score?: number;
  event_classification?: string;
}

export function useRiskSignals() {
  const [pins, setPins] = useState<GeoRiskPin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const response = await fetch('http://localhost:8000/signals');
        if (!response.ok) {
          throw new Error('Failed to fetch risk signals');
        }
        const data: RawSignal[] = await response.json();
        
        const mappedPins: GeoRiskPin[] = data.map((item, index) => ({
          id: `pin-${index}`,
          source: item.source || 'Unknown Source',
          headline: item.headline_or_text || '',
          entity: item.entity_mentioned || 'N/A',
          country: item.geolocation?.country || 'Unknown',
          city: item.geolocation?.city || 'Unknown',
          lat: item.geolocation?.latitude ?? 0,
          lng: item.geolocation?.longitude ?? 0,
          impactScore: item.impact_score ?? 0,
          sentiment: item.sentiment_score ?? 0,
          category: (item.event_classification as GeoRiskPin['category']) || 'Credit Event'
        }));

        setPins(mappedPins);
      } catch (error) {
        console.error('Error fetching risk signals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
    const interval = setInterval(fetchSignals, 5000);

    return () => clearInterval(interval);
  }, []);

  return { pins, loading };
}