'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import AppIcon from '@/components/ui/AppIcon';

export interface MapLocation {
  address: string;
  lat: number;
  lng: number;
  distance_km: number;
}

interface MapPickerModalProps {
  onClose: () => void;
  onConfirm: (location: MapLocation) => void;
  initialLat?: number | null;
  initialLng?: number | null;
}

const OFFICE_LAT = 40.9983;
const OFFICE_LNG = 71.6726;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapPickerModal({ onClose, onConfirm, initialLat, initialLng }: MapPickerModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat ?? null);
  const [selectedLng, setSelectedLng] = useState<number | null>(initialLng ?? null);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!apiKey) {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      return;
    }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.results?.[0]) {
        setAddress(data.results[0].formatted_address);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }, [apiKey]);

  const handleConfirm = () => {
    if (selectedLat == null || selectedLng == null) return;
    const dist = haversineDistance(OFFICE_LAT, OFFICE_LNG, selectedLat, selectedLng);
    onConfirm({
      address: address || `${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`,
      lat: selectedLat,
      lng: selectedLng,
      distance_km: Math.round(dist * 10) / 10,
    });
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (typeof window === 'undefined') return;

    const loadGoogleMaps = () => {
      if (window.google?.maps) {
        initMap();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=uz`;
      script.async = true;
      script.defer = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current || !window.google?.maps) return;

      const defaultCenter = initialLat != null && initialLng != null
        ? { lat: initialLat, lng: initialLng }
        : { lat: OFFICE_LAT, lng: OFFICE_LNG };

      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 14,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      const marker = new window.google.maps.Marker({
        position: defaultCenter,
        map,
        draggable: true,
        title: 'Selected location',
      });

      markerRef.current = marker;

      if (initialLat != null && initialLng != null) {
        reverseGeocode(initialLat, initialLng);
      }

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setPosition({ lat, lng });
          setSelectedLat(lat);
          setSelectedLng(lng);
          reverseGeocode(lat, lng);
        }
      });

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          const lat = pos.lat();
          const lng = pos.lng();
          setSelectedLat(lat);
          setSelectedLng(lng);
          reverseGeocode(lat, lng);
        }
      });
    };

    loadGoogleMaps();
  }, [apiKey, initialLat, initialLng, reverseGeocode]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !apiKey) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${apiKey}`
      );
      const data = await res.json();
      if (data.results?.[0]) {
        const loc = data.results[0].geometry.location;
        const lat = loc.lat;
        const lng = loc.lng;
        mapInstanceRef.current?.panTo({ lat, lng });
        mapInstanceRef.current?.setZoom(16);
        markerRef.current?.setPosition({ lat, lng });
        setSelectedLat(lat);
        setSelectedLng(lng);
        setAddress(data.results[0].formatted_address);
      }
    } catch {
      // search failed silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="card w-full max-w-xl p-0 overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <AppIcon name="MapPinIcon" size={18} style={{ color: 'var(--primary)' }} />
            <h2 className="text-sm font-semibold text-foreground">Joylashuvni tanlang</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground">
            <AppIcon name="XMarkIcon" size={18} />
          </button>
        </div>

        {apiKey ? (
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
              <input
                type="text"
                placeholder="Manzilni qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input text-sm flex-1"
              />
              <button onClick={handleSearch} disabled={loading} className="btn-primary text-xs px-3 py-1.5">
                {loading ? '...' : 'Qidirish'}
              </button>
            </div>
            <div ref={mapRef} className="w-full" style={{ height: '350px' }} />
            {selectedLat != null && selectedLng != null && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-t" style={{ borderColor: 'var(--border)' }}>
                Koordinatalar: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <AppIcon name="ExclamationTriangleIcon" size={32} className="mx-auto mb-3 text-warning" />
            <p>Google Maps API kaliti topilmadi.</p>
            <p className="text-xs mt-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY env o&apos;zgaruvchisini kiriting.</p>
          </div>
        )}

        {address && (
          <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs text-muted-foreground mb-0.5">Tanlangan manzil</p>
            <p className="text-sm text-foreground">{address}</p>
            {selectedLat != null && selectedLng != null && (
              <p className="text-xs mt-1" style={{ color: 'var(--primary)' }}>
                Ixcham masofa: ~{Math.round(haversineDistance(OFFICE_LAT, OFFICE_LNG, selectedLat, selectedLng) * 10) / 10} km
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Bekor qilish</button>
          <button
            onClick={handleConfirm}
            disabled={selectedLat == null || selectedLng == null}
            className="btn-primary flex-1 text-sm disabled:opacity-50"
          >
            Tanlash
          </button>
        </div>
      </div>
    </div>
  );
}
