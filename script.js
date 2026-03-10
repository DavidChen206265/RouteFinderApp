apiKeyMapbox = CONFIG.API_KEY_MAPBOX;
apiKeyGeoapify = CONFIG.API_KEY_GEOAPIFY;
mapboxgl.accessToken = apiKeyMapbox;

// map initialization
const map = new mapboxgl.Map({
  container: "map", // container ID
  center: [-123.3742906693874, 48.45312301560749], // starting position [lng, lat]. Note that lat must be set between -90 and 90
  zoom: 15, // starting zoom
});

// popup initialization
const popup = new mapboxgl.Popup();

// modes: "view" and "nav"
let interactionMode = "view";

// user location
let userLat = 0;
let userLng = 0;

// markers
let userLocationMarker;
let viewMarker;
let navMarkerStartingPoint;
let navMarkerDestinationPoint;

// navigation modes: "drive", "walk", "bicycle", "transit"
let navigationMode = "drive";

// navigation variables
let routeData;

// time helper variables
let locationUpdater;
// should be 5 seconds, but set to 30 seconds to show fewer console logs for testing
const LOCATION_UPDATE_INTERVAL = 30 * 1000;

// HTML element references
const interactionModeButton = document.getElementById(
  "interaction-mode-button",
);
const navModeDropdown = document.getElementById("nav-mode-dropdown");
const calculateRouteButton = document.getElementById("calculate-route-button");
const routeInformationDisplay = document.getElementById(
  "route-information-display",
);

// mouse click event handler for the map
map.addInteraction("click-event", {
  type: "click",
  handler: (e) => {
    // if the user is in view mode, create a red marker that can be dragged to a new location
    if (interactionMode === "view") {
      placeViewMarker(e.lngLat.lng, e.lngLat.lat);
    } else if (interactionMode === "nav") {
     
      if (!navMarkerStartingPoint) {

        // place the starting point marker
        cleanMap(true);
        placeStartingPointMarker(e.lngLat.lng, e.lngLat.lat);
      } else if (!navMarkerDestinationPoint) {
        // place the destination point marker
        placeDestinationPointMarker(e.lngLat.lng, e.lngLat.lat);
        calculateRouteButton.style.display = "block";
      } else {

        // if both markers are on the map
        // remove the existing destination point marker but keep the starting point marker, and create a new blue marker for the starting point at the clicked location
        cleanMap(true);
        placeStartingPointMarker(e.lngLat.lng, e.lngLat.lat);
      } // inner if
    } // outer if
  }, // handler
});

// main logic starts here
window.onload = async () => {
  // initialize map with user location and put the first user location marker
  try {
    await placeUserLocationMarker();
    if (userLat && userLng) {
      flyToLocation(userLng, userLat);
    }
  } catch (error) {
    console.warn("Location access failed:", error.message);
  } // catch

  // initialize navigation mode buttons
  setNavigationMode(navigationMode);

  // set up an interval to update user location
  locationUpdater = setInterval(() => {
    locationUpdateHandler();
  }, LOCATION_UPDATE_INTERVAL);
}; // window.onload

// drag end event handler for the markers
function onDragEnd(marker) {
  console.log(marker.getLngLat().lng + ", " + marker.getLngLat().lat);
} // onDragEnd

