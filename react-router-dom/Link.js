import React from 'react';
import ctx from '../react-router/routerContext';
import { parsePath } from 'history';

export default function Link(props) {

    const { to, ...rest } = props;
    return <ctx.Consumer>
        {
            value => {
                let loc;
                if (typeof props.to === 'object') {
                    loc = props.to;
                } else {
                    // 如果props.to是字符串, 那么先转换成location. 因为路径需要basename
                    // 只有history对象里的createHref方法才会帮我们自动处理basename, 其他地方拿不到basename配置了
                    // 此处为了省力直接使用官方的parsePath函数(我们自己写的createLocationFromPath函数可能有些细节没有处理好)
                    // 将props.to转换成location对象
                    loc = parsePath(props.to);
                }
                const href = value.history.createHref(loc);

                return <a {...rest} href={href} onClick={
                    e => {
                        // 阻止默认行为
                        e.preventDefault();
                        value.history.push(loc);
                    }
                }>{props.children}</a>
            }
        }
    </ctx.Consumer>
}
