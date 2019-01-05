import React, { Component } from 'react';
import './App.css';
import crosshair from './assets/selector-square-border.png';
import axios from 'axios';
import '@fortawesome/fontawesome-free/css/all.min.css';

function loadJS(src) {
  var ref = window.document.getElementsByTagName("script")[0];
  var script = window.document.createElement("script");
  script.src = src;
  script.async = true;
  ref.parentNode.insertBefore(script, ref);
}

function copyToClipboard(txt) {
  let t = document.createElement('textarea');
  document.body.appendChild(t);
  t.value = txt;
  t.select();
  document.execCommand('copy');
  document.body.removeChild(t);
}

function drawGeofences(map, geofences) {
  for(let i in geofences) {
    let geofence = geofences[i];
    let info = JSON.parse(geofence.info);
    if(info.structure === 'polygon') {
      var polygon = new window.google.maps.Polygon({
        paths: info.coords,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35,
        map,
      });
      geofenceMap[geofence.geofenceid] = polygon;
    } else if(info.structure === 'circle') {
      var circle = new window.google.maps.Circle({
        strokeColor: '#0000FF',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#0000FF',
        fillOpacity: 0.35,
        map: map,
        center: info.center,
        radius: info.radius
      });
      if(info.coords) {
        var polygon = new window.google.maps.Polygon({
          paths: info.coords,
          strokeColor: '#00FF00',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#00FF00',
          fillOpacity: 0.35,
          map,
        });
      }
      circle.addListener('click', () => {
        console.log(info)
        setMessage(geofence.geofenceid + ' : ' + geofence.geofencename);
      });
      geofenceMap[geofence.geofenceid] = circle;
    }
  } 
}

function _drawPolyLine(map, path, bounds) {
  var lineSymbol = {
    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW
  };
  let icons = [];
  for(let i = 0; i < 4; i++) {
    icons.push({
      icon: lineSymbol,
      offset: (i/4*100) + 10 + '%'
    })
  }
  let _path = [];
  path.forEach(p => {
    let coords = {lat: p.latitude, lng: p.longitude};
    _path.push(coords);
    bounds.extend(coords);
  })
  let polyline = new window.google.maps.Polyline({
    path: _path,
    geodesic: true,
    strokeColor: '#000000',
    strokeOpacity: 1.0,
    strokeWeight: 2,
    icons,
    map,
  });
  return polyline;
}
function _drawMarkers(map, path, bounds) {
  let markers = [];
  path.forEach(p => {
    let coords = {lat: p.latitude, lng: p.longitude};
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

function drawPolyline(map, path) {
  let bounds = new window.google.maps.LatLngBounds();
  // let polyline = _drawMarkers(map, path, bounds);
  let polyline = _drawPolyLine(map, path, bounds);
  map.fitBounds(bounds);
  return polyline;
}

function setMessage(msg) {
  let p = document.querySelector('.App');
  let el = document.createElement('div');
  el.className = 'ttx';
  el.innerText = msg;
  p.appendChild(el);
  setTimeout(() => p.removeChild(el), 3000);
}

const url = 'https://apiplatform.intellicar.in';

const geofenceMap = {}

class App extends Component {
  state = {
    mapReady: false,
    vehicles: [],
    geofences: [],
    vehicle: '',
  }
  mapcallbacks = []
  componentDidMount() {
    loadJS('https://maps.googleapis.com/maps/api/js?key=AIzaSyCTtf_3SOMerJ6WeT4roxHoFSr893OYg2Q&callback=initMap');
    window.initMap = () => {
      const center = {lat: 12.933128, lng: 77.653256};
      let center_changed = () => {
        let coords = map.getCenter();
        coords = coords.lat().toFixed(6) + ',' + coords.lng().toFixed(6);
        this.refs.coords.value = coords;
      }
      let map = new window.google.maps.Map(document.querySelector('.maph'), {
          center,
          zoom: 13,
      });
      center_changed();
      map.addListener('center_changed', center_changed);
      this.map = map;
      this.setState({mapReady: true});
      this.mapcallbacks.forEach(c => c(map));
      this.mapcallbacks.length = 0;
    };
    this.login(() => {
      this.getMyGeofences();
      this.getMyVehicles();
    });
  }
  login = (cb) => {
    let token = localStorage.getItem('token');
    if(!token) axios.post(url + '/gettoken', {
      user: {
        username: 'zoomcar.ebikes',
        password: 'zoomcar123',
      }
    }).then(rsp => {
      localStorage.setItem('token', rsp.data.data.token);
      cb();
    });
    else cb();
  }
  getMyVehicles = () => {
    let token = localStorage.getItem('token');
    axios.post(url + '/api/vehicle/list', {
      token, groupid: 1, recursive: 1, vehicletype: 'all'
    }).then(rsp => {
      let vehicles = rsp.data.data;
      this.setState({vehicles});
    })
  }
  getMyGeofences = () => {
    let token = localStorage.getItem('token');
    axios.post(url + '/api/geofence/getmygeofences', {
      token, groupid: 1
    }).then(rsp => {
      let geofences = rsp.data.data;
      this.setState({geofences});
      if(window.google) drawGeofences(this.map, geofences);
      else this.mapcallbacks.push(d => drawGeofences(this.map, geofences));
    })
  }
  getVehiclePath = (vehicle, cb) => {
    let token = localStorage.getItem('token');
    let now = new Date().valueOf();
    axios.post(url + '/api/reports/rtgps/trackhistory', {
      token, vehicleid: vehicle.vehicleid, starttime: now - 86400000, endtime: now
    }).then(rsp => {
      let path = rsp.data.data;
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
              if(this.polyline) {
                if(Array.isArray(this.polyline)) this.polyline.forEach(f => f.setMap(null));
                else this.polyline.setMap(null);
              }
              this.getVehiclePath(v, path => {
                this.polyline = drawPolyline(this.map, path)
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