// find a route between the starting point and the destination point
function findRoute() {
  // return if starting point or destination is not selected
  if (!navMarkerStartingPoint || !navMarkerDestinationPoint) return;

  let startingPoint =
    navMarkerStartingPoint.getLngLat().lat +
    "," +
    navMarkerStartingPoint.getLngLat().lng;
  let destinationPoint =
    navMarkerDestinationPoint.getLngLat().lat +
    "," +
    navMarkerDestinationPoint.getLngLat().lng;
  const requestOptions = {
    method: "GET",
    redirect: "follow",
  };

  try {
  fetch(
    "https://api.geoapify.com/v1/routing?waypoints=" +
      startingPoint +
      "|" +
      destinationPoint +
      "&mode=" +
      navigationMode +
      "&apiKey=" +
      apiKeyGeoapify,
    requestOptions,
  )
    .then((res) => res.json())
    .then(
      (routeResult) => {
        routeData = routeResult;
        const steps = [];
        const instructions = [];
        const stepPoints = [];

        console.log(routeData);

        // catch explicit API errors 
        if (routeData.error) {
          console.warn("API Routing Error:", routeData.message);
          alert(`Routing failed: ${routeData.message}`);
          routeData = null; 
          cleanMap(false); 
          return;
        }

        // catch valid requests that just return zero routes
        if (!routeData.features || routeData.features.length === 0) {
          alert("No route found between these two locations.");
          console.warn("No route data found.");
          routeData = null; 
          cleanMap(false);
          return;
        }

        routeData.features[0].properties.legs.forEach((leg, legIndex) => {
          const legGeometry =
            routeData.features[0].geometry.coordinates[legIndex];
          leg.steps.forEach((step, index) => {
            if (step.instruction) {
              instructions.push({
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: legGeometry[step.from_index],
                },
                properties: {
                  text: step.instruction.text,
                },
              });
            }

            if (index !== 0) {
              stepPoints.push({
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: legGeometry[step.from_index],
                },
                properties: step,
              });
            }

            if (step.from_index === step.to_index) {
              // destination point
              return;
            }

            const stepGeometry = legGeometry.slice(
              step.from_index,
              step.to_index + 1,
            );
            steps.push({
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: stepGeometry,
              },
              properties: step,
            });
          });
        });

        routeStepsData = {
          type: "FeatureCollection",
          features: steps,
        };

        instructionsData = {
          type: "FeatureCollection",
          features: instructions,
        };

        stepPointsData = {
          type: "FeatureCollection",
          features: stepPoints,
        };

        map.addSource("route", {
          type: "geojson",
          data: routeData,
        });

        map.addSource("points", {
          type: "geojson",
          data: instructionsData,
        });

        addLayerEvents();
        drawRoute();

        // update the route information display with the time and distance of the route
        updateRouteInformationDisplay();
      },
      (err) => console.log(err),
    );
  } catch (error) {
    console.error("Error fetching route data:", error);
    alert("An error occurred while fetching the route data. Please try again.");
  }
} // findRoute

function drawRoute() {
  if (!routeData) {
    return;
  }

  if (map.getLayer("route-layer")) {
    map.removeLayer("route-layer");
  }

  if (map.getLayer("points-layer")) {
    map.removeLayer("points-layer");
  }

  map.getSource("route").setData(routeStepsData);
  map.addLayer({
    id: "route-layer",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": [
        "match",
        ["get", "road_class"],
        "motorway",
        "#009933",
        "trunk",
        "#00cc99",
        "primary",
        "#009999",
        "secondary",
        "#00ccff",
        "tertiary",
        "#9999ff",
        "residential",
        "#9933ff",
        "service_other",
        "#ffcc66",
        "unclassified",
        "#666699",
        /* other */
        "#666699",
      ],
      "line-width": 8,
    },
  });

  map.getSource("points").setData(stepPointsData);
  map.addLayer({
    id: "points-layer",
    type: "circle",
    source: "points",
    paint: {
      "circle-radius": 4,
      "circle-color": "#ddd",
      "circle-stroke-color": "#aaa",
      "circle-stroke-width": 1,
    },
  });
} // drawRoute

function addLayerEvents() {
  map.on("mouseenter", "route-layer", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "route-layer", () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("mouseenter", "points-layer", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "points-layer", () => {
    map.getCanvas().style.cursor = "";
  });

  map.on("mouseenter", "route-layer", (e) => {
    let popupDistance = makeDistancePrettier(e.features[0].properties.distance);
    let popupTime = makeTimePrettier(e.features[0].properties.time);

    showPopup(
      {
        distance: `${popupDistance}`,
        time: `${popupTime}`,
      },
      e.lngLat,
    );

    e.preventDefault();
  });

  map.on("click", "points-layer", (e) => {
    const properties = e.features[0].properties;
    const point = e.features[0].geometry.coordinates;

    if (properties.text) {
      popup.setText(properties.text);
      popup.setLngLat(point);
      popup.addTo(map);
      e.preventDefault();
    }
  });
}

function showPopup(data, lngLat) {
  let popupHtml = Object.keys(data)
    .map((key) => {
      return `<div class="popup-property-container">
                    <span class="popup-property-label">${key}: </span>
          <span class="popup-property-value">${data[key]}</span>
        </div>`;
    })
    .join("");

  popup.setLngLat(lngLat).setHTML(popupHtml).addTo(map);
} // showPopup

// switch between view mode and navigation mode
function switchInteractionMode() {
  // switch interaction mode
  if (interactionMode === "view") {
    // switch to navigation mode
    interactionMode = "nav";

    // set the route to the view marker location as default
    if (viewMarker && userLocationMarker) {
      placeStartingPointMarker(
        viewMarker.getLngLat().lng,
        viewMarker.getLngLat().lat,
      );
      placeDestinationPointMarker(
        userLocationMarker.getLngLat().lng,
        userLocationMarker.getLngLat().lat,
      );
      findRoute();

      // reserve the new nav markers, only remove the view marker
      cleanMap(false);
      if (viewMarker) {
        viewMarker.remove();
        viewMarker = null;
      } // inner if
    } else {
      cleanMap(true);
    } // outer if

    // update UI elements
    interactionModeButton.style.backgroundColor = "rgb(59, 92, 190)";
    interactionModeButton.innerHTML = "Explore";
    navModeDropdown.style.display = "grid";
  } else {
    // switch to view mode
    interactionMode = "view";

    // update UI elements
    cleanMap(true);
    interactionModeButton.style.backgroundColor = "rgb(89, 130, 255)";
    interactionModeButton.innerHTML = "Navigate";
    navModeDropdown.style.display = "none";
  } // else
} // switchInteractionMode

// update user location
function updateUserLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLat = `${position.coords.latitude}`;
        userLng = `${position.coords.longitude}`;
        console.log(
          "updateUserLocation: User location: lat_" +
            userLat +
            ", lng_" +
            userLng,
        );
        resolve();
      },
      (error) => {
        console.error(error);
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
} // updateUserLocation

