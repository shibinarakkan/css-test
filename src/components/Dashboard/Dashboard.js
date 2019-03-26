import React, {Component} from 'react';
import './dashboard.css';

export default class Dashboard extends Component {
    render() {
        return (
            <div className="db">
                <div className="dbs">
                    sidebar
                </div>
                <div className="dbc">
                    content
                </div>
            </div>
        )
    }
}