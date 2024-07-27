document.addEventListener("DOMContentLoaded", function() {
    const map = L.map('map').setView([46.603354, 1.888334], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let radarData = [];
    let userCircle;
    let radarMarkers = [];

    const fetchData = async () => {
        try {
            const response = await fetch('https://cdn.statically.io/gh/PoivronPoivreux/cdn/main/all.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            radarData = await response.json();
        } catch (error) {
            console.error('Error fetching the data:', error);
        }
    };

    const filterRadars = (lat, lng, radius = 10) => {
        return radarData.filter(radar => {
            const distance = getDistanceFromLatLonInKm(lat, lng, radar.lat, radar.lng);
            return distance <= radius;
        });
    };

    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d;
    };

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    };

    const updateMap = (position) => {
        const { latitude, longitude } = position.coords;

        if (!userCircle) {
            userCircle = L.circleMarker([latitude, longitude], {
                radius: 8,
                color: '#3388ff',
                fillColor: '#3388ff',
                fillOpacity: 0.5
            }).addTo(map).bindPopup(`Coordonnées: ${latitude}, ${longitude}`);
        } else {
            userCircle.setLatLng([latitude, longitude]);
        }

        map.panTo([latitude, longitude]);

        radarMarkers.forEach(marker => map.removeLayer(marker));
        radarMarkers = [];

        const nearbyRadars = filterRadars(latitude, longitude);
        nearbyRadars.forEach(radar => {
            if (radar.lat && radar.lng) {
                const marker = L.marker([radar.lat, radar.lng])
                    .bindPopup(`
                        <b>Type:</b> ${radar.typeLabel}<br>
                        <b>ID:</b> ${radar.id}<br>
                        <b>Coordonnées:</b> ${radar.lat}, ${radar.lng}
                    `)
                    .addTo(map);
                radarMarkers.push(marker);
            }
        });
    };

    const errorCallback = (error) => {
        switch(error.code) {
            case error.PERMISSION_DENIED:
                console.error("User denied the request for Geolocation.");
                break;
            case error.POSITION_UNAVAILABLE:
                console.error("Location information is unavailable.");
                break;
            case error.TIMEOUT:
                console.error("The request to get user location timed out.");
                break;
            case error.UNKNOWN_ERROR:
                console.error("An unknown error occurred.");
                break;
        }
    };

    fetchData().then(() => {
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(updateMap, errorCallback, {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            });
        } else {
            console.error("Geolocation is not supported by this browser.");
        }
    });
});
