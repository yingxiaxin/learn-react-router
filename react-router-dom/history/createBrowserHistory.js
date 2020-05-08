import ListenerManager from "./ListenerManager";
import BlockManager from "./BlockManager";

/**
 * 创建一个history api的history对象
 * @param {*} options 配置对象
 */
export function createBrowserHistory(options = {}) {

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

            // 触发监听事件(如果是触发监听之后再跳转, 那么把代码上移, 但是实际上因为location的改变在本句代码之后, location不影响)
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