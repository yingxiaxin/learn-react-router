import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ctx from './routerContext';
import matchPath from './matchPath';

export default class Router extends Component {

    static propTypes = {
        history: PropTypes.object.isRequired,
        children: PropTypes.node,
    }

    // 放到状态中是因为, 当location发生变化时, 需要更新context
    state = {
        location: this.props.history.location
    }

    // 添加一个监听, 在地址发生变化的时候, 更新状态导致本组件渲染, 重新获得history, match和location
    // 使得上下文发生变化, 所有子组件都重新渲染
    componentDidMount() {
        this.unlisten = this.props.history.listen((location, action) => {
            this.props.history.action = action;
            this.setState({
                location
            });
        });
    }

    componentWillUnmount() {
        if (this.unlisten) {
            this.unlisten();
        }
    }

    render() {
        // 不能讲ctxValue变量写成类组件的属性, 而是每次render重新构建一个新地址的对象
        // 这样才能让react判定上下文发生变化, 从而更新组件
        const ctxValue = {
            history: this.props.history,
            location: this.state.location,
            // 在上下文中, 没有进行匹配, 所以先把match对象的匹配规则直接写为"/"
            match: matchPath("/", this.state.location.pathname),
        };

        return <ctx.Provider valule={ctxValue}>
            {this.props.children}
        </ctx.Provider>
    }
}