// fly to a location on the map
function flyToLocation(lng, lat) {
  map.flyTo({ center: [lng, lat] });
} // flyToLocation

// place the view marker on the map at the specified location, or move it to the new location if it already exists. The view marker is a red marker that can be dragged to a new location to update the view.
function placeViewMarker(lng, lat) {
  if (viewMarker) {
    viewMarker.setLngLat([lng, lat]);

    // Update the popup text if the marker moves
    viewMarker.getPopup().setHTML(`
      <h4>Target Location</h4>
      <p>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}</p>
    `);

    // ✅ FIX: Force the popup to open if it is currently closed
    if (!viewMarker.getPopup().isOpen()) {
      viewMarker.togglePopup();
    }
  } else {
    // 1. Create the popup object
    const markerPopup = new mapboxgl.Popup({ offset: 25 }) // offset lifts it slightly above the pin
      .setHTML(`
        <h4>Target Location</h4>
        <p>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}</p>
      `);

    // 2. Attach the popup to the marker when you create it
    viewMarker = new mapboxgl.Marker({
      color: "#FF0000",
      draggable: true,
    })
      .setLngLat([lng, lat])
      .setPopup(markerPopup)
      .addTo(map)
      .togglePopup(); // ✅ FIX: Opens immediately upon creation

    viewMarker.on("dragend", (e) => {
      onDragEnd(viewMarker);
      // Update popup coords when dragging finishes
      const newCoords = viewMarker.getLngLat();
      viewMarker.getPopup().setHTML(`
          <h4>Target Location</h4>
          <p>Lat: ${newCoords.lat.toFixed(4)}<br>Lng: ${newCoords.lng.toFixed(4)}</p>
        `);
    });
  }

  console.log(
    "placeViewMarker: View marker placed at: lat_" + lat + ", lng_" + lng,
  );
} // placeViewMarker

// place the starting point marker on the map at the specified location, or move it to the new location if it already exists. The starting point marker is a blue marker that can be dragged to a new location to update the starting point for navigation.
function placeStartingPointMarker(lng, lat) {
  if (navMarkerStartingPoint) {
    navMarkerStartingPoint.setLngLat([lng, lat]);
  } else {
    navMarkerStartingPoint = new mapboxgl.Marker({
      color: "#0000FF",
      draggable: "true",
    })
      .setLngLat([lng, lat])
      .addTo(map);
    navMarkerStartingPoint.on("dragend", (e) =>
      onDragEnd(navMarkerStartingPoint),
    );
  }
  console.log(
    "placeStartingPointMarker: Starting point marker placed at: lat_" +
      lat +
      ", lng_" +
      lng,
  );
} // placeStartingPointMarker

// place the destination point marker on the map at the specified location, or move it to the new location if it already exists. The destination point marker is a green marker that can be dragged to a new location to update the destination point for navigation.
function placeDestinationPointMarker(lng, lat) {
  if (navMarkerDestinationPoint) {
    navMarkerDestinationPoint.setLngLat([lng, lat]);
  } else {
    navMarkerDestinationPoint = new mapboxgl.Marker({
      color: "#00FF00",
      draggable: "true",
    })
      .setLngLat([lng, lat])
      .addTo(map);
    navMarkerDestinationPoint.on("dragend", (e) =>
      onDragEnd(navMarkerDestinationPoint),
    );
  }
  console.log(
    "placeDestinationPointMarker: Destination point marker placed at: lat_" +
      lat +
      ", lng_" +
      lng,
  );
} // placeDestinationPointMarker

