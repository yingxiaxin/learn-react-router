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