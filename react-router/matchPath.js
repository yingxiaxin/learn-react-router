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