// place the user location marker on the map at the specified location, or move it to the new location if it already exists. The user location marker is a blue marker that cannot be dragged.
async function placeUserLocationMarker() {
  // try to update user location first, and if it fails, do not place the user location marker on the map and return directly. This is to prevent the case where the user location marker is placed on the map at a default location (0, 0) when the user denies location access or when there is an error in getting the user location.
  try {
    await updateUserLocation();
  } catch (error) {
    console.warn(
      "placeUserLocationMarker: Location access failed:",
      error.message,
    );

    // remove the user location marker from the map if it exists
    if (userLocationMarker) {
      userLocationMarker.remove();
      userLocationMarker = null;
    } // if

    return;
  } // catch

  // place the user location marker
  if (userLocationMarker) {
    userLocationMarker.setLngLat([userLng, userLat]);
  } else {
    userLocationMarker = new mapboxgl.Marker({
      color: "#0D81DB",
    })
      .setLngLat([userLng, userLat])
      .addTo(map);
  } // else

  console.log(
    "placeUserLocationMarker: User location marker placed at: lat_" +
      userLat +
      ", lng_" +
      userLng,
  );
} // placeUserLocationMarker

// remove all markers, layers and sources from the map
function cleanMap(removeMarkers) {
  // remove markers
  calculateRouteButton.style.display = "none";

  if (removeMarkers) {
    if (viewMarker) {
      viewMarker.remove();
      viewMarker = null;
    }

    if (navMarkerStartingPoint) {
      navMarkerStartingPoint.remove();
      navMarkerStartingPoint = null;
    }

    if (navMarkerDestinationPoint) {
      navMarkerDestinationPoint.remove();
      navMarkerDestinationPoint = null;
    }
  } // if removeMarkers

  // remove map layers
  if (map.getLayer("route-layer")) {
    map.removeLayer("route-layer");
  }

  if (map.getLayer("points-layer")) {
    map.removeLayer("points-layer");
  }

  // remove map sources
  if (map.getSource("route")) {
    map.removeSource("route");
  }

  if (map.getSource("points")) {
    map.removeSource("points");
  }
} // cleanMap

function redirectToUserLocation() {
  updateUserLocation().then(() => {
    if (userLat && userLng) {
      flyToLocation(userLng, userLat);
      console.log(
        "redirectToUserLocation: Redirected to user location: lat_" +
          userLat +
          ", lng_" +
          userLng,
      );
    } // if
  });
} // redirectToUserLocation

// change navigation mode
function setNavigationMode(method) {
  // clean the map but keep the navigation markers if they exist, so that the route can be re-drawn with the new navigation mode without having to set the starting point and destination point again
  cleanMap(false);
  navigationMode = method;

  // re-draw the route with the new navigation mode
  if (navMarkerStartingPoint && navMarkerDestinationPoint) {
    findRoute();
  }

  // update the buttons' background color
  document.querySelectorAll(".nav-mode-options").forEach((option) => {
    if (option.id != "route-information-display") {
      option.style.backgroundColor = "rgb(89, 130, 255)";
    }
  });
  document.getElementById("nav-mode-option-" + method).style.backgroundColor =
    "rgb(59, 92, 190)";

  console.log("Navigation mode set to: " + navigationMode);
} // setNavigationMode

function makeDistancePrettier(distance) {
  if (distance >= 1000) {
    return (distance / 1000).toFixed(2) + " km";
  } else {
    return distance.toFixed(0) + " m";
  }
} // makeDistancePrettier

function makeTimePrettier(time) {
  if (time >= 3600) {
    return (
      (time / 3600).toFixed(0) +
      " hr " +
      ((time % 3600) / 60).toFixed(0) +
      " min"
    );
  } else if (time >= 60) {
    return Math.round(time / 60) + " min";
  } else {
    return "Less than 1 min";
  }
} // makeTimePrettier

function updateRouteInformationDisplay() {
  if (routeData) {
    routeInformationDisplay.innerHTML = `${makeTimePrettier(routeData.features[0].properties.time)} (${makeDistancePrettier(routeData.features[0].properties.distance)})`;
    console.log("Route information updated."); // test
  } else {
    routeInformationDisplay.innerHTML = "Time (Distance)";
    console.log("No route data available to update route information display."); // test
    return;
  }
} // updateRouteInformationDisplay

function locationUpdateHandler() {
  // place the user location marker
  placeUserLocationMarker().catch((error) => {
    console.warn("Background location update failed:", error?.message);
  });
} // locationUpdateHandler
