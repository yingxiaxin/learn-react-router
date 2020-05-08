import React, { Component } from 'react';
import { createBrowserHistory } from './history/createBrowserHistory';
import Router from '../react-router/Router';

export default class BrowserRouter extends Component {

    history = createBrowserHistory(this.props);

    render() {
        return <Router history={this.history}>
            {this.props.children}
        </Router>
    }
}
