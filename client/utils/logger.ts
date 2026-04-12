/**
 * 客户端错误日志收集模块
 * 收集错误日志并定期同步到服务器
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const LOG_STORAGE_KEY = "error_logs";
const MAX_LOGS = 100;
const SYNC_INTERVAL = 5 * 60 * 1000; // 5分钟同步一次

interface ErrorLog {
  timestamp: number;
  type: "error" | "warning" | "info" | "network";
  source: string;
  message: string;
  details?: any;
  deviceId?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private deviceId: string = "";

  constructor() {
    this.init();
  }

  private async init() {
    // 加载本地缓存的日志
    await this.loadLogs();
    // 生成设备ID
    await this.initDeviceId();
    // 启动定时同步
    this.startSyncTimer();
    // 监听全局错误
    this.setupGlobalErrorHandlers();
  }

  private async loadLogs() {
    try {
      const stored = await SecureStore.getItemAsync(LOG_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (err) {
      console.error("[ErrorLogger] 加载日志失败:", err);
    }
  }

  private async saveLogs() {
    try {
      // 只保留最新的 MAX_LOGS 条
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS);
      }
      await SecureStore.setItemAsync(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (err) {
      console.error("[ErrorLogger] 保存日志失败:", err);
    }
  }

  private async initDeviceId() {
    try {
      let deviceId = await SecureStore.getItemAsync("device_id");
      if (!deviceId) {
        // 生成随机设备ID
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await SecureStore.setItemAsync("device_id", deviceId);
      }
      this.deviceId = deviceId;
    } catch (err) {
      console.error("[ErrorLogger] 初始化设备ID失败:", err);
    }
  }

  private startSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.syncTimer = setInterval(() => {
      this.syncToServer();
    }, SYNC_INTERVAL);
  }

  private setupGlobalErrorHandlers() {
    // Web 环境下捕获未处理的 Promise rejection
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", (event) => {
        this.log("error", "Promise", "未处理的Promise错误", event.reason);
      });
    }
  }

  log(
    type: ErrorLog["type"],
    source: string,
    message: string,
    details?: any
  ) {
    const logEntry: ErrorLog = {
      timestamp: Date.now(),
      type,
      source,
      message,
      details: this.serializeDetails(details),
      deviceId: this.deviceId,
    };

    this.logs.push(logEntry);
    this.saveLogs();

    // 开发环境同时打印到控制台
    if (process.env.NODE_ENV === "development") {
      const logMessage = `[${type.toUpperCase()}] [${source}] ${message}`;
      if (type === "error") {
        console.error(logMessage, details);
      } else if (type === "warning") {
        console.warn(logMessage, details);
      } else {
        console.log(logMessage, details);
      }
    }

    return logEntry;
  }

  error(source: string, message: string, details?: any) {
    return this.log("error", source, message, details);
  }

  warn(source: string, message: string, details?: any) {
    return this.log("warning", source, message, details);
  }

  info(source: string, message: string, details?: any) {
    return this.log("info", source, message, details);
  }

  network(source: string, message: string, details?: any) {
    return this.log("network", source, message, details);
  }

  private serializeDetails(details: any): string | undefined {
    try {
      if (details instanceof Error) {
        return `${details.message}\n${details.stack}`;
      }
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }

  async syncToServer() {
    if (this.logs.length === 0) return;

    const logsToSync = this.logs.slice(-20); // 每次最多同步20条
    const logsCopy = [...logsToSync];

    try {
      const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || "http://localhost:9091";
      const response = await fetch(`${BACKEND_BASE_URL}/api/v1/logs/client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: logsCopy }),
      });

      if (response.ok) {
        // 同步成功的日志移除
        this.logs = this.logs.filter(
          (log) => !logsCopy.some((syncLog) => syncLog.timestamp === log.timestamp)
        );
        this.saveLogs();
        console.log("[ErrorLogger] 同步成功:", logsCopy.length, "条");
      }
    } catch (err) {
      console.error("[ErrorLogger] 同步失败:", err);
    }
  }

  getLogs(): ErrorLog[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    this.saveLogs();
  }
}

// 导出单例
export const errorLogger = new ErrorLogger();

// 便捷方法
export const logError = (source: string, message: string, details?: any) =>
  errorLogger.error(source, message, details);

export const logNetwork = (source: string, message: string, details?: any) =>
  errorLogger.network(source, message, details);

export default errorLogger;
