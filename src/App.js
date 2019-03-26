import React, { Component } from 'react';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { loadJS } from './functions';
import Login from './components/Login';
import GeneralMap from './components/GeneralMap';
import Loading from './components/Loading';
import Dashboard from './components/Dashboard';

class App extends Component {
  state = {
    mapReady: false,
    loggedIn: false,
  }
  componentDidMount() {
    loadJS('https://maps.googleapis.com/maps/api/js?key=AIzaSyCTtf_3SOMerJ6WeT4roxHoFSr893OYg2Q&callback=initMap');
    window.initMap = () => {
      this.setState({mapReady: true});
    }
  }
  onLogin = () => {
    this.setState({loggedIn: true});
  }
  render() {
    let content = <Loading />;
    if(this.state.mapReady) {
      content = <GeneralMap />;
    }
    content = <Dashboard />;
    return (
      <div className="App">
        {this.state.loggedIn ? content : <Login onLogin={this.onLogin} />}
      </div>
    );
  }
}

export default App;
