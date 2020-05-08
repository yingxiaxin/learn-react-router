import React from 'react';
import ctx from './routerContext';

export default function withRouter(Comp) {
    function routerWrapper(props) {
        return <ctx.Consumer>
            {
                value => <Comp {...props} {...value} />
            }
        </ctx.Consumer>
    }

    // 设置在调试工具中显示的名字
    routerWrapper.displayName = `withRouter(${Comp.displayName || Comp.name})`;
    return routerWrapper;
}