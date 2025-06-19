// components/GoogleMapsComponent.jsx
import React, { useEffect, useRef, useState } from 'react';
import './GoogleMapsComponent.css';
import { BUILDINGS_DATA, MAP_CONFIG, GOOGLE_MAPS_CONFIG, LOCATION_OPTIONS } from '../data/buildingsData';
import { 
  getCurrentUserLocation, 
  startLocationTracking, 
  stopLocationTracking,
  getLocationStatus,
  checkLocationPermission,
  isGeolocationAvailable
} from '../utils/locationUtils';
import {
  loadGoogleMapsAPI,
  createUserMarker,
  createBuildingMarker,
  createAccuracyCircle,
  createBuildingInfoContent,
  calculateAndShowDirections,
  setupMapDefaults
} from '../utils/mapUtils';

const GoogleMapsComponent = () => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const userMarkerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const watchIdRef = useRef(null);

  // Estados
  const [userLocation, setUserLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [error, setError] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [locationStatus, setLocationStatus] = useState({
    available: false,
    permission: null,
    checking: true
  });
  const [permissionRequested, setPermissionRequested] = useState(false);

  // Verificar estado de geolocalización al cargar
  useEffect(() => {
    const checkLocationAvailability = async () => {
      try {
        const status = await getLocationStatus();
        setLocationStatus({
          available: status.available,
          permission: status.permission,
          checking: false
        });
        
        console.log('📍 Estado de geolocalización:', status);
      } catch (error) {
        console.error('Error verificando geolocalización:', error);
        setLocationStatus({
          available: false,
          permission: null,
          checking: false
        });
      }
    };

    checkLocationAvailability();
  }, []);

  // Inicializar mapa
  useEffect(() => {
    const initializeMap = async () => {
      try {
        // Cargar API
        await loadGoogleMapsAPI(GOOGLE_MAPS_CONFIG);
        
        // Crear mapa
        const map = new window.google.maps.Map(mapRef.current, MAP_CONFIG);
        mapInstance.current = map;
        
        // Configurar mapa para mantener vista roadmap
        setupMapDefaults(map);
        
        // Crear marcadores de edificios
        createBuildingMarkers(map);
        
        setIsMapReady(true);
        setError(null);
        
        console.log('✅ Mapa inicializado correctamente');
      } catch (err) {
        setError(`Error inicializando mapa: ${err.message}`);
      }
    };

    initializeMap();
  }, []);

  // Iniciar seguimiento automático cuando el mapa esté listo y la geolocalización disponible
  useEffect(() => {
    const startAutoTracking = async () => {
      if (!isMapReady || !locationStatus.available || locationStatus.checking || permissionRequested) {
        return;
      }

      // Si los permisos ya están denegados, no intentar
      if (locationStatus.permission?.state === 'denied') {
        setError('Los permisos de ubicación están denegados. Habilítalos en la configuración del navegador para usar esta función.');
        return;
      }

      setPermissionRequested(true);

      try {
        console.log('🎯 Iniciando seguimiento automático...');
        
        // Intentar obtener ubicación inicial
        const initialLocation = await getCurrentUserLocation(LOCATION_OPTIONS);
        handleLocationUpdate(initialLocation);
        
        // Centrar mapa en ubicación del usuario
        mapInstance.current.panTo({ lat: initialLocation.lat, lng: initialLocation.lng });
        mapInstance.current.setZoom(19);
        
        // Iniciar seguimiento continuo
        watchIdRef.current = await startLocationTracking(
          handleLocationUpdate,
          handleLocationError,
          LOCATION_OPTIONS
        );
        
        if (watchIdRef.current) {
          setIsTracking(true);
          setError(null);
          console.log('✅ Seguimiento automático iniciado');
        }
        
      } catch (err) {
        console.warn('⚠️ No se pudo iniciar seguimiento automático:', err.message);
        setError(`Ubicación no disponible: ${err.message}`);
        setIsTracking(false);
      }
    };

    startAutoTracking();
  }, [isMapReady, locationStatus, permissionRequested]);

  // Crear marcadores de edificios
  const createBuildingMarkers = (map) => {
    BUILDINGS_DATA.forEach(building => {
      const marker = createBuildingMarker(map, building);
      const infoWindow = new window.google.maps.InfoWindow({
        content: createBuildingInfoContent(building)
      });

      // Evento click del marcador
      const addClickListener = () => {
        if (marker.addListener) {
          marker.addListener('click', () => handleBuildingClick(building, marker, infoWindow));
        } else if (marker.addEventListener) {
          marker.addEventListener('click', () => handleBuildingClick(building, marker, infoWindow));
        }
      };

      addClickListener();
    });
  };

  // Manejar click en edificio
  const handleBuildingClick = (building, marker, infoWindow) => {
    infoWindow.open(mapInstance.current, marker);
    setSelectedBuilding(building);

    // Adjuntar evento al botón de direcciones
    setTimeout(() => {
      const button = document.getElementById(`directions-btn-${building.id}`);
      if (button) {
        button.addEventListener('click', () => handleGetDirections(building));
      }
    }, 100);
  };

  // Obtener direcciones
  const handleGetDirections = async (building) => {
    if (!userLocation) {
      alert('No se pudo obtener tu ubicación para calcular la ruta');
      return;
    }

    try {
      const result = await calculateAndShowDirections(
        mapInstance.current,
        { lat: userLocation.lat, lng: userLocation.lng },
        { lat: building.position.lat, lng: building.position.lng }
      );

      alert(`Ruta a ${building.name}:\n- Distancia: ${result.distance}\n- Tiempo: ${result.duration}`);
    } catch (err) {
      alert(`Error calculando ruta: ${err.message}`);
    }
  };

  // Manejar actualización de ubicación
  const handleLocationUpdate = (location) => {
    setUserLocation(location);

    if (mapInstance.current) {
      // Remover marcador anterior
      if (userMarkerRef.current) {
        if (userMarkerRef.current.setMap) {
          userMarkerRef.current.setMap(null);
        } else if (userMarkerRef.current.map) {
          userMarkerRef.current.map = null;
        }
      }

      // Remover círculo anterior
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setMap(null);
      }

      // Crear nuevo marcador
      userMarkerRef.current = createUserMarker(mapInstance.current, location, location.accuracy);
      
      // Crear círculo de precisión
      if (location.accuracy) {
        accuracyCircleRef.current = createAccuracyCircle(
          mapInstance.current, 
          location, 
          location.accuracy
        );
      }
    }

    console.log(`📍 Ubicación actualizada: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} (±${Math.round(location.accuracy)}m)`);
  };

  // Manejar errores de ubicación
  const handleLocationError = (err) => {
    console.error('Error de ubicación:', err.message);
    setError(err.message);
    setIsTracking(false);
  };

  // Toggle tracking manual
  const toggleTracking = async () => {
    if (isTracking) {
      // Detener tracking
      try {
        if (watchIdRef.current) {
          stopLocationTracking(watchIdRef.current);
          watchIdRef.current = null;
        }
        setIsTracking(false);
        console.log('🛑 Seguimiento detenido manualmente');
      } catch (err) {
        console.error('Error al detener seguimiento:', err);
      }
    } else {
      // Iniciar tracking
      setError(null);
      
      try {
        // Verificación básica de geolocalización
        if (!navigator.geolocation) {
          throw new Error('Geolocalización no disponible en este navegador');
        }

        // Obtener ubicación inicial sin verificar permisos complejos
        const location = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
              });
            },
            (error) => {
              const messages = {
                1: 'Permisos de ubicación denegados',
                2: 'Ubicación no disponible',
                3: 'Tiempo de espera agotado'
              };
              reject(new Error(messages[error.code] || 'Error desconocido'));
            },
            LOCATION_OPTIONS
          );
        });

        handleLocationUpdate(location);

        // Iniciar seguimiento continuo
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            };
            handleLocationUpdate(newLocation);
          },
          (error) => {
            const messages = {
              1: 'Permisos de ubicación denegados',
              2: 'Ubicación no disponible',
              3: 'Tiempo de espera agotado'
            };
            handleLocationError(new Error(messages[error.code] || 'Error desconocido'));
          },
          LOCATION_OPTIONS
        );
        
        if (watchId) {
          watchIdRef.current = watchId;
          setIsTracking(true);
          console.log('🎯 Seguimiento iniciado manualmente');
        }
      } catch (err) {
        console.error('Error al iniciar seguimiento:', err);
        setError(`No se pudo iniciar el seguimiento: ${err.message}`);
      }
    }
  };

  // Solicitar permisos manualmente
  const requestLocationAccess = async () => {
    setError(null);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocalización no disponible en este navegador');
      }

      const location = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            });
          },
          (error) => {
            const messages = {
              1: 'Permisos de ubicación denegados',
              2: 'Ubicación no disponible',
              3: 'Tiempo de espera agotado'
            };
            reject(new Error(messages[error.code] || 'Error desconocido'));
          },
          LOCATION_OPTIONS
        );
      });

      handleLocationUpdate(location);
      setPermissionRequested(true);
      
      // Actualizar estado de forma simple
      setLocationStatus(prev => ({ 
        ...prev, 
        permission: { state: 'granted', message: 'Permisos concedidos' }
      }));
      
    } catch (err) {
      console.error('Error al solicitar acceso a ubicación:', err);
      setError(err.message);
    }
  };

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current && navigator.geolocation) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch (err) {
          console.error('Error en cleanup:', err);
        }
      }
    };
  }, []);

  return (
    <div className="google-maps-container">
      {/* Error Display */}
      {error && (
        <div className="error-display">
          <div>
            <strong>⚠️ Atención:</strong> {error}
          </div>
          {error.includes('permisos') && (
            <button onClick={requestLocationAccess} className="button-base permission-button">
              Solicitar Permisos
            </button>
          )}
        </div>
      )}

      {/* Warning de permisos denegados */}
      {locationStatus.permission?.state === 'denied' && !error && (
        <div className="warning-display">
          <div>
            <strong>🔒 Permisos de ubicación denegados.</strong> Para usar el seguimiento, habilita la ubicación en la configuración del navegador.
          </div>
          <button onClick={requestLocationAccess} className="button-base permission-button">
            Reintentar
          </button>
        </div>
      )}

      {/* Mapa */}
      <div ref={mapRef} className="map-container" />
    </div>
  );
};

export default GoogleMapsComponent;