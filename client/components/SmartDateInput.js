import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Keyboard, Platform, useColorScheme } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import dayjs from 'dayjs';
import { FontAwesome6 } from '@expo/vector-icons';
export const SmartDateInput = ({ label, value, onChange, placeholder = '请选择', mode = 'date', displayFormat, error, containerStyle, inputStyle, textStyle, labelStyle, placeholderTextStyle, errorTextStyle, iconColor, iconSize = 18 }) => {
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    // 默认展示格式
    const format = displayFormat || (mode === 'time' ? 'HH:mm' : 'YYYY-MM-DD');
    // --------------------------------------------------------
    // 2. 核心：数据转换逻辑 
    // --------------------------------------------------------
    // 解析服务端值，确保无效值不传给控件；time 模式兼容仅时间字符串
    const parsedValue = useMemo(() => {
        if (!value)
            return null;
        const direct = dayjs(value);
        if (direct.isValid())
            return direct;
        if (mode === 'time') {
            const timeOnly = dayjs(`1970-01-01T${value}`);
            if (timeOnly.isValid())
                return timeOnly;
        }
        return null;
    }, [value, mode]);
    // A. 将字符串转为 JS Date 对象给控件使用
    // 如果 value 是空或无效，回退到当前时间
    const dateObjectForPicker = useMemo(() => {
        return parsedValue ? parsedValue.toDate() : new Date();
    }, [parsedValue]);
    // B. 将 Date 对象转为展示字符串
    const displayString = useMemo(() => {
        if (!parsedValue)
            return '';
        return parsedValue.format(format);
    }, [parsedValue, format]);
    // --------------------------------------------------------
    // 3. 核心：交互逻辑 (解决键盘遮挡/无法收起)
    // --------------------------------------------------------
    const showDatePicker = () => {
        // 【关键点】打开日期控件前，必须强制收起键盘！
        // 否则键盘会遮挡 iOS 的底部滚轮，或者导致 Android 焦点混乱
        Keyboard.dismiss();
        setDatePickerVisibility(true);
    };
    const hideDatePicker = () => {
        setDatePickerVisibility(false);
    };
    const handleConfirm = (date) => {
        hideDatePicker();
        // 采用带本地偏移的 ISO 字符串，避免 date 模式在非 UTC 时区出现跨天
        const serverString = dayjs(date).format(format);
        onChange(serverString);
    };
    // 根据 mode 选择图标
    const iconName = mode === 'time' ? 'clock' : 'calendar';
    return (<View style={[styles.container, containerStyle]}>
      {/* 标题 */}
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}

      {/*
           这里用 TouchableOpacity 模拟 Input。
           模拟组件永远不会唤起键盘。
        */}
      <TouchableOpacity style={[
            styles.inputBox,
            error ? styles.inputBoxError : null,
            inputStyle
        ]} onPress={showDatePicker} activeOpacity={0.7}>
        <Text style={[
            styles.text,
            textStyle,
            !value && styles.placeholder,
            !value && placeholderTextStyle
        ]} numberOfLines={1}>
          {displayString || placeholder}
        </Text>
        
        <FontAwesome6 name={iconName} size={iconSize} color={iconColor || (value ? '#4B5563' : '#9CA3AF')} style={styles.icon}/>
      </TouchableOpacity>
      
      {error && <Text style={[styles.errorText, errorTextStyle]}>{error}</Text>}

      {/*
           DateTimePickerModal 是 React Native Modal。
           它会覆盖在所有 View 之上。
        */}
      <DateTimePickerModal isVisible={isDatePickerVisible} mode={mode} date={dateObjectForPicker} // 传入 Date 对象
     onConfirm={handleConfirm} onCancel={hideDatePicker} 
    // iOS 只有用这个 display 样式才最稳，避免乱七八糟的 inline 样式
    display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
    // 自动适配系统深色模式，或者根据 isDark 变量控制
    isDarkModeEnabled={isDark} 
    // 强制使用中文环境
    locale="zh-CN" confirmTextIOS="确定" cancelTextIOS="取消"/>
    </View>);
};
// 设计样式
const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151', // Gray 700
        marginBottom: 8,
        marginLeft: 2,
    },
    inputBox: {
        height: 52, // 增加高度提升触控体验
        backgroundColor: '#FFFFFF',
        borderRadius: 12, // 更圆润的角
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB', // Gray 200
        // 增加轻微阴影提升层次感 (iOS)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        // Android
        elevation: 1,
    },
    inputBoxError: {
        borderColor: '#EF4444', // Red 500
        backgroundColor: '#FEF2F2', // Red 50
    },
    text: {
        fontSize: 16,
        color: '#111827', // Gray 900
        flex: 1,
    },
    placeholder: {
        color: '#9CA3AF', // Gray 400 - 标准占位符颜色
    },
    icon: {
        marginLeft: 12,
    },
    errorText: {
        marginTop: 4,
        marginLeft: 2,
        fontSize: 12,
        color: '#EF4444',
    }
});
