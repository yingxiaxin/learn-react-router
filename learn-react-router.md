书写代码之前, 需要先梳理一下router和router-dom的相关内容. 

# 路由信息

Router组件会创建一个上下文, 并且向上下文中注入一些信息

该上下文对开发者是隐藏的, Router组件若匹配到了地址, 则会将这些上下文信息作为属性传入对应的组件. 
传入组件的属性包括: history, location, match三个对象.

## history

它并不是window.history对象, 我们利用该对象无刷新跳转地址. 

**为什么没有直接使用window.history对象**

1. React-Router中有两种模式: hash, history. 如果直接使用window.history, 只能支持一种模式
2. 当使用window.history.pushState方法时, 没有办法收到任何通知, 将导致react无法知晓地址发生了变化, 结果导致无法重新渲染组件

history中拥有的方法和属性(在下文中列出)

## location

与上面history.location完全一致, 是同一个对象, 但是与window.location不同. 

location对象中记录了当前地址相关的信息

我们通常使用第三方库```query-string```解析地址栏中的数据

location对象包含的属性:

- pathname: 路径(域名端口之后, 查询参数和哈希之前的那部分)
- search: 查询参数部分(如: ?a=1&b=2)
- hash: 哈希部分(如: #aaa=23)
- state: 状态数据

## match

该对象中, 保存了路由匹配的相关信息

事实上, Route组件中的path, 配置的是```string-pattern```(字符串正则)

react-router使用了第三方库: Path-to-RegExp, 该库的作用是将一个字符串正则转换成一个真正的正则表达式

match对象包含的属性:

- isExact: 事实上, 当前的路径和路由配置的路径是否是完全匹配的
- params: 获取路径规则中对应的数据
- path: Route组件所配置的path规则
- url: 真实url匹配到规则的那一部分

## 非路由组件获取路由信息

某些组件, 并没有直接放到Route中, 而是嵌套在其他普通组件中, 因此它的props中没有路由信息, 如果这些组件需要获取路由信息, 可以使用下面两种方式: 

1. 将路由信息从父组件一层一层传递到子组件
2. 使用react-router提供的高阶组件withRouter, 包装要使用的组件, 该高阶组件返回的组件将含有注入的路由信息

## 正式开始核心逻辑编写

### 第一步
通过使用第三方库path-to-regexp, 编写一个函数, 该函数的作用就是根据匹配情况, 创建一个match对象

```js
// matchPath.js 文件

import pathToRegexp from 'path-to-regexp';

/**
 * 得到的匹配结果, 匹配结果是一个对象, 如果不能匹配, 返回null
 * 总而言之, 返回的结果是react-route中的match对象. 
 * {
 *      isExact: xx,
 *      params: {},
 *      path: xx,
 *      url: xx,
 * }
 * 例如: 要匹配路径 /news/:id/:page?xxx=xxx&xxx=xxx#xxx=xxx
 * @param {*} path 路径规则
 * @param {*} pathname 具体的地址
 * @param {*} options 相关配置, 该配置是一个对象, 该对象中可以出现: exact, sensitive, strict
 */
export default function pathMatch(path, pathname, options) {
    // 保存路径规则中的关键字
    const keys = [];
    const regExp = pathToRegexp(path, keys, getOptions(options));
    const result = regExp.exec(pathname);
    // 如果没有匹配上, result是null
    if (!result) {
        return null;
    }
    // 匹配了
    // 匹配后正则结果result数组有3项, 第一项是整个匹配的内容, 第2,3项分别对应两个分组
    // pathToRegexp函数会把路径正则内的变量保存到keys数组中, 与2, 3项的分组结果对应
    // 通过这两个数组, 来组合成一个params对象
    let groups = Array.from(result);
    groups = groups.slice(1);
    const params = getParams(groups, keys);

    return {
        params,
        path,
        url: result[0],
        isExact: pathname === result[0]
    }
}

/**
 * 将传入的react-router配置, 转换为path-to-regexp配置
 * @param {*} options 
 */
function getOptions(options) {
    const defaultOptions = {
        exact: false,
        sensitive: false,
        strict: false,
    };
    const opts = { ...defaultOptions, ...options };
    return {
        sensitive: opts.sensitive,
        strict: opts.strict,
        end: opts.exact,
    }
}

/**
 * 根据分组结果, 得到params对象. 此对象即match对象中的params
 * @param {*} groups 分组结果
 * @param {*} keys 
 */
function getParams(groups, keys) {
    const obj = {};
    for (let i = 0; i < groups.length; i++) {
        const value = groups[i];
        const name = keys[i];
        obj[name] = value;
    }
    return obj;
}
```

### 第二步
编写history对象. 该对象提供了一些方法, 用于控制或监听地址的变化.
该对象不是window.history, 而是一个抽离的对象, 它提供了统一的API, 封装了具体的实现. 

- createBrowserHistory 产生的控制浏览器真实地址的history对象
- createHashHistory 产生的控制浏览器hash的history对象
- createMemoryHistory 产生的控制内存数组的history对象

共同特点, 它维护了一个地址栈

react-router中,  使用了第三方库实现history对象, 第三方库就叫```history```
第三方库就提供了以上的三个方法, **这三个方法虽然名称和参数不同, 但返回的对象结构(history)完全一致**

**createBrowserHistory的配置参数对象**

- basename: 设置根路径
- forceRefresh: 地址改变时是否强制刷新页面
- keyLength: location对象使用的key值长度
    - 地址栈中记录的并非字符串, 而是一个location对象, 使用key值来区分对象
- getUserConfirmation: 一个函数, 该函数当调用history对象block函数后, 发生页面跳转时运行

**history对象的方法和属性**

- action: 当前地址栈, 最后一次操作的类型
    - 如果是通过createXXXHsitory函数新创建的history对象, action固定为POP
    - 如果调用了history的push方法, action变为PUSH
    - 如果调用了history的replace方法, action变为REPLACE
- push: 向当前地址栈指针位置, 入栈一个地址
- go: 控制当前地址栈指针偏移, 如果是0, 地址不变; 如果是负数, 则后退指定的步数, 如果是正数则前进指定的步数
- length: 当前栈中的地址数量
- goForward: 相当于go(1)
- goBack: 相当于go(-1)
- location: 表达当前地址中的信息
- listen: 函数, 用于监听地址栈指针的变化
    - 该函数接收一个函数作为参数, 该参数表示地址变化后要做的事情
        - 参数函数接收两个参数
        - location: 记录了新的地址
        - action: 进入新地址的方式
            - POP: 指针移动, 调用go, goBack, goForward, 用户点击浏览器后退按钮
            - PUSH: 调用history.push
            - REPLACE: 调用history.replace
    - 该函数有一个返回值, 返回的是一个函数, 用于取消监听
- block: 用于设置一个阻塞, 当页面发生跳转时, 会将指定的消息传递到getUserConfirmation, 并调用该函数
    - 该函数接收一个字符串参数, 表示提示消息, 也可以接收一个函数参数, 函数参数返回字符串表示消息内容
    - 该函数返回一个取消函数, 调用取消函数接触阻塞
- createHref: 返回一个完整的路径字符串, 值为basename+url
    - 该函数接收location对象为参数. 相当于将basename配置和location内的信息做拼接

createBrowserHistory方法的代码

```js
// createBrowserHistory.js文件

import ListenerManager from "./ListenerManager";
import BlockManager from "./BlockManager";

/**
 * 创建一个history api的history对象
 * @param {*} options 配置对象
 */
export default function createBrowserHistory(options = {}) {

    const {
        basename = '',
        forceRefresh = false,
        keyLength = 6,
        getUserConfirmation = (message, callback) => callback(window.confirm(message))
    } = options;

    const listenerManager = new ListenerManager();
    const blockManager = new BlockManager(getUserConfirmation);

    // window.history.go方法内部可能绑定了this. 直接作为对象的go属性返回以xxx.go的方式调用报错"illegal invocation"
    function go(step) {
        window.history.go(step);
    }

    function goBack() {
        window.history.back();
    }

    function goForward() {
        window.history.forward();
    }

    /**
     * 向地址栈中加入一个新的地址
     * @param {*} path 新的地址, 可以是字符串, 也可以是对象
     * @param {*} state 附近的状态数据, 如果第一个参数是对象, 该参数无效
     */
    function push(path, state) {
        changePage(path, state, true);
    }

    function replace(path, state) {
        changePage(path, state, false);
    }

    /**
     * 抽离的可用于实现push和replace的方法
     * @param {*} path 
     * @param {*} state 
     * @param {*} ispush 
     */
    function changePage(path, state, ispush) {
        let action = "PUSH";
        if (!ispush) {
            action = "REPLACE";
        }
        const pathInfo = handlePathAndState(path, state, basename);

        // 得到如果要跳转情况下的location
        const targetLocation = createLocationFromPath(pathInfo);

        // 得到新的location后, 要先触发阻塞, 看阻塞的情况再决定要不要进行后面的监听, 更新history和跳转等动作
        blockManager.triggerBlock(targetLocation, action, () => {
            // 如果强制刷新的话, 会导致window.history丢失state数据
            // 所以先加上状态, 再强制刷新
            if (ispush) {
                window.history.pushState({
                    key: createKey(keyLength),
                    state: pathInfo.state
                }, null, pathInfo.path);
            } else {
                window.history.replaceState({
                    key: createKey(keyLength),
                    state: pathInfo.state
                }, null, pathInfo.path);
            }

            // 触发监听事件
            listenerManager.triggerListeners(targetLocation, action);

            // 更新action属性
            history.action = action;

            // 更新location对象
            history.location = targetLocation;

            // 进行强制刷新
            if (forceRefresh) {
                window.location.href = pathInfo.path;
            }
        });
    }

    function addDomListener() {
        // popstate事件只能监听前进, 后退, 用户对地址hash的改变.
        // 即只能监听用户操作浏览器上的按钮和地址栏
        // 无法监听到pushState和replaceState
        window.addEventListener('popstate', () => {
            const location = createLocation(basename);
            // 触发阻塞, 此处已经完成了跳转(没有办法阻止跳转), 只能影响history对象里的location更新
            blockManager.triggerBlock(location, "POP", () => {
                // 此处要先触发监听函数, 再更新history的location对象
                // 因为监听函数还可以拿到之前的location, 同时又可以得到传入的新的location
                listenerManager.triggerListeners(location, "POP");
    
                // 更新location对象
                history.location = location;
            });
        });
    }

    addDomListener();

    /**
     * 添加一个监听器, 并返回一个可用于取消监听的函数
     * @param {*} listener 
     */
    function listen(listener) {
        return listenerManager.addListener(listener);
    }

    function block(prompt) {
        return blockManager.block(prompt);
    }

    function createHref(location) {
        const { pathname = '/', search = '', hash = '' } = location;
        if (search.charAt(0) === "?" && search.length === 1) {
            search = "";
        }
        if (hash.charAt(0) === "#" && hash.length === 1) {
            hash = "";
        }
        return basename + pathname + search + hash;
    }

    const history = {
        action: "POP",
        location: createLocation(basename),
        length: window.history.length,
        go,
        goBack,
        goForward,
        push,
        replace,
        listen,
        block,
        createHref,
    };;


    // 返回history对象
    return history;
}


/**
 * 创建一个location对象
 * location对象包含的属性有:
 * {
 *      hash: xxx,
 *      search: xxx,
 *      pathname: xxx,
 *      state: {}
 * }
 */
function createLocation(basename = '') {
    // window.location对象中, hash search是可以直接拿到的
    // pathname中会直接包含有basename, 所以我们自己的location对象中要在pathname中剔除basename部分
    let pathname = window.location.pathname;
    const reg = new RegExp(`^${basename}`);
    pathname.replace(reg, '');

    const location = {
        hash: window.location.hash,
        search: window.location.search,
        pathname,
    };

    // 对state对象的处理
    // 1. 如果window.history.state没有值, 则我们的state为undefined
    // 2. 如果window.history.state有值, 但值的类型不是对象, 我们的state就直接赋值. 如果是对象, 该对象有key属性, location.key = key,
    // 且 state = historyState.state. 该对象没有key值, state = historyState

    let state, historyState = window.history.state;
    if (historyState === null) {
        state = undefined;
    } else if (typeof historyState !== 'object') {
        state = historyState;
    } else {
        // 下面这么处理key和state的原因是:
        // 为了避免和其他第三方库冲突, history这个库的push等方法跳转且携带state数据时
        // history库实际上将数据放入了window.history.state -> {key: xxx, state: 数据}中. 即window.history.state.state才是数据内容
        // 因此, 此处在还原的时候才会有这个逻辑
        if ('key' in historyState) {
            location.key = historyState.key;
            state = historyState.state;
        } else {
            state = historyState;
        }
    }
    location.state = state;

    return location;
}

/**
 * 根据pathInfo得到一个location对象
 * 因为createLocation函数得到location的方式有缺陷:
 * createLocation函数是根据window.location对象来得到我们的location对象的
 * 而当有阻塞的情况下, 页面有可能就不应该跳转, 不跳转window.location就不会更新
 * window.location对象不更新, 就无法得到新的location传递给阻塞函数. 
 * 因此, 需要有一个新的方式, 来得到假设要跳转时新的location对象
 * @param {*} pathInfo {path: "/xxx/xxx?a=2&b=3#aaa=eaef", state:}
 * @param {*} basename 
 */
export function createLocationFromPath(pathInfo, basename) {
    // 取出pathname
    let pathname;
    pathname = pathInfo.path.replace(/[#?].*$/, "");
    // 处理basename
    let reg = new RegExp(`^${basename}`);
    pathname = pathname.replace(reg, "");

    // 取出search
    let search;
    const questionIndex = pathInfo.path.indexOf("?");
    const sharpIndex = pathInfo.path.indexOf("#");
    // 没有问号或者问号出现在井号之后, 那么就是没有search字符串(井号后面的全是hash)
    if (questionIndex === -1 || questionIndex > sharpIndex) {
        search = "";
    } else {
        search = pathInfo.path.substring(questionIndex, sharpIndex);
    }

    // 取出hash
    let hash;
    if (sharpIndex === -1) {
        hash = "";
    } else {
        hash = pathInfo.path.substring(sharpIndex);
    }

    return {
        pathname,
        hash,
        search,
        state: pathInfo.state,
    }
}

/**
 * 根据path和state, 得到一个统一的对象格式
 * @param {*} path 
 * @param {*} state 
 */
function handlePathAndState(path, state, basename) {
    if (typeof path === 'string') {
        return {
            path: basename + path,
            state,
        }
    } else if (typeof path === 'object') {
        let pathResult = basename + path.pathname;
        const { search = '', hash = '' } = path;
        if (search.charAt(0) !== "?" && search.length > 0) {
            search = "?" + search;
        }
        if (hash.charAt(0) !== "#" && hash.length > 0) {
            hash = "#" + hash;
        }
        pathResult += search;
        pathResult += hash;
        return {
            path: pathResult,
            state: path.state,
        }
    } else {
        throw new TypeError('path must be string or object');
    }
}

/**
 * 产生一个指定长度的随机字符串, 随机字符串中可以包含数字和字母
 * @param {*} keyLength 
 */
function createKey(keyLength) {
    return Math.random().toString(36).substr(2, keyLength);
}


// BlockManager.js文件

export default class BlockManager {

    // 该属性是否有值, 决定了是否有阻塞
    prompt = null;

    constructor(getUserConfirmation) {
        this.getUserConfirmation = getUserConfirmation;
    }

    /**
     * 设置一个阻塞, 传递一个提示字符串
     * @param {*} prompt 可以是字符串, 也可以是一个函数, 函数返回一个字符串
     */
    block(prompt) {
        if (typeof prompt !== 'string' && typeof prompt !== 'function') {
            throw new TypeError('block must be string or function');
        }
        this.prompt = prompt;
        return () => {
            this.prompt = null;
        }
    }

    /**
     * 触发阻塞, 如果阻塞是个函数, 那么传入新的location和action
     * @param {*} location 新的location
     * @param {*} action 
     * @param {function} callback 当阻塞完成之后要做的事情, 一般是跳转页面
     */
    triggerBlock(location, action, callback) {
        // 没有阻塞, 直接callback()跳转页面
        if (!this.prompt) {
            callback();
            return;
        }

        let message;
        if (typeof this.prompt === 'string') {
            message = this.prompt;
        } else {
            message = this.prompt(location, action);
        }

        // 调用getUserConfirmation
        this.getUserConfirmation(message, result => {
            if (result === true) {
                // 可以跳转
                callback();
            } else {
                // 不能跳转
            }
        });
    }

}


// ListenerManager.js文件

export default class ListenerManager {

    // 存放监听器的数组
    listeners = [];

    addListener(listener) {
        this.listeners.push(listener);
        const unlisten = () => {
            const index = this.listeners.indexOf(listener);
            this.listeners.splice(index, 1);
        }
        return unlisten;
    }

    /**
     * 触发所有的监听器
     */
    triggerListeners(location, action) {
        for (const listener of this.listeners) {
            listener(location, action);
        }
    }
    
}
```

### 第三步

至此, match, history和location三个对象已经可以拿到, 那么接下里进行react-router-dom的相关组件编写.
在调试工具中, 展开组件结构可以看到, BrowerRouter下有一个Router组件, Router组件接收一个属性history, 维护一个状态location, 并且它提供了上下文Router.Provider. 上下文内就有match, history和location. 

![QQ浏览器截图20200507133414.png](https://upload-images.jianshu.io/upload_images/15837769-b27bb1ac39280346.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/870)

BrowserRouter和它内部生成的Router的代码(包含上下文文件)

```js
// BrowserRouter.js文件

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

// routerContext.js文件

import { createContext } from 'react';

const context = createContext();
context.displayName = "Router";     // 调试工具内显示的名字

export default context;

// Router.js

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
```

### 第四步

接下来, 实现配置各个路径的Route组件. 通过调试工具, 我们发现Route组件内是上下文的消费者. 除此之外, 它又提供了一个上下文, 上下文的history和location不变, match对象变为了本次匹配的结果. 由此, 我们知道Route组件的功能, 就是匹配路由, 并将匹配的结果放入上下文.

Route组件可以传入很多属性, 包括:

- path: 匹配规则
- children: 无论是否匹配都要显示(配置了此项, 则下面两项无效)
- render: 渲染函数(没有children的话, render优先级比component高)
- component: 如果匹配显示的组件
- exact: 是否精确匹配
- strict: 是否严格匹配, 即匹配末尾的"/"
- sensitive: 是否大小写敏感

Route.js代码

```js
// Route.js文件

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
```

### 第五步

接下来开始实现Switch, withRouter和Link组件. 

通过调试工具查看组件树, 我们发现Switch组件的功能, 就是匹配Route子元素, 渲染第一个匹配到的Route. 可以通过循环Switch组件的children, 依次匹配每一个Route组件, 当匹配到时, 直接渲染并停止循环. 

Switch组件代码

```js
// Switch.js文件

import React, { Component } from 'react';
import matchPath from './matchPath';
import ctx from './routerContext';
import Route from './Route';

export default class Switch extends Component {

    // 循环children, 得到第一个匹配的Route组件, 若没有匹配, 返回null
    getMatchChild = ({ location }) => {
        let children = [];
        if (Array.isArray(this.props.children)) {
            children = this.props.children;
        } else if (typeof this.props.children === 'object') {
            children = [this.props.children];
        }
        for (const child of children) {
            if (child.type !== Route) {
                // 子元素不是Route组件
                throw new TypeError("children of Switch component must be type of Route");
            }
            // 判断子元素是否能够匹配
            const { path = '/', exact = false, strict = false, sensitive = false } = child.props;
            const result = matchPath(path, location.pathname, { exact, strict, sensitive });
            if (result) {
                // 匹配了
                return child;
            }
        }
        return null;
    }

    render() {
        return <ctx.Consumer>
            {this.getMatchChild}
        </ctx.Consumer>
    }
}
```

withRouter就是一个高阶组件, 用于将路由上下文中的数据, 作为属性注入到组件中.

withRouter代码

```js
// withRouter.js文件

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
```

从调试工具中, 我们得知, Link组件就是包装了一个a元素, 它获得了路由上下文, 于是可以通过history对象的方法进行跳转. 

Link组件的代码

```js
// Link.js

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
```

NavLink组件的代码

```js
import React from 'react';
import Link from './Link';
import ctx from '../react-router/routerContext';
import matchPath from '../react-router/matchPath';
import { parsePath } from 'history';

export default function NavLink(props) {
    const { activeClass = 'active', exact = false, strict = false, sensitive = false, ...rest } = props;
    return <ctx.Consumer>
        {
            ({ location }) => {
                let loc;
                if (typeof props.to === 'string') {
                    loc = parsePath(props.to);
                }
                const result = matchPath(loc.pathname, location.pathname, { exact, strict, sensitive });
                if (result) {
                    return <Link {...rest} className={activeClass} />
                } else {
                    return <Link {...rest} />
                }
            }
        }
    </ctx.Consumer>
}
```

至此, react-router比较核心的内容写完. 当然其中很多小细节, 没有处理.