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