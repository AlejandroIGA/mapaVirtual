// data/buildingsData.js
import IntelImg from '../assets/Intel.png';
import RectoriaImg from '../assets/Rectoria.png';
import BibliotecaImg from '../assets/Biblioteca.png';
import PidetImg from '../assets/Pidet.png';
import AuditorioImg from '../assets/Auditorio.png';

export const BUILDINGS_DATA = [
    {
        id: 1,
        name: "Biblioteca Central",
        position: { lat: 20.654832, lng: -100.403785 },
        image: BibliotecaImg,
        staff: [
            { name: "María González", position: "Bibliotecaria Jefe", phone: "442-123-4567" },
            { name: "Carlos Pérez", position: "Asistente", phone: "442-123-4568" }
        ]
    },
    {
        id: 2,
        name: "División de Tecnologías de Automatización e Información ",
        position: { lat: 20.65439, lng: -100.404773 },
        staff: [
            { name: "José Gonzalo Lugo Pérez", position: "Director", phone: "442-123-4569" },
            { name: "Ing. Roberto Silva", position: "Coordinador", phone: "442-123-4570" }
        ]
    },
    {
        id: 3,
        name: "Rectoría",
        position: { lat: 20.6543236, lng: -100.4055099 },
        image: RectoriaImg,
        staff: [
            { name: "Dr. Luis Fernando Pantoja Amaro", position: "Rector", phone: "442-123-4571" },
            { name: "Dr. José Cabello Gil", position: "Secretario", phone: "442-123-4572" }
        ]
    },
    {
        id: 4,
        name: "Auditorio",
        position: { lat: 20.655972, lng: -100.405477 },
        image: AuditorioImg,
        staff: [
            { name: "Mtra. Laura Hernández", position: "Coordinadora de Eventos", phone: "442-321-7890" },
            { name: "Ing. Carlos Ramírez", position: "Técnico de Soporte", phone: "442-321-7891" }
        ]
    },
    {
        id: 5,
        name: "Creativity and Innovation Center 4.0 CIC 4.0",
        position: { lat: 20.657179, lng: -100.403578 },
        image: IntelImg,
        staff: [
            { name: "Dr. Elena Ríos", position: "Directora de Innovación", phone: "442-987-6543" },
            { name: "Lic. Marcos Villa", position: "Especialista en Vinculación", phone: "442-987-6544" }
        ]
    },
    {
        id: 6,
        name: "Pidet",
        position: { lat: 20.65768, lng: -100.403577 },
        image: PidetImg,
        staff: [
            { name: "Dr. Alberto López", position: "Coordinador de Proyectos", phone: "442-246-8100" },
            { name: "Mtra. Susana Díaz", position: "Gestora Administrativa", phone: "442-246-8101" }
        ]
    },
    {
        id: 7,
        name: "Servicios escolares",
        position: { lat: 20.654232, lng: -100.40618 },
        image: "",
        staff: [
            { name: "Lic. René Rentería Contreras", position: "Secretario de Vinculación", phone: "442-123-4571" },
            { name: "Lic. Juan Torres", position: "Secretario", phone: "442-123-4572" }
        ]
    }
];

// Configuración limpia del mapa - los estilos se aplicarán programáticamente
export const MAP_CONFIG = {
    center: { lat: 20.572976640827633, lng: -100.419786585765 },
    zoom: 18,
    mapTypeId: 'roadmap',
    streetViewControl: false,
    rotateControl: true,
    mapId: '83ab829c40d2091c30c1ba76',
    // Los estilos y clickableIcons se aplicarán en setupMapDefaults()
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