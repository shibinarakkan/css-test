import startmarker from './assets/startmarker.png';
import stopmarker from './assets/stopmarker.png';

export function loadJS(src) {
    var ref = window.document.getElementsByTagName("script")[0];
    var script = window.document.createElement("script");
    script.src = src;
    script.async = true;
    ref.parentNode.insertBefore(script, ref);
}

export function copyToClipboard(txt) {
    let t = document.createElement('textarea');
    document.body.appendChild(t);
    t.value = txt;
    t.select();
    document.execCommand('copy');
    document.body.removeChild(t);
}

const colorConfig = {
    polyline_color: '#333',
    polygon_fill: '#fd5252', // red
    polygon_stroke: '#fd5252',
    // circle_fill: '#54abf3',
    // circle_stroke: '#54abf3',
    circle_fill: 'rgb(255, 197, 38)',
    circle_stroke: 'rgb(255, 197, 38)',
    false_polygon_fill: '#37e237', // green
    false_polygon_stroke: '#37e237',
}

export function drawGeofences(map, geofences) {
    let geofenceMap = {}
    for (let i in geofences) {
        let geofence = geofences[i];
        let info = JSON.parse(geofence.info);
        var polygon = null;
        if (info.structure === 'polygon') {
            polygon = new window.google.maps.Polygon({
                paths: info.coords,
                strokeColor: colorConfig.polygon_stroke,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: colorConfig.polygon_fill,
                fillOpacity: 0.35,
                map,
            });
            polygon.addListener('click', () => {
                setMessage(geofence.geofenceid + ' : ' + geofence.geofencename);
            });
            geofenceMap[geofence.geofenceid] = polygon;
        } else if (info.structure === 'circle') {
            var circle = new window.google.maps.Circle({
                strokeColor: colorConfig.circle_stroke,
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: colorConfig.circle_fill,
                fillOpacity: 0.35,
                map: map,
                center: info.center,
                radius: info.radius,
            });
            if (info.coords) {
                polygon = new window.google.maps.Polygon({
                    paths: info.coords,
                    strokeColor: colorConfig.false_polygon_stroke,
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: colorConfig.false_polygon_stroke,
                    fillOpacity: 0.35,
                    map,
                });
                polygon.addListener('click', () => {
                    setMessage(geofence.geofenceid + ' : ' + geofence.geofencename + ', false:circle');
                });
            }
            circle.addListener('click', () => {
                console.log(info)
                setMessage(geofence.geofenceid + ' : ' + geofence.geofencename);
            });
            geofenceMap[geofence.geofenceid] = circle;
        }
    }
    return geofenceMap;
}

function _drawPolyLine(map, path, bounds) {
    var lineSymbol = {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW
    };
    let icons = [];
    for (let i = 0; i < 4; i++) {
        icons.push({
            icon: lineSymbol,
            offset: (i / 4 * 100) + 10 + '%'
        })
    }
    let _path = [];
    path.forEach(p => {
        let coords = { lat: p.latitude, lng: p.longitude };
        _path.push(coords);
        bounds.extend(coords);
    })
    let polyline = new window.google.maps.Polyline({
        path: _path,
        geodesic: true,
        strokeColor: colorConfig.polyline_color,
        strokeOpacity: 1.0,
        strokeWeight: 2,
        icons,
        map,
    });
    let stm = new window.google.maps.Marker({
        icon: {
            url: startmarker,
            scaledSize: new window.google.maps.Size(38, 38),
        },
        map: map,
        position: _path[0],
    });
    let spm = new window.google.maps.Marker({
        icon: {
            url: stopmarker,
            scaledSize: new window.google.maps.Size(38, 38),
        },
        map: map,
        position: _path[_path.length - 1],
    });
    return [polyline, stm, spm];
}
function _drawMarkers(map, path, bounds) {
    let markers = [];
    path.forEach(p => {
        let coords = { lat: p.latitude, lng: p.longitude };
        let marker = new window.google.maps.Marker({
            position: coords,
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 5
            },
            map: map
        })
        bounds.extend(coords);
        markers.push(marker);
    });
    return markers;
}

export function drawPolyline(map, path) {
    let bounds = new window.google.maps.LatLngBounds();
    // let polyline = _drawMarkers(map, path, bounds);
    let polyline = _drawPolyLine(map, path, bounds);
    map.fitBounds(bounds);
    return polyline;
}

export function setMessage(msg) {
    let p = document.querySelector('.App');
    let el = document.createElement('div');
    el.className = 'ttx';
    el.innerText = msg;
    p.appendChild(el);
    setTimeout(() => p.removeChild(el), 3000);
}

export function drawZeroPolygon() {
    let polygon = new window.google.maps.Polygon({
        map: window.map,
        paths: [
            { lat: 1.0, lng: -1.0 },
            { lat: 1.0, lng: 1.0 },
            { lat: -1.0, lng: 1.0 },
            { lat: -1.0, lng: -1.0 },
        ],
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35,
    })
    polygon.addListener('click', () => setMessage('Nothing should come in here'));
}

export function clearPolyline(polyline) {
    if (Array.isArray(polyline)) polyline.forEach(f => f.setMap(null));
    else polyline.setMap(null);
}

export function drawVhMarker() {
    
}
