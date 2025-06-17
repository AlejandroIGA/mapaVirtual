// components/GoogleMapsComponent.jsx
import React, { useEffect, useRef, useState } from 'react';
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
  const [isMapCenteredOnUser, setIsMapCenteredOnUser] = useState(false);
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

  // Función para centrar el mapa en la ubicación del usuario
  const centerMapOnUser = (location, zoom = 19) => {
    if (mapInstance.current) {
      const userPosition = { lat: location.lat, lng: location.lng };
      mapInstance.current.panTo(userPosition);
      mapInstance.current.setZoom(zoom);
      setIsMapCenteredOnUser(true);
      console.log('🎯 Mapa centrado en la ubicación del usuario');
    }
  };

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
        
        // Centrar mapa en ubicación del usuario automáticamente
        centerMapOnUser(initialLocation);
        
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

      // Si el mapa aún no se ha centrado en el usuario, hacerlo ahora
      if (!isMapCenteredOnUser) {
        centerMapOnUser(location);
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
      stopLocationTracking(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
      console.log('🛑 Seguimiento detenido manualmente');
    } else {
      // Iniciar tracking
      try {
        setError(null);
        
        // Verificar permisos nuevamente
        const permissionStatus = await checkLocationPermission();
        if (permissionStatus.state === 'denied') {
          setError('Los permisos de ubicación están denegados. Habilítalos en la configuración del navegador.');
          return;
        }

        // Obtener ubicación inicial
        const location = await getCurrentUserLocation(LOCATION_OPTIONS);
        handleLocationUpdate(location);

        // Centrar mapa en la nueva ubicación
        centerMapOnUser(location);

        // Iniciar seguimiento
        watchIdRef.current = await startLocationTracking(
          handleLocationUpdate,
          handleLocationError,
          LOCATION_OPTIONS
        );
        
        if (watchIdRef.current) {
          setIsTracking(true);
          console.log('🎯 Seguimiento iniciado manualmente');
        }
      } catch (err) {
        setError(`No se pudo iniciar el seguimiento: ${err.message}`);
      }
    }
  };

  // Función para centrar manualmente el mapa en el usuario
  const centerOnUser = () => {
    if (userLocation) {
      centerMapOnUser(userLocation);
    } else {
      alert('No hay ubicación del usuario disponible');
    }
  };

  // Solicitar permisos manualmente
  const requestLocationAccess = async () => {
    try {
      setError(null);
      const location = await getCurrentUserLocation(LOCATION_OPTIONS);
      handleLocationUpdate(location);
      
      // Centrar mapa inmediatamente
      centerMapOnUser(location);
      
      // Actualizar estado de permisos
      const newStatus = await getLocationStatus();
      setLocationStatus(prev => ({ ...prev, permission: newStatus.permission }));
      
      setPermissionRequested(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        stopLocationTracking(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full">
      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between items-center">
            <div>
              <strong>⚠️ Atención:</strong> {error}
            </div>
            {error.includes('permisos') && (
              <button
                onClick={requestLocationAccess}
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Solicitar Permisos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Warning de permisos denegados */}
      {locationStatus.permission?.state === 'denied' && !error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between items-center">
            <div>
              <strong>🔒 Permisos de ubicación denegados.</strong> Para usar el seguimiento, habilita la ubicación en la configuración del navegador.
            </div>
            <button
              onClick={requestLocationAccess}
              className="ml-4 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Controles */}
      <div className="bg-blue-50 p-4 mb-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-blue-800">Mapa Universitario</h2>
          <div className="flex space-x-2">
            {/* Botón para centrar en usuario */}
            {userLocation && (
              <button
                onClick={centerOnUser}
                disabled={!isMapReady}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 bg-blue-500 hover:bg-blue-600 text-white"
              >
                📍 Centrar en Mi Ubicación
              </button>
            )}
            
            {locationStatus.available && (
              <button
                onClick={toggleTracking}
                disabled={!isMapReady}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  isTracking
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isTracking ? '🛑 Detener Seguimiento' : '🎯 Iniciar Seguimiento'}
              </button>
            )}
          </div>
        </div>
        
        <p className="text-blue-600 mb-2">
          Haz clic en cualquier edificio para ver el directorio de personal y obtener direcciones
        </p>

        {/* Estado detallado */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isMapReady ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>Mapa: {isMapReady ? 'Listo' : 'Cargando...'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${locationStatus.available ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span>Geolocalización: {locationStatus.available ? 'Disponible' : 'No disponible'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${
              locationStatus.permission?.state === 'granted' ? 'bg-green-500' : 
              locationStatus.permission?.state === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></span>
            <span>Permisos: {locationStatus.permission?.state || 'Verificando...'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${userLocation ? 'bg-green-500' : 'bg-gray-500'}`}></span>
            <span>Ubicación: {userLocation ? 'Obtenida' : 'No disponible'}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isMapCenteredOnUser ? 'bg-green-500' : 'bg-gray-500'}`}></span>
            <span>Centrado: {isMapCenteredOnUser ? 'Sí' : 'No'}</span>
          </div>
        </div>

        {userLocation && (
          <div className="mt-3 p-3 bg-white rounded border text-sm">
            <div className="flex justify-between items-start">
              <div>
                <strong>📍 Tu ubicación:</strong> {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                {userLocation.accuracy && (
                  <div className="text-gray-600">
                    Precisión: ±{Math.round(userLocation.accuracy)}m
                  </div>
                )}
                {userLocation.timestamp && (
                  <div className="text-gray-500 text-xs">
                    Última actualización: {new Date(userLocation.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
              <span className={`px-2 py-1 rounded text-xs ${isTracking ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {isTracking ? '🟢 Seguimiento activo' : '⚪ Seguimiento inactivo'}
              </span>
            </div>
          </div>
        )}

        {selectedBuilding && (
          <div className="mt-2 p-2 bg-white rounded border text-sm">
            <strong>🏢 Edificio seleccionado:</strong> {selectedBuilding.name}
          </div>
        )}
      </div>

      {/* Mapa */}
      <div
        ref={mapRef}
        style={{ width: '100%', height: '500px' }}
        className="border rounded-lg shadow-lg"
      />

      {/* Información */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold mb-2">🚀 Características:</h3>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>📍 <strong>Centrado automático</strong> en tu ubicación al cargar la página</li>
          <li>🎯 <strong>Botón manual</strong> para centrar el mapa en tu ubicación</li>
          <li>🔒 <strong>Validación de permisos</strong> antes de acceder a la ubicación</li>
          <li>👥 Directorio de personal por edificio</li>
          <li>🗺️ Rutas optimizadas para peatones</li>
          <li>🛰️ Vista híbrida (satélite + calles)</li>
          <li>ℹ️ Información detallada en ventanas emergentes</li>
          <li>🎯 Control manual de seguimiento on/off</li>
          <li>📏 Indicador de precisión y timestamp de ubicación</li>
        </ul>
      </div>
    </div>
  );
};

export default GoogleMapsComponent;