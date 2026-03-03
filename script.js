mapboxgl.accessToken = '';
const map = new mapboxgl.Map({
    container: 'map', // container ID
    center: [-123.3742906693874, 48.45312301560749], // starting position [lng, lat]. Note that lat must be set between -90 and 90
    zoom: 15 // starting zoom
});

let mapMode = "view"; //modes: "view" and "nav"

let marker1;

map.addInteraction('map-click', {
    type: 'click',
    handler: (e) => {
        console.log(`Clicked at: ${e.lngLat.lng}, ${e.lngLat.lat}`);

        // create a marker at a coordinate
            if (marker1) marker1.remove();
            marker1 = new mapboxgl.Marker({
                color: '#FF0000',
                draggable: 'true'
            })
                .setLngLat([e.lngLat.lng, e.lngLat.lat])
                .addTo(map);
            marker1.on('dragend', onDragEnd);

    }

});

function onDragEnd() {
    console.log(marker1.getLngLat().lng + ", " + marker1.getLngLat().lat);
}
