// utils/mapUtils.js
import NotFoundImg from "../assets/Not-found-2.png";
import MackersImage from "../assets/Macker_1.png";
/**
 * Carga la API de Google Maps
 */
export const loadGoogleMapsAPI = (config) => {
  return new Promise((resolve, reject) => {
    // Si ya está cargada
    if (window.google?.maps) {
      resolve();
      return;
    }

    // Evitar cargas múltiples
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Esperar a que termine de cargar
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    const libraries = config.libraries ? config.libraries.join(",") : "";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=${libraries}`;
    script.async = true;
    script.defer = true;

    script.onload = resolve;
    script.onerror = () => reject(new Error("Error cargando Google Maps API"));

    document.head.appendChild(script);
  });
};

/**
 * Configura el mapa para mantener siempre la vista roadmap
 */
export const enforceRoadmapView = (map) => {
  // Forzar vista roadmap
  map.setMapTypeId("roadmap");

  // Listener para prevenir cambios de vista
  map.addListener("maptypeid_changed", () => {
    if (map.getMapTypeId() !== "roadmap") {
      console.log("🗺️ Forzando vista de mapa normal");
      map.setMapTypeId("roadmap");
    }
  });

  console.log('🔒 Vista de mapa fijada en "roadmap"');
};

/**
 * Crea un marcador de usuario con animación
 */
export const createUserMarker = (map, position, accuracy) => {
  const latLng = new window.google.maps.LatLng(position.lat, position.lng);

  // Intentar usar AdvancedMarkerElement primero
  if (window.google.maps.marker?.AdvancedMarkerElement) {
    const markerElement = document.createElement("div");
    markerElement.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: #4285F4;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      position: relative;
    `;

    return new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position: latLng,
      content: markerElement,
      title: `Tu ubicación (±${Math.round(accuracy)}m)`,
    });
  }

  // Fallback a marcador clásico
  return new window.google.maps.Marker({
    map,
    position: latLng,
    title: `Tu ubicación (±${Math.round(accuracy)}m)`,
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: "#4285F4",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3,
    },
    zIndex: 1000,
  });
};

/**
 * Crea un marcador de edificio
 */
export const createBuildingMarker = (map, building) => {
  const latLng = new window.google.maps.LatLng(
    building.position.lat,
    building.position.lng
  );
  // Crear un elemento HTML personalizado para el marcador
  const markerDiv = document.createElement('div');
  markerDiv.className = 'building-marker'; // Clase CSS para estilizar

  // Crear un elemento de imagen para el icono
  const iconImg = document.createElement('img');
  iconImg.src = MackersImage; 
  iconImg.alt = 'Icono de edificio'; 
  iconImg.style.width = '28px';
  iconImg.style.height = '28px'; 

  markerDiv.appendChild(iconImg); // Añadir la imagen al div del marcador

  // Crear el AdvancedMarkerElement
  return new window.google.maps.marker.AdvancedMarkerElement({
    map,
    position: latLng,
    title: building.name,
    content: markerDiv, // elemento HTML personalizado
  });
};
/**
 * Crea círculo de precisión para la ubicación del usuario
 */
export const createAccuracyCircle = (map, position, accuracy) => {
  const latLng = new window.google.maps.LatLng(position.lat, position.lng);

  return new window.google.maps.Circle({
    strokeColor: "#4285F4",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#4285F4",
    fillOpacity: 0.15,
    map,
    center: latLng,
    radius: accuracy,
  });
};

/**
 * Crea contenido para ventana de información de edificio
 */
export const createBuildingInfoContent = (building) => {
  const imageSrc =
    building.image && building.image.trim() !== ""
      ? building.image
      : NotFoundImg;

  return `
    <div class="info-window" style="max-height: 250px; overflow-y: auto; font-family: sans-serif; font-size: 14px; max-width: 250px;">
      <h3 class="info-title" style="color: #1976d2; margin-bottom: 6px; font-size: 16px;">${building.name}</h3>
      
      <div class="info-image-container" style="width: 100%; height: 100px; overflow: hidden; border-radius: 6px; margin-bottom: 6px;">
        <img 
          src="${imageSrc}" 
          alt="${building.name}" 
          class="info-image" 
          onclick="window.openImageModal('${imageSrc}')"
          style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; cursor: pointer;" 
        />
      </div>

      <button 
        onclick="window.openStaffModalById('${building.id}')"
        title="Ver personal del edificio"
        style="margin-bottom: 6px; padding: 4px 8px; background: #f1f1f1; border: none; border-radius: 4px; cursor: pointer;">
        👥 Ver Personal
      </button>

      <button 
        id="directions-btn-${building.id}" 
        class="info-button" 
        style="padding: 6px 12px; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer;">
        🗺️ Cómo llegar
      </button>
    </div>
  `;
};
/**
 * Hace mas grande la imagen de la ventana de información
 */
window.openImageModal = function (imageUrl) {
  const modalHtml = `
    <div id="image-modal-overlay" style="
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background-color: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    " onclick="window.closeImageModal()">
      <img src="${imageUrl}" alt="Imagen ampliada" style="
        max-width: 80%;
        max-height: 80%;
        border-radius: 8px;
        box-shadow: 0 0 20px #000;
      " onclick="event.stopPropagation()" />
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};
/**
 * Cierra la imagen de la ventana de información
 */
window.closeImageModal = function () {
  const modal = document.getElementById('image-modal-overlay');
  if (modal) modal.remove();
};


/**
 * Calcula y muestra direcciones entre dos puntos
 */
export const calculateAndShowDirections = (map, origin, destination) => {
  const directionsService = new window.google.maps.DirectionsService();
  const directionsRenderer = new window.google.maps.DirectionsRenderer({
    suppressMarkers: false,
    draggable: false,
    preserveViewport: false,
  });

  directionsRenderer.setMap(map);

  const request = {
    origin,
    destination,
    travelMode: window.google.maps.TravelMode.WALKING,
  };

  return new Promise((resolve, reject) => {
    directionsService.route(request, (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);

        const route = result.routes[0];
        const leg = route.legs[0];

        resolve({
          distance: leg.distance.text,
          duration: leg.duration.text,
          result,
        });
      } else {
        reject(new Error(`Error calculando ruta: ${status}`));
      }
    });
  });
};

/**
 * Configuración adicional del mapa para mantener vista consistente
 */
export const setupMapDefaults = (map) => {
  // Forzar vista roadmap
  enforceRoadmapView(map);

  // Deshabilitar algunos controles mediante código si no se pudo en la configuración
  const mapTypeControl =
    map.controls[window.google.maps.ControlPosition.TOP_RIGHT];
  if (mapTypeControl) {
    // Ocultar control de tipo de mapa si está presente
    mapTypeControl.clear();
  }

  // Listener adicional para interceptar cambios de vista
  map.addListener("projection_changed", () => {
    if (map.getMapTypeId() !== "roadmap") {
      map.setMapTypeId("roadmap");
    }
  });

  console.log("🔧 Configuración de mapa aplicada: vista fija en roadmap");
};
