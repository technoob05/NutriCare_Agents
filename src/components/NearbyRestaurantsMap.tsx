'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, MapPin, Search, AlertCircle, Navigation } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

// Interface cho kết quả Nearby Search
interface PlaceResult {
  id?: string;
  displayName: string;
  formattedAddress?: string | null; // Cho phép null
  location: google.maps.LatLng;
  rating?: number | null;
  userRatingCount?: number | null;
  photos?: {
    getUrl: (opts?: { maxWidth?: number; maxHeight?: number }) => string;
  }[];
  openingHours?: { isOpen: () => boolean };
}

interface NearbyRestaurantsMapProps {
  keyword: string;
  apiKey: string;
}

interface LatLngLiteral {
  lat: number;
  lng: number;
}

// Constants
const DEFAULT_CENTER: LatLngLiteral = { lat: 21.028511, lng: 105.804817 }; // Trung tâm Hà Nội
const DEFAULT_ZOOM = 14;
const NEARBY_SEARCH_RADIUS = 5000; // 5km
const MAP_CONTAINER_STYLE: React.CSSProperties = {
  height: '60vh',
  width: '100%',
  borderRadius: '8px',
  overflow: 'hidden',
};
const LIBRARIES: ('places')[] = ['places'];

// Component
const NearbyRestaurantsMap: React.FC<NearbyRestaurantsMapProps> = ({ keyword, apiKey }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState<LatLngLiteral | null>(null);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [status, setStatus] = useState<
    | 'idle'
    | 'loading-location'
    | 'location-denied'
    | 'location-error'
    | 'loading-search'
    | 'search-error'
    | 'search-success'
    | 'no-results'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [mapCenter, setMapCenter] = useState<LatLngLiteral>(DEFAULT_CENTER);

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Hàm Nearby Search
  const performNearbySearch = useCallback(
    async (location: LatLngLiteral) => {
      if (!map) {
        console.error('Map chưa được khởi tạo.');
        setStatus('search-error');
        setErrorMessage('Bản đồ chưa sẵn sàng. Vui lòng thử lại.');
        return;
      }

      console.log(`Tìm kiếm nearby cho "${keyword}" tại:`, location);
      setStatus('loading-search');
      setPlaces([]);
      setSelectedPlace(null);
      setErrorMessage(null);

      const center = new google.maps.LatLng(location.lat, location.lng);

      const request: google.maps.places.SearchNearbyRequest = {
        fields: [
          'displayName',
          'location',
          'formattedAddress',
          'rating',
          'userRatingCount',
          'photos',
          'openingHours',
        ],
        locationRestriction: {
          center: center,
          radius: NEARBY_SEARCH_RADIUS,
        },
        includedPrimaryTypes: [keyword || 'restaurant'],
        maxResultCount: 20,
        rankPreference: google.maps.places.SearchNearbyRankPreference.POPULARITY,
        language: 'vi-VN',
        region: 'vn',
      };

      try {
        const { places: results } = await google.maps.places.Place.searchNearby(request);
        if (results.length === 0) {
          setStatus('no-results');
        } else {
          const transformedResults: PlaceResult[] = results.map((place) => ({
            id: place.id,
            displayName: place.displayName ?? 'Unnamed',
            formattedAddress: place.formattedAddress,
            location: place.location!,
            rating: place.rating ?? null,
            userRatingCount: place.userRatingCount ?? null,
            photos: place.photos,
            openingHours: place.openingHours,
          }));
          console.log('Kết quả tìm kiếm nearby:', transformedResults);
          setPlaces(transformedResults);
          setStatus('search-success');

          const bounds = new google.maps.LatLngBounds();
          if (userLocation) {
            bounds.extend(new google.maps.LatLng(userLocation.lat, userLocation.lng));
          }
          transformedResults.forEach((place) => {
            if (place.location) {
              bounds.extend(place.location);
            }
          });
          map.fitBounds(bounds);
          google.maps.event.addListenerOnce(map, 'idle', () => {
            if (map.getZoom()! > 16) {
              map.setZoom(16);
            }
          });
        }
      } catch (err: any) {
        console.error('Tìm kiếm nearby thất bại:', err);
        setStatus('search-error');
        setErrorMessage(`Tìm kiếm thất bại: ${err.message}`);
      }
    },
    [keyword, map, userLocation]
  );

  // Hàm Text Search
  const performTextSearch = useCallback(
    (query: string) => {
      if (!geocoderRef.current || !map) {
        console.error('Geocoder hoặc map chưa sẵn sàng.');
        setStatus('search-error');
        setErrorMessage('Dịch vụ bản đồ chưa sẵn sàng (Geocoder). Vui lòng thử lại.');
        return;
      }

      console.log(`Geocoding địa chỉ: "${query}"`);
      setStatus('loading-search');
      setPlaces([]);
      setSelectedPlace(null);
      setErrorMessage(null);

      geocoderRef.current.geocode({ address: query }, (results, geocodeStatus) => {
        if (
          geocodeStatus === google.maps.GeocoderStatus.OK &&
          results &&
          results[0]?.geometry?.location
        ) {
          const location = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          console.log(`Địa chỉ "${query}" được geocode thành:`, location);
          setMapCenter(location);
          performNearbySearch(location);
        } else {
          console.error('Geocoding thất bại:', geocodeStatus);
          setStatus('search-error');
          setErrorMessage(`Không thể tìm địa chỉ "${query}". Vui lòng thử lại.`);
        }
      });
    },
    [map, performNearbySearch]
  );

  // Lấy vị trí người dùng
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('location-denied');
      setErrorMessage('Trình duyệt của bạn không hỗ trợ định vị.');
      return;
    }

    setStatus('loading-location');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const currentLocation = { lat: latitude, lng: longitude };
        console.log('Vị trí người dùng:', currentLocation);
        setUserLocation(currentLocation);
        setMapCenter(currentLocation);
        setStatus('idle');
        performNearbySearch(currentLocation);
      },
      (error) => {
        console.error('Lỗi định vị:', error);
        setStatus('location-denied');
        setErrorMessage(`Không thể lấy vị trí: ${error.message}. Vui lòng nhập địa chỉ.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [performNearbySearch]);

  // Callback khi bản đồ load
  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
      geocoderRef.current = new google.maps.Geocoder();
      console.log('Map và Geocoder đã được khởi tạo.');
      getLocation();
    },
    [getLocation]
  );

  const onUnmount = useCallback(() => {
    setMap(null);
    geocoderRef.current = null;
  }, []);

  // Xử lý Marker và InfoWindow
  const handleMarkerClick = useCallback((place: PlaceResult) => {
    setSelectedPlace(place);
  }, []);

  const handleInfoWindowClose = useCallback(() => {
    setSelectedPlace(null);
  }, []);

  // Xử lý form tìm kiếm theo địa chỉ
  const handleAddressSearch = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (addressInput.trim()) {
        performTextSearch(addressInput.trim());
      }
    },
    [addressInput, performTextSearch]
  );

  // Nút Recenter
  const handleRecenter = useCallback(() => {
    if (userLocation && map) {
      map.panTo(new google.maps.LatLng(userLocation.lat, userLocation.lng));
      map.setZoom(DEFAULT_ZOOM);
    } else if (map) {
      getLocation();
    }
  }, [userLocation, map, getLocation]);

  // Render
  if (!isLoaded) {
    return <Skeleton className="h-[60vh] w-full" />;
  }

  if (loadError) {
    console.error('Lỗi tải Google Maps:', loadError);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Lỗi Tải Bản Đồ</AlertTitle>
        <AlertDescription>
          Không thể tải Google Maps. Vui lòng kiểm tra API key, kết nối mạng và thử lại.
          <br />
          <span className="text-xs italic mt-1 block">Chi tiết lỗi: {loadError.message}</span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {status === 'loading-location' && (
        <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Đang lấy vị trí...</AlertTitle>
          <AlertDescription>Vui lòng chờ trong khi xác định vị trí của bạn.</AlertDescription>
        </Alert>
      )}
      {(status === 'location-denied' || status === 'location-error') && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Không thể lấy vị trí</AlertTitle>
          <AlertDescription>
            {errorMessage || 'Quyền truy cập vị trí bị từ chối hoặc có lỗi xảy ra.'}
            <form onSubmit={handleAddressSearch} className="mt-2 flex gap-2">
              <Input
                type="text"
                placeholder="Nhập địa chỉ hoặc khu vực..."
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="flex-grow"
                aria-label="Nhập địa chỉ tìm kiếm"
              />
              <Button type="submit" size="icon" aria-label="Tìm kiếm theo địa chỉ">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </AlertDescription>
        </Alert>
      )}
      {status === 'loading-search' && (
        <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Đang tìm kiếm nhà hàng...</AlertTitle>
          <AlertDescription>Tìm các quán ăn "{keyword}" gần bạn.</AlertDescription>
        </Alert>
      )}
      {status === 'search-error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Lỗi Tìm Kiếm</AlertTitle>
          <AlertDescription>{errorMessage || 'Đã xảy ra lỗi không mong muốn.'}</AlertDescription>
        </Alert>
      )}
      {status === 'no-results' && (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertTitle>Không tìm thấy kết quả</AlertTitle>
          <AlertDescription>
            Không có nhà hàng nào phục vụ "{keyword}" trong khu vực tìm kiếm.
          </AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={mapCenter}
          zoom={DEFAULT_ZOOM}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_BOTTOM,
            },
          }}
        >
          {userLocation && (
            <Marker
              position={new google.maps.LatLng(userLocation.lat, userLocation.lng)}
              title="Vị trí của bạn"
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
              }}
            />
          )}

          {places.map((place) => (
            <Marker
              key={place.id || place.displayName}
              position={place.location}
              title={place.displayName}
              onClick={() => handleMarkerClick(place)}
            />
          ))}

          {selectedPlace && (
            <InfoWindow
              position={selectedPlace.location}
              onCloseClick={handleInfoWindowClose}
              options={{ pixelOffset: new google.maps.Size(0, -30) }}
            >
              <div className="p-1 max-w-xs text-sm">
                <h3 className="font-semibold text-base mb-1">{selectedPlace.displayName}</h3>
                {selectedPlace.formattedAddress && (
                  <p className="text-muted-foreground text-xs mb-2">{selectedPlace.formattedAddress}</p>
                )}
                {selectedPlace.rating && (
                  <p className="text-xs mb-1">
                    Đánh giá: {selectedPlace.rating} ⭐ ({selectedPlace.userRatingCount} lượt)
                  </p>
                )}
                {selectedPlace.openingHours && (
                  <p
                    className={`text-xs mb-2 ${
                      selectedPlace.openingHours.isOpen() ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {selectedPlace.openingHours.isOpen() ? 'Đang mở cửa' : 'Đang đóng cửa'}
                  </p>
                )}
                {selectedPlace.photos && selectedPlace.photos[0] && (
                  <img
                    src={selectedPlace.photos[0].getUrl({ maxWidth: 300, maxHeight: 200 })}
                    alt={`Ảnh của ${selectedPlace.displayName}`}
                    className="rounded mt-2 mb-1 w-full h-auto object-cover max-h-[150px]"
                    loading="lazy"
                  />
                )}
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs h-auto p-0 mt-2"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        selectedPlace.displayName
                      )}&query_place_id=${selectedPlace.id || ''}`,
                      '_blank'
                    )
                  }
                >
                  Xem trên Google Maps
                </Button>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        {map && userLocation && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 left-4 z-10 rounded-full shadow-md bg-background/80 hover:bg-background"
            onClick={handleRecenter}
            aria-label="Quay lại vị trí của tôi"
            title="Quay lại vị trí của tôi"
          >
            <Navigation className="h-5 w-5" />
          </Button>
        )}
        {map && !userLocation && (status === 'location-denied' || status === 'location-error') && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 left-4 z-10 rounded-full shadow-md bg-background/80 hover:bg-background"
            onClick={getLocation}
            aria-label="Thử lại lấy vị trí"
            title="Thử lại lấy vị trí"
          >
            <Navigation className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default NearbyRestaurantsMap;