import { createContext } from 'react';

const context = createContext();
context.displayName = "Router";     // 调试工具内显示的名字

export default context;