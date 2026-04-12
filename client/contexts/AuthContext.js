// @ts-nocheck
/**
 * 通用认证上下文
 *
 * 基于固定的 API 接口实现，可复用到其他项目
 * 其他项目使用时，只需修改 @api 的导入路径指向项目的 api 模块
 *
 * 注意：
 * - 如果需要登录/鉴权场景，请扩展本文件，完善 login/logout、token 管理、用户信息获取与刷新等逻辑
 * - 将示例中的占位实现替换为项目实际的接口调用与状态管理
 */
import React, { createContext, useContext } from "react";
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const value = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        // 登录逻辑，根据项目实际情况实现
        login: async (token) => { }, // eslint-disable-line @typescript-eslint/no-empty-function
        // 登出逻辑，根据项目实际情况实现
        logout: async () => { }, // eslint-disable-line @typescript-eslint/no-empty-function
        // 更新用户信息，根据项目实际情况实现
        updateUser: () => { }, // eslint-disable-line @typescript-eslint/no-empty-function
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
