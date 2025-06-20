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

  // Iniciar seguimiento automático cuando el mapa esté listo
  useEffect(() => {
    const startAutoTracking = async () => {
      if (!isMapReady || !locationStatus.available || locationStatus.checking) {
        return;
      }

      // Intentar obtener ubicación automáticamente, incluso si no sabemos el estado de permisos
      try {
        console.log('🎯 Iniciando seguimiento automático...');
        
        // Usar la API directa de geolocalización para intentar silenciosamente
        const initialLocation = await new Promise((resolve, reject) => {
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
              // Solo rechazar si el error no es de permisos
              if (error.code === 1) {
                // Permisos denegados - fallar silenciosamente
                console.log('📍 Permisos de ubicación no disponibles');
                resolve(null);
              } else {
                reject(error);
              }
            },
            {
              ...LOCATION_OPTIONS,
              timeout: 5000, // Timeout más corto para no bloquear
              maximumAge: 30000 // Permitir ubicaciones recientes
            }
          );
        });

        if (initialLocation) {
          handleLocationUpdate(initialLocation);
          
          // Centrar mapa en ubicación del usuario
          mapInstance.current.panTo({ lat: initialLocation.lat, lng: initialLocation.lng });
          mapInstance.current.setZoom(19);
          
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
              // Manejo silencioso de errores de seguimiento
              if (error.code !== 1) { // No mostrar errores de permisos
                console.warn('⚠️ Error en seguimiento:', error.message);
              }
            },
            {
              ...LOCATION_OPTIONS,
              timeout: 10000
            }
          );
          
          if (watchId) {
            watchIdRef.current = watchId;
            setIsTracking(true);
            console.log('✅ Seguimiento automático iniciado');
          }
        } else {
          console.log('📍 Ubicación no disponible - continuando sin seguimiento');
        }
        
      } catch (err) {
        console.log('📍 Seguimiento automático no disponible:', err.message);
        // No mostrar error al usuario, simplemente continuar sin ubicación
      }
    };

    startAutoTracking();
  }, [isMapReady, locationStatus]);

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

  // Función mejorada para obtener direcciones con ubicación automática
  const handleGetDirections = async (building) => {
    console.log('🗺️ Solicitando direcciones para:', building.name);
    console.log('📍 Estado actual de ubicación:', userLocation);

    let currentUserLocation = userLocation;

    // Si no tenemos ubicación, intentar obtenerla automáticamente
    if (!currentUserLocation) {
      console.log('🔄 Obteniendo ubicación actual...');
      
      try {
        // Intentar obtener ubicación de forma directa y rápida
        currentUserLocation = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
              };
              resolve(location);
            },
            (error) => {
              reject(error);
            },
            {
              enableHighAccuracy: false, // Usar ubicación menos precisa pero más rápida
              timeout: 3000, // Timeout corto
              maximumAge: 60000 // Permitir ubicaciones de hasta 1 minuto
            }
          );
        });
        
        // Actualizar estado con la nueva ubicación
        handleLocationUpdate(currentUserLocation);
        console.log('✅ Ubicación obtenida para direcciones:', currentUserLocation);
        
      } catch (err) {
        console.error('❌ No se pudo obtener ubicación:', err);
        
        // Mostrar mensaje específico según el tipo de error
        let errorMessage = 'No se pudo obtener tu ubicación para calcular la ruta.';
        
        if (err.code === 1) {
          errorMessage = 'Los permisos de ubicación están denegados.\n\nPara obtener direcciones, permite el acceso a la ubicación en tu navegador.';
        } else if (err.code === 2) {
          errorMessage = 'No se pudo determinar tu ubicación.\n\nVerifica que tengas GPS activado o que estés en una zona con buena señal.';
        } else if (err.code === 3) {
          errorMessage = 'La búsqueda de ubicación tardó demasiado.\n\nInténtalo de nuevo.';
        }
        
        alert(errorMessage);
        return;
      }
    }

    // Calcular direcciones con la ubicación disponible
    await calculateDirections(currentUserLocation, building);
  };

  // Función separada para calcular direcciones
  const calculateDirections = async (userPos, building) => {
    try {
      console.log('🧮 Calculando ruta desde:', userPos, 'hasta:', building.name);
      
      const result = await calculateAndShowDirections(
        mapInstance.current,
        { lat: userPos.lat, lng: userPos.lng },
        { lat: building.position.lat, lng: building.position.lng }
      );

      // Mostrar información de la ruta
      const routeInfo = `Ruta a ${building.name}:\n\n` +
                      `📏 Distancia: ${result.distance}\n` +
                      `⏱️ Tiempo estimado: ${result.duration}\n` +
                      `🚶‍♂️ Modo: Caminando`;
      
      alert(routeInfo);
      console.log('✅ Ruta calculada exitosamente:', result);
      
    } catch (err) {
      console.error('❌ Error calculando ruta:', err);
      alert(`Error calculando la ruta: ${err.message}`);
    }
  };

  // Manejar actualización de ubicación
  const handleLocationUpdate = (location) => {
    console.log('📍 Actualizando ubicación:', location);
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

  // Manejar errores de ubicación de forma silenciosa
  const handleLocationError = (err) => {
    console.log('📍 Error de ubicación (silencioso):', err.message);
    // No mostrar errores automáticamente al usuario
    // Solo registrar para debugging
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

        console.log('🎯 Iniciando seguimiento manual...');

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
          console.log('✅ Seguimiento iniciado manualmente');
        }
      } catch (err) {
        console.error('❌ Error al iniciar seguimiento:', err);
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

      console.log('🔐 Solicitando permisos de ubicación...');

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

      console.log('✅ Permisos concedidos y ubicación obtenida');
      
    } catch (err) {
      console.error('❌ Error al solicitar acceso a ubicación:', err);
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
      {/* Error Display - solo mostrar errores críticos */}
      {error && error.includes('inicializando mapa') && (
        <div className="error-display">
          <div>
            <strong>⚠️ Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Panel de información - solo mostrar estado sin botones de solicitud */}
      <div className="controls-section">
        <div className="controls-header">
          <h2 className="main-title">Sistema de Navegación UTEQ</h2>
          <div>
            <button
              onClick={toggleTracking}
              className={`button-base tracking-button ${isTracking ? 'active' : 'inactive'}`}
              disabled={!locationStatus.available}
            >
              {isTracking ? '🛑 Detener Seguimiento' : '🎯 Iniciar Seguimiento'}
            </button>
          </div>
        </div>
        
        <p className="description-text">
          {userLocation 
            ? `📍 Ubicación detectada (±${Math.round(userLocation.accuracy)}m) - Haz clic en un edificio para obtener direcciones`
            : '📍 Detectando ubicación automáticamente... Haz clic en un edificio para calcular rutas'
          }
        </p>

        <div className="status-grid">
          <div className="status-item">
            <div className={`status-dot ${isMapReady ? 'ready' : 'inactive'}`}></div>
            <span>Mapa: {isMapReady ? 'Listo' : 'Cargando...'}</span>
          </div>
          <div className="status-item">
            <div className={`status-dot ${locationStatus.available ? 'ready' : 'error'}`}></div>
            <span>GPS: {locationStatus.available ? 'Disponible' : 'No disponible'}</span>
          </div>
          <div className="status-item">
            <div className={`status-dot ${isTracking ? 'ready' : 'inactive'}`}></div>
            <span>Seguimiento: {isTracking ? 'Activo' : 'Inactivo'}</span>
          </div>
          <div className="status-item">
            <div className={`status-dot ${userLocation ? 'ready' : 'warning'}`}></div>
            <span>Ubicación: {userLocation ? 'Detectada' : 'Detectando...'}</span>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div ref={mapRef} className="map-container" />
    </div>
  );
};

export default GoogleMapsComponent;