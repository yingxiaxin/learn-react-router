// Route组件的功能是匹配路由, 并将匹配的结果放入上下文中

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ctx from './routerContext';
import matchPath from './matchPath';

export default class Route extends Component {

    static propTypes = {
        path: PropTypes.oneOf([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
        children: PropTypes.node,
        render: PropTypes.func,
        component: PropTypes.node,
        exact: PropTypes.bool,
        strict: PropTypes.bool,
        sensitive: PropTypes.bool,
    }

    static defaultProps = {
        path: "/"
    }

    matchRoute(location) {
        const { exact = false, strict = false, sensitive = false } = this.props;
        return matchPath(this.props.path, location.pathname, { exact, strict, sensitive });
    }

    // 需要渲染的内容
    renderChildren(ctx) {
        // children有值
        if (this.props.children !== undefined && this.props.children !== null) {
            if (typeof this.props.children === 'function') {
                return this.props.children(ctx);
            } else {
                return this.props.children;
            }
        }
        // children没有值, 但是render有值
        if (!ctx.match) {
            // 没有匹配
            return null;
        }
        // 匹配了
        if (typeof this.props.render === 'function') {
            return this.props.render(ctx);
        }

        if (this.props.component) {
            const Component = this.props.component;
            return <Component {...ctx} />
        }

        // 什么属性都没填
        return null;
    }

    consumerFunc = (value) => {
        const ctxValue = {
            history: value.history,
            location: value.location,
            match: this.matchRoute(value.location),
        };
        return <ctx.Provider value={ctxValue}>
            {this.renderChildren(ctxValue)}
        </ctx.Provider>
    }

    render() {
        return <ctx.Consumer>
            {this.consumerFunc}
        </ctx.Consumer>
    }
}
