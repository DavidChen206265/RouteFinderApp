mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const map = new mapboxgl.Map({
    container: 'map', // container ID
    center: [-123.3742906693874, 48.45312301560749], // starting position [lng, lat]. Note that lat must be set between -90 and 90
    zoom: 15 // starting zoom
});

let interactionMode = "nav"; // modes: "view" and "nav"

let viewMarker;
let navMarkerStartingPoint;
let navMarkerDestinationPoint;

map.addInteraction('map-click', {
    type: 'click',
    handler: (e) => {
        console.log(`Clicked at: ${e.lngLat.lng}, ${e.lngLat.lat}`);

        // create a Marker at a coordinate where the user clicks on the map

        // if the user is in view mode, create a red marker that can be dragged to a new location
        if (interactionMode === "view") {

            if (viewMarker) viewMarker.remove();
            viewMarker = new mapboxgl.Marker({
                color: '#FF0000',
                draggable: 'true'
            })
                .setLngLat([e.lngLat.lng, e.lngLat.lat])
                .addTo(map);
            viewMarker.on('dragend', (e) => onDragEnd(viewMarker));

        } else if (interactionMode === "nav") {

            // if the user is in navigation mode, create a blue marker for the starting point and a green marker for the destination point
            // if both markers already exist, remove them and create a new blue marker for the starting point

            if (!navMarkerStartingPoint) {
                navMarkerStartingPoint = new mapboxgl.Marker({
                    color: '#0000FF',
                    draggable: 'true'
                })
                    .setLngLat([e.lngLat.lng, e.lngLat.lat])
                    .addTo(map);
                navMarkerStartingPoint.on('dragend', (e) => onDragEnd(navMarkerStartingPoint));
            }
            else if (!navMarkerDestinationPoint) {
                navMarkerDestinationPoint = new mapboxgl.Marker({
                    color: '#00FF00',
                    draggable: 'true'
                })
                    .setLngLat([e.lngLat.lng, e.lngLat.lat])
                    .addTo(map);
                navMarkerDestinationPoint.on('dragend', (e) => onDragEnd(navMarkerDestinationPoint));
            }
            else {
                navMarkerStartingPoint.remove();
                navMarkerDestinationPoint.remove();
                navMarkerStartingPoint = new mapboxgl.Marker({
                    color: '#0000FF',
                    draggable: 'true'
                })
                    .setLngLat([e.lngLat.lng, e.lngLat.lat])
                    .addTo(map);
                navMarkerStartingPoint.on('dragend', (e) => onDragEnd(navMarkerStartingPoint));
                navMarkerDestinationPoint = null;
            } // inner if
        } // outer if
    } // handler
});

function onDragEnd(marker) {
    console.log(marker.getLngLat().lng + ', ' + marker.getLngLat().lat);
} // onDragEnd

// commit test