import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './App.css';
import crosshair from './assets/selector-square-border.png';
import axios from 'axios';
import '@fortawesome/fontawesome-free/css/all.min.css';
import moment from 'moment';
import io from 'socket.io-client';
import mapstyles from './config/mapconfig';
import {
  loadJS,
  copyToClipboard,
  drawGeofences,
  drawPolyline,
  setMessage,
  drawZeroPolygon,
  clearPolyline,
} from './functions';
import bluedot from './assets/blue-dot.png';
import greedot from './assets/green-dot.png';

const config = {
  mapcenter: {lat:12.973506,lng:77.594367},
  mapzoom: 12,
}

const default_markers = [
];

function callMapCallbacks(callbacks) {
  if(!window.hidden) {
    callbacks.forEach(c => c(window.map));
    callbacks.length = 0;
  }
}

const srvURL = 'https://apiplatform.intellicar.in';

const geofenceMap = {}

function getIcon(beacon) {
  let SCALE = 24;
  function getDirection() {
    let direction = Math.floor(beacon.dr / 10) * SCALE;
    if (direction > SCALE * 36) direction = SCALE * 36;
    return direction;
  }
  let url = bluedot;
  if(beacon.ig) url = greedot;
  return {
    url,
    size: new window.google.maps.Size(SCALE, SCALE),
    scaledSize: new window.google.maps.Size(SCALE, SCALE * 36),
    origin: new window.google.maps.Point(0, getDirection()),
    anchor: new window.google.maps.Point(SCALE / 2, SCALE / 2)
  }
}

function makeMarker(beacon) {
  let marker = new window.google.maps.Marker({
    position: {lat: beacon.lt, lng: beacon.ln},
    icon: getIcon(beacon),
    map: window.map,
  });
  marker.addListener('click', function() {
    setMessage(beacon.vp);
  });
  return marker;
}

function updateMarker(markerMap, beacon) {
  let vid = beacon.vp.toString();
  if(vid in markerMap) {
    let marker = markerMap[vid];
    marker.setPosition({lat: beacon.lt, lng: beacon.ln});
    marker.setIcon(getIcon(beacon));
  } else markerMap[vid] = makeMarker(beacon);
}

