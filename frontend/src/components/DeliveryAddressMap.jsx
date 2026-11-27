import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LocateFixed, Loader2, MapPin, AlertCircle } from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Tooltip,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const DEFAULT_FARM_CENTER = [
  Number(import.meta.env.VITE_FARM_LAT || 10.9735),
  Number(import.meta.env.VITE_FARM_LNG || 106.4945),
];
const DEFAULT_FARM_NAME =
  import.meta.env.VITE_FARM_NAME || 'Nông trại Củ Chi, TP.HCM';

// Sửa lỗi Marker mặc định của Leaflet trong Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapClickHandler({ onSelectLocation }) {
  useMapEvents({
    click(event) {
      onSelectLocation(event.latlng);
    },
  });
  return null;
}

function MapController({ coordinates, farmCenter }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates) {
      map.flyTo([coordinates.lat, coordinates.lng], 16, { duration: 0.5 });
      return;
    }

    if (farmCenter) {
      map.setView([farmCenter.latitude, farmCenter.longitude], 13);
    }
  }, [
    coordinates?.lat,
    coordinates?.lng,
    farmCenter?.latitude,
    farmCenter?.longitude,
    map,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export default function DeliveryAddressMap({
  address,
  onAddressChange,
  coordinates,
  onCoordinatesChange,
  placeholder = 'Nhập địa chỉ giao hàng...',
  inputId = undefined,
  required = false,
  minLength = undefined,
  mapHeight = '350px',
  externalError = '',
}) {
  const [mapLoading, setMapLoading] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [farmLocation, setFarmLocation] = useState({
    origin: DEFAULT_FARM_NAME,
    latitude: DEFAULT_FARM_CENTER[0],
    longitude: DEFAULT_FARM_CENTER[1],
  });

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API_URL}/shipping/farm-location`)
      .then((res) => {
        const loc = res.data?.data;
        if (
          mounted &&
          loc &&
          Number.isFinite(Number(loc.latitude)) &&
          Number.isFinite(Number(loc.longitude))
        ) {
          setFarmLocation({
            origin: loc.origin || DEFAULT_FARM_NAME,
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
          });
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleMapSelect = async (latlng) => {
    const lat = Number(latlng.lat);
    const lng = Number(latlng.lng);

    if (onCoordinatesChange) {
      onCoordinatesChange({ lat, lng });
    }
    setAddressError('');
    setMapLoading(true);
    onAddressChange(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      if (!response.ok) {
        throw new Error('Không thể lấy địa chỉ từ bản đồ.');
      }
      const result = await response.json();
      if (result.display_name) {
        onAddressChange(result.display_name);
      }
    } catch {
      setAddressError(
        'Không lấy được địa chỉ chi tiết. Tọa độ đã chọn vẫn được lưu.'
      );
    } finally {
      setMapLoading(false);
    }
  };

  const handleSearchAddressOnMap = async () => {
    const searchAddress = String(address || '').trim();
    if (!searchAddress) {
      alert('Vui lòng nhập địa chỉ!');
      return;
    }

    setMapLoading(true);
    setAddressError('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          searchAddress
        )}&limit=1`
      );
      if (!response.ok) {
        throw new Error('Không thể tìm vị trí.');
      }
      const result = await response.json();
      if (!result || result.length === 0) {
        throw new Error('Không tìm thấy địa chỉ.');
      }

      const lat = Number(result[0].lat);
      const lng = Number(result[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Tọa độ không hợp lệ.');
      }

      if (onCoordinatesChange) {
        onCoordinatesChange({ lat, lng });
      }
      onAddressChange(result[0].display_name || searchAddress);
    } catch (error) {
      setAddressError(error.message || 'Không tìm được vị trí.');
    } finally {
      setMapLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id={inputId}
          type="text"
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className={`flex-1 px-4 py-3 border rounded-xl text-sm outline-none focus:ring-2 ${
            externalError
              ? 'border-rose-400 focus:ring-rose-500'
              : 'border-gray-300 focus:ring-emerald-500'
          }`}
          value={address}
          onChange={(e) => {
            onAddressChange(e.target.value);
            if (onCoordinatesChange) onCoordinatesChange(null);
            setAddressError('');
          }}
        />

        <button
          type="button"
          onClick={handleSearchAddressOnMap}
          disabled={mapLoading}
          className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 disabled:opacity-50 shrink-0"
        >
          {mapLoading ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <LocateFixed size={17} />
          )}
          {mapLoading ? 'Đang tìm...' : 'Tìm địa chỉ'}
        </button>
      </div>

      {addressError && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          {addressError}
        </div>
      )}

      {externalError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{externalError}</span>
        </div>
      )}

      <div className="mt-4">
        <div className="relative z-0 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          <MapContainer
            center={
              coordinates
                ? [coordinates.lat, coordinates.lng]
                : [farmLocation.latitude, farmLocation.longitude]
            }
            zoom={coordinates ? 16 : 13}
            scrollWheelZoom={true}
            style={{
              height: mapHeight,
              width: '100%',
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController coordinates={coordinates} farmCenter={farmLocation} />

            <MapClickHandler onSelectLocation={handleMapSelect} />

            <CircleMarker
              center={[farmLocation.latitude, farmLocation.longitude]}
              radius={9}
              pathOptions={{
                color: '#047857',
                fillColor: '#10b981',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} permanent>
                Doanh nghiệp: {farmLocation.origin}
              </Tooltip>
            </CircleMarker>

            {coordinates && (
              <Marker position={[coordinates.lat, coordinates.lng]} />
            )}
          </MapContainer>
        </div>

        <p className="text-xs text-gray-500 mt-2.5">
          <MapPin size={14} className="inline text-emerald-600 mr-1" />
          Click trực tiếp trên bản đồ để chọn vị trí nhận hàng.
        </p>
      </div>
    </div>
  );
}
