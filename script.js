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
let userLon = 0;

// markers
let viewMarker;
let navMarkerStartingPoint;
let navMarkerDestinationPoint;

// navigation mode: "drive", "walk", "bicycle", "transit"
let navigationMode = "bicycle";

// control to the map for zooming in and out
map.addControl(new mapboxgl.NavigationControl(), "top-right");

// mouse click event handler for the map
map.addInteraction("click-event", {
  type: "click",
  handler: (e) => {
    console.log(`Clicked at: ${e.lngLat.lng}, ${e.lngLat.lat}`);

    // create a Marker at a coordinate where the user clicks on the map

    // if the user is in view mode, create a red marker that can be dragged to a new location
    if (interactionMode === "view") {
      placeViewMarker(e.lngLat.lng, e.lngLat.lat);
    } else if (interactionMode === "nav") {
      // if the user is in navigation mode, create a blue marker for the starting point and a green marker for the destination point
      // if both markers already exist, remove them and create a new blue marker for the starting point
      if (!navMarkerStartingPoint) {
        navMarkerStartingPoint = new mapboxgl.Marker({
          color: "#0000FF",
          draggable: "true",
        })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .addTo(map);
        navMarkerStartingPoint.on("dragend", (e) =>
          onDragEnd(navMarkerStartingPoint),
        );
      } else if (!navMarkerDestinationPoint) {
        navMarkerDestinationPoint = new mapboxgl.Marker({
          color: "#00FF00",
          draggable: "true",
        })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .addTo(map);
        navMarkerDestinationPoint.on("dragend", (e) =>
          onDragEnd(navMarkerDestinationPoint),
        );
      } else {
        // if both markers are on the map
        cleanMap();

        // remove map layers and sources
        if (map.getLayer("route-layer")) {
          map.removeLayer("route-layer");
        }

        if (map.getLayer("points-layer")) {
          map.removeLayer("points-layer");
        }

        if (map.getSource("route")) {
          map.removeSource("route");
        }

        if (map.getSource("points")) {
          map.removeSource("points");
        }

        navMarkerStartingPoint = new mapboxgl.Marker({
          color: "#0000FF",
          draggable: "true",
        })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .addTo(map);
        navMarkerStartingPoint.on("dragend", (e) =>
          onDragEnd(navMarkerStartingPoint),
        );
        navMarkerDestinationPoint = null;
      } // inner if
    } // outer if
  }, // handler
});

// main logic starts here
window.onload = async () => {
  try {
    await updateUserLocation();
    if (userLat && userLon) {
      flyToLocation(userLon, userLat);
      placeViewMarker(userLon, userLat);
    }
  } catch (error) {
    console.warn("Location access failed:", error.message);

    // continue without location
  }
}; // window.onload

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
      },
      (err) => console.log(err),
    );
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
function switchMode() {
  // remove all markers, layers and sources from the map
  cleanMap();

  // switch interaction mode
  if (interactionMode === "view") {
    interactionMode = "nav";
  } else {
    interactionMode = "view";
  }
} // switchMode

// update user location
function updateUserLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLat = `${position.coords.latitude}`;
        userLon = `${position.coords.longitude}`;
        console.log(
          "updateUserLocation: User location: " + userLat + ", " + userLon,
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
function flyToLocation(lon, lat) {
  map.flyTo({ center: [lon, lat] });
} // flyToLocation

function placeViewMarker(lon, lat) {
  if (viewMarker) viewMarker.remove();
  viewMarker = new mapboxgl.Marker({
    color: "#FF0000",
    draggable: "true",
  })
    .setLngLat([lon, lat])
    .addTo(map);
  viewMarker.on("dragend", (e) => onDragEnd(viewMarker));
} // placeViewMarker

// remove all markers, layers and sources from the map
function cleanMap() {
  // remove markers
  if (viewMarker) {
    viewMarker.remove();
  }

  if (navMarkerStartingPoint) {
    navMarkerStartingPoint.remove();
  }
  if (navMarkerDestinationPoint) {
    navMarkerDestinationPoint.remove();
  }

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
    if (userLat && userLon) {
      flyToLocation(userLon, userLat);
    }
  });
} // redirectToUserLocation

// change navigation mode
function setNavigationMode(method) {
  navigationMode = method;
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
    return (time / 3600).toFixed(2) + " hr";
  } else if (time >= 60) {
    return (time / 60).toFixed(2) + " min";
  } else {
    return time.toFixed(0) + " s";
  }
} // makeTimePrettier
