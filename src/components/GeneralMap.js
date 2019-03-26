import React, { Component } from 'react';

const mapconfig = {
  center: {lat:12.973506,lng:77.594367},
  zoom: 15,
}

class GeneralMap extends Component {
  state = {
    left: false,
  }
  componentDidMount() {
    let el = document.querySelector('.maph');
    new window.google.maps.Map(el, mapconfig);
  }
  render() {
    return (
      <div className="map">
        <div className="mapl">
          <div className="maph"></div>
        </div>
        <div className="mapr">
            
        </div>
      </div>
    );
  }
}

export default GeneralMap;
