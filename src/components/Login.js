import React, {Component} from 'react';
import API from '../API';
import Loading from './Loading';

export default class Login extends Component {
    state = {
        busy: true,
        error: '',
    }
    componentDidMount() {
        let token = localStorage.getItem('token');
        if(token) {
            API.verify(token).then(rsp => {
                this.props.onLogin(rsp.data.userinfo);
            });
        }
    }
    onLogin = () => {
        let username = this.refs.usr.value;
        let password = this.refs.pwd.value;
        if(!username || !password) return this.setState({error: 'Fill fields'});
        this.setState({busy: true, error: ''});
        API.login(username, password).then(rsp => {
            this.props.onLogin(rsp.data.userinfo);
            localStorage.setItem('token', rsp.data.token);
            this.setState({busy: false});
        }).catch(err => {
            if(err.response) {
                this.setState({error: err.response.data.msg, busy: false});
                console.error(err.response);
            }
        })
    }
    onKeyDown = e => {
        if(e.keyCode === 13) this.onLogin();
    }
    render() {
        return <div className="log-ov">
            {this.state.busy ? <Loading /> :
            <div className="log-bx" onKeyDown={this.onKeyDown}>
                <div className="grp"><input type="text" ref="usr" placeholder="Username" /></div>
                <div className="grp"><input type="password" ref="pwd" placeholder="Password" /></div>
                <div className="grp"><button onClick={this.onLogin}>Login</button></div>
                {this.state.error && <div style={{color:'#f00'}}>{this.state.error}</div>}
            </div>}
        </div>
    }
}