import axios from 'axios';

const srvURL = 'https://apiplatform.intellicar.in';

function makeRequest(path, data = {}) {
    return axios.post(srvURL + path, data).then(rsp => rsp.data);
}

function login(username, password) {
    return makeRequest('/gettoken', {user:{username,password}});
}

function verify(token) {
    return makeRequest('/verifytoken', {token});
}

export default {
    login,
    verify,
}