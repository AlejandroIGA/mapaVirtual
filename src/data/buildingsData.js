// data/buildingsData.js
export const BUILDINGS_DATA = [
    {
        id: 1,
        name: "Biblioteca Central",
        position: { lat: 20.572976640827633, lng: -100.419786585765 },
        staff: [
            { name: "María González", position: "Bibliotecaria Jefe", phone: "442-123-4567" },
            { name: "Carlos Pérez", position: "Asistente", phone: "442-123-4568" }
        ]
    },
    {
        id: 2,
        name: "Edificio de Ingeniería",
        position: { lat: 20.573500, lng: -100.420000 },
        staff: [
            { name: "Dr. Ana López", position: "Coordinadora", phone: "442-123-4569" },
            { name: "Ing. Roberto Silva", position: "Laboratorista", phone: "442-123-4570" }
        ]
    },
    {
        id: 3,
        name: "Rectoría",
        position: { lat: 20.572500, lng: -100.419500 },
        staff: [
            { name: "Dr. Patricia Martínez", position: "Rectora", phone: "442-123-4571" },
            { name: "Lic. Juan Torres", position: "Secretario", phone: "442-123-4572" }
        ]
    }
];

export const MAP_CONFIG = {
    center: { lat: 20.572976640827633, lng: -100.419786585765 },
    zoom: 18,
    mapTypeId: 'roadmap',
    streetViewControl: false,
    rotateControl: true,
    mapId: 'DEMO_MAP_ID'
};

export const GOOGLE_MAPS_CONFIG = {
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['marker']
};

// Configuraciones adicionales que pueden necesitar
export const LOCATION_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 1000
};

// Función para validar que la API key esté configurada
export const validateGoogleMapsConfig = () => {
    if (!GOOGLE_MAPS_CONFIG.apiKey) {
        throw new Error(
            'VITE_GOOGLE_MAPS_API_KEY no está configurada. ' +
            'Agrega tu API key de Google Maps al archivo .env'
        );
    }

    if (GOOGLE_MAPS_CONFIG.apiKey.startsWith('your_')) {
        throw new Error(
            'Debes reemplazar "your_google_maps_api_key_here" con tu API key real en el archivo .env'
        );
    }

    return true;
};