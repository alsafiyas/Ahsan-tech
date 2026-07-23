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
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat ?? null);
  const [selectedLng, setSelectedLng] = useState<number | null>(initialLng ?? null);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz,ru,en`
      );
      const data = await res.json();
      if (data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }, []);

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
    if (!mapRef.current || mapInstanceRef.current || typeof window === 'undefined') return;

    let L: any;

    const initMap = async () => {
      L = await import('leaflet');

      await import('leaflet/dist/leaflet.css');

      const defaultCenter: [number, number] =
        initialLat != null && initialLng != null
          ? [initialLat, initialLng]
          : [OFFICE_LAT, OFFICE_LNG];

      const map = L.map(mapRef.current!, {
        center: defaultCenter,
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      const defaultIcon = L.divIcon({
        html: `<div style="background:var(--primary,#3b82f6);width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        className: '',
      });

      const marker = L.marker(defaultCenter, { icon: defaultIcon, draggable: true }).addTo(map);
      markerRef.current = marker;

      if (initialLat != null && initialLng != null) {
        reverseGeocode(initialLat, initialLng);
      }

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setSelectedLat(lat);
        setSelectedLng(lng);
        reverseGeocode(lat, lng);
      });

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setSelectedLat(pos.lat);
        setSelectedLng(pos.lng);
        reverseGeocode(pos.lat, pos.lng);
      });

      setMapReady(true);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&accept-language=uz,ru,en`
      );
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
        setSelectedLat(lat);
        setSelectedLng(lng);
        setAddress(data[0].display_name || searchQuery);
      }
    } catch {
      // search failed
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
          <div ref={mapRef} className="w-full" style={{ height: '350px', background: '#e5e7eb' }} />
          {selectedLat != null && selectedLng != null && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-t" style={{ borderColor: 'var(--border)' }}>
              Koordinatalar: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
            </div>
          )}
        </div>

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