class App extends Component {
  state = {
    mapReady: false,
    vehicles: [],
    geofences: [],
    vehicle: '',
    loggedIn: false,
  }
  mapcallbacks = []
  markers = {}
  componentDidMount() {
    document.addEventListener('visibilitychange', this.visibilityChange);
    loadJS('https://maps.googleapis.com/maps/api/js?key=AIzaSyCTtf_3SOMerJ6WeT4roxHoFSr893OYg2Q&callback=initMap');
    window.initMap = () => {
      let center_changed = () => {
        let coords = map.getCenter();
        coords = coords.lat().toFixed(6) + ',' + coords.lng().toFixed(6);
        this.refs.coords.value = coords;
      }
      let map = new window.google.maps.Map(document.querySelector('.maph'), {
          center: config.mapcenter,
          zoom: config.mapzoom,
          // styles: mapstyles,
      });
      window.map = map;
      drawZeroPolygon();
      center_changed();
      map.addListener('center_changed', center_changed);
      this.map = map;
      this.setState({mapReady: true});
      callMapCallbacks(this.mapcallbacks);
      default_markers.forEach(f => {
        let marker = new window.google.maps.Marker({
          position: {lat: f[0], lng: f[1]},
          map,
        });
        marker.addListener('click', () => {
          marker.setMap(null);
        });
      });
    };
    let onLogin = () => {
      this.getMyGeofences();
      this.getMyVehicles();
      this.initRealtime();
    };
    window.login = (username, password) => {
      this.login(onLogin, {username, password});
    };
  }
  initRealtime = () => {
    let socket = io.connect(srvURL);
    socket.on('connect', () => {
      // console.log('connection')
      // setTimeout(() => {
        // console.log('logging')
        socket.emit('authtoken', localStorage.getItem('token'));
        socket.on('authsuccess', () => {
          // console.log('auth success')
          socket.emit('subscribe', {data: [{datarequested: ['gps'], vehicleid: ['all']}]});
          socket.on('subscribesuccess', payload => {
            if(payload.datarequested.includes('gps')) {
              socket.emit('getnextbucket');
            }
          });
          socket.on('gpsrt', this.onGpsIncoming);
        });
      // }, 3000);
    });
    this.socket = socket;
  }
  onGpsIncoming = payload => {
    for(let i in payload[1]) {
      let beacon = payload[1][i];
      updateMarker(this.markers, beacon);
    }
    if(!this.bucketsReceived) {
      if(payload[1].length === 0) this.bucketsReceived = true;
      else this.socket.emit('getnextbucket');
    }
  }
  visibilityChange = () => {
    if(this.mapcallbacks.length) callMapCallbacks(this.mapcallbacks);
  }
  login = (cb, creds) => {
    let token = localStorage.getItem('token');
    if(creds) axios.post(srvURL + '/gettoken', {
      user: creds
    }).then(rsp => {
      localStorage.setItem('token', rsp.data.data.token);
      cb();
    }); else if(token) axios.post(srvURL + '/verifytoken', {token}).then(rsp => {
      cb();
    });
  }
  getMyVehicles = () => {
    let token = localStorage.getItem('token');
    axios.post(srvURL + '/api/vehicle/list', {
      token, groupid: 1, recursive: 1, vehicletype: 'all'
    }).then(rsp => {
      let vehicles = rsp.data.data;
      this.setState({vehicles});
    })
  }
  getMyGeofences = () => {
    let token = localStorage.getItem('token');
    axios.post(srvURL + '/api/geofence/getmygeofences', {
      token, groupid: 1
    }).then(rsp => {
      let geofences = rsp.data.data;
      this.setState({geofences});
      let cb = () => Object.assign(geofenceMap, drawGeofences(this.map, geofences));
      if(window.google && !window.hidden) cb();
      else this.mapcallbacks.push(cb);
    })
  }
  getVehiclePath = (vehicle, cb) => {
    let token = localStorage.getItem('token');
    let now = moment().startOf('day').hour(8).valueOf();
    axios.post(srvURL + '/api/reports/rtgps/trackhistory', {
      token, vehicleid: vehicle.vehicleid, starttime: now - 86400000, endtime: now
    }).then(rsp => {
      console.log('bad coordinates', vehicle.vehicleno, rsp.data.data.filter(g => g.latitude > -1 && g.latitude < 1 && g.longitude > -1 && g.longitude < 1));
      let path = rsp.data.data.filter(g => g.latitude != 0 && g.longitude != 0 && !(g.latitude < 1 && g.latitude > -1) && !(g.longitude < 1 && g.longitude > -1));
      if(path.length === 0) setMessage('no rtgps path');
      cb(path);
    });
  }
  render() {
    let CenterTin = () => {
      let onClick = e => {
        let coords = this.refs.coords.value;
        copyToClipboard(coords);
        setMessage('Copied to clipboard');
      }
      let onCoordsChange = e => {
        if(e.keyCode == 13) {
          let coords = e.target.value.split(',');
          let lat = parseFloat(coords[0].trim());
          let lng = parseFloat(coords[1].trim());
          this.map.setCenter({lat,lng});
        }
      }
      return <div className="tin grn">
        <div className="tinf">Center</div>
        <div className="ting"><input ref="coords" onKeyDown={onCoordsChange} /> <button className="sd" {...{onClick}}><i className="fa fa-copy"></i></button></div>
      </div>
    }
    let GeofenceList = () => {
      return <div className="tin pur">
        <div className="tinf">Geofences</div>
        <div className="ting">
          {this.state.geofences.map(g => {
            let info = JSON.parse(g.info);
            let onClick = () => {
              // console.log(geofenceMap[g.geofenceid])
              let gf = geofenceMap[g.geofenceid];
              if(gf) {
                if(gf.getBounds) {
                  let bounds = gf.getBounds();
                  this.map.fitBounds(bounds);
                } else if(gf.getPath) {
                  console.log(gf)
                  let bounds = new window.google.maps.LatLngBounds();
                  let points = gf.getPath().getArray();
                  for(let i in points) {
                    bounds.extend({lat: points[i].lat(), lng: points[i].lng()});
                  }
                  this.map.fitBounds(bounds);
                }
                // this.map.setCenter()
              }
            }
            return <button key={g.geofenceid} {...{onClick}}>{g.geofenceid} - {g.geofencename} - {info.structure}</button>
          })}
        </div>
      </div>
    }
    let VehicleList = () => {
      return <div className="tin blu">
        <div className="tinf">Vehicles</div>
        <div className="ting">
          {this.state.vehicles.map(v => {
            let onClick = () => {
              if(this.polyline) clearPolyline(this.polyline);
              this.getVehiclePath(v, path => {
                if(path.length) this.polyline = drawPolyline(this.map, path);
              });
              this.setState({vehicle:v.vehicleid});
            }
            let className = this.state.vehicle === v.vehicleid ? 'active' : '';
            return <button key={v.vehicleid} {...{onClick,className}}>{v.vehicleid} - {v.vehicleno}</button>
          })}
        </div>
      </div>
    }
    return (
      <div className="App">
        <div className="map">
          <div className="maph"></div>
          <div className="mapc">
            <img src={crosshair} alt="crosshair" />
          </div>
        </div>
        <div className="tools">
          {CenterTin()}
          <GeofenceList />
          <VehicleList />
        </div>
      </div>
    );
  }
}

export default App;
