import React, { useEffect } from 'react';
import { Platform, StyleSheet, ScrollView, View, TouchableWithoutFeedback, Keyboard, FlatList, SectionList, Modal, } from 'react-native';
import { withUniwind } from 'uniwind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
// 引入 KeyboardAware 系列组件
import { KeyboardAwareScrollView, KeyboardAwareFlatList, KeyboardAwareSectionList } from 'react-native-keyboard-aware-scroll-view';
const KeyboardAwareScrollable = ({ element, extraPadding, contentInsetBehaviorIOS, }) => {
    // 获取原始组件的 props
    const childAttrs = element.props || {};
    const originStyle = childAttrs['contentContainerStyle'];
    const styleArray = Array.isArray(originStyle) ? originStyle : originStyle ? [originStyle] : [];
    const merged = Object.assign({}, ...styleArray);
    const currentPB = typeof merged.paddingBottom === 'number' ? merged.paddingBottom : 0;
    // 合并 paddingBottom (安全区 + 额外留白)
    const enhancedContentStyle = [{ ...merged, paddingBottom: currentPB + extraPadding }];
    // 基础配置 props，用于传递给 KeyboardAware 组件
    const commonProps = {
        ...childAttrs,
        contentContainerStyle: enhancedContentStyle,
        keyboardShouldPersistTaps: childAttrs['keyboardShouldPersistTaps'] ?? 'handled',
        keyboardDismissMode: childAttrs['keyboardDismissMode'] ?? 'on-drag',
        enableOnAndroid: true,
        // 类似于原代码中的 setTimeout/scrollToEnd 逻辑，这里设置额外的滚动高度确保输入框可见
        extraHeight: 100,
        // 禁用自带的 ScrollView 自动 inset，由外部 padding 控制
        enableAutomaticScroll: true,
        ...(Platform.OS === 'ios'
            ? { contentInsetAdjustmentBehavior: childAttrs['contentInsetAdjustmentBehavior'] ?? contentInsetBehaviorIOS }
            : {}),
    };
    const t = element.type;
    // 根据组件类型返回对应的 KeyboardAware 版本
    // 注意：不再使用 KeyboardAvoidingView，直接替换为增强版 ScrollView
    if (t === ScrollView) {
        return <KeyboardAwareScrollView {...commonProps}/>;
    }
    if (t === FlatList) {
        return <KeyboardAwareFlatList {...commonProps}/>;
    }
    if (t === SectionList) {
        return <KeyboardAwareSectionList {...commonProps}/>;
    }
    // 理论上不应运行到这里，如果是非标准组件则原样返回，仅修改样式
    return React.cloneElement(element, {
        contentContainerStyle: enhancedContentStyle,
        keyboardShouldPersistTaps: childAttrs['keyboardShouldPersistTaps'] ?? 'handled',
        keyboardDismissMode: childAttrs['keyboardDismissMode'] ?? 'on-drag',
    });
};
const RawScreen = ({ children, backgroundColor = 'var(--background)', statusBarStyle = 'dark', statusBarColor = 'transparent', safeAreaEdges = ['top', 'left', 'right', 'bottom'], style, }) => {
    const insets = useSafeAreaInsets();
    const [keyboardShown, setKeyboardShown] = React.useState(false);
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const s1 = Keyboard.addListener(showEvent, () => setKeyboardShown(true));
        const s2 = Keyboard.addListener(hideEvent, () => setKeyboardShown(false));
        return () => { s1.remove(); s2.remove(); };
    }, []);
    // 自动检测：若子树中包含 ScrollView/FlatList/SectionList，则认为页面自身处理滚动
    const isNodeScrollable = (node) => {
        const isScrollableElement = (el) => {
            if (!React.isValidElement(el))
                return false;
            const element = el;
            const t = element.type;
            // 不递归检查 Modal 内容，避免将弹窗内的 ScrollView 误判为页面已具备垂直滚动
            if (t === Modal)
                return false;
            const props = element.props;
            // 仅识别“垂直”滚动容器；横向滚动不视为页面已处理垂直滚动
            // eslint-disable-next-line react/prop-types
            const isHorizontal = !!(props && props.horizontal === true);
            if ((t === ScrollView || t === FlatList || t === SectionList) && !isHorizontal)
                return true;
            const c = props && 'children' in props
                ? props.children
                : undefined;
            if (Array.isArray(c))
                return c.some(isScrollableElement);
            return c ? isScrollableElement(c) : false;
        };
        if (Array.isArray(node))
            return node.some(isScrollableElement);
        return isScrollableElement(node);
    };
    const childIsNativeScrollable = isNodeScrollable(children);
    // 说明：避免双重补白
    // KeyboardAwareScrollView 内部会自动处理键盘高度。
    // 我们主要关注非键盘状态下的 Safe Area 管理。
    // 解析安全区设置
    const hasTop = safeAreaEdges.includes('top');
    const hasBottom = safeAreaEdges.includes('bottom');
    const hasLeft = safeAreaEdges.includes('left');
    const hasRight = safeAreaEdges.includes('right');
    // 强制禁用 iOS 自动调整内容区域，完全由手动 padding 控制，消除系统自动计算带来的多余空白
    const contentInsetBehaviorIOS = 'never';
    const wrapperStyle = {
        flex: 1,
        backgroundColor,
        paddingTop: hasTop ? insets.top : 0,
        paddingLeft: hasLeft ? insets.left : 0,
        paddingRight: hasRight ? insets.right : 0,
        // 当页面不使用外层 ScrollView 时（子树本身可滚动），由外层 View 负责底部安全区
        paddingBottom: (childIsNativeScrollable && hasBottom)
            ? (keyboardShown ? 0 : insets.bottom)
            : 0,
    };
    // 若子树不可滚动，则外层使用 KeyboardAwareScrollView 提供“全局页面滑动”能力
    const useScrollContainer = !childIsNativeScrollable;
    // 2. 滚动容器配置
    // 如果使用滚动容器，则使用 KeyboardAwareScrollView 替代原有的 ScrollView
    const Container = useScrollContainer ? KeyboardAwareScrollView : View;
    const containerProps = useScrollContainer ? {
        contentContainerStyle: {
            flexGrow: 1,
            // 滚动模式下，Bottom 安全区由内容容器处理，保证内容能完整显示且不被 Home Indicator 遮挡，同时背景色能延伸到底部
            paddingBottom: hasBottom ? (keyboardShown ? 0 : insets.bottom) : 0,
        },
        keyboardShouldPersistTaps: 'handled',
        showsVerticalScrollIndicator: false,
        keyboardDismissMode: 'on-drag',
        enableOnAndroid: true,
        extraHeight: 100, // 替代原代码手动计算的 offset
        // iOS 顶部白条修复：强制不自动添加顶部安全区
        ...(Platform.OS === 'ios'
            ? { contentInsetAdjustmentBehavior: contentInsetBehaviorIOS }
            : {}),
    } : {};
    // 3. 若子元素自身包含滚动容器，给该滚动容器单独添加键盘避让，不影响其余固定元素（如底部栏）
    const wrapScrollableWithKeyboardAvoid = (nodes) => {
        const isVerticalScrollable = (el) => {
            const t = el.type;
            const elementProps = el.props || {};
            const isHorizontal = !!elementProps.horizontal;
            return (t === ScrollView || t === FlatList || t === SectionList) && !isHorizontal;
        };
        const wrapIfNeeded = (el, idx) => {
            if (isVerticalScrollable(el)) {
                return (<KeyboardAwareScrollable key={el.key ?? idx} element={el} extraPadding={keyboardShown ? 0 : (hasBottom ? insets.bottom : 0)} contentInsetBehaviorIOS={contentInsetBehaviorIOS}/>);
            }
            return el;
        };
        if (Array.isArray(nodes)) {
            return nodes.map((n, idx) => {
                if (React.isValidElement(n)) {
                    return wrapIfNeeded(n, idx);
                }
                return n;
            });
        }
        if (React.isValidElement(nodes)) {
            return wrapIfNeeded(nodes, 0);
        }
        return nodes;
    };
    return (
    // 核心原则：严禁使用 SafeAreaView，统一使用 View + padding 手动管理
    <View style={wrapperStyle}>
      {/* 状态栏配置：强制透明背景 + 沉浸式，以支持背景图延伸 */}
      <StatusBar style={statusBarStyle} backgroundColor={statusBarColor} translucent/>

      {/* 键盘避让：仅当外层使用 ScrollView 时启用，避免固定底部栏随键盘上移 */}
      {useScrollContainer ? (
        // 替换为 KeyboardAwareScrollView，移除原先的 KeyboardAvoidingView 包裹
        // 因为 KeyboardAwareScrollView 已经内置了处理逻辑
        <Container style={[styles.innerContainer, style]} {...containerProps}>
          {children}
        </Container>) : (
        // 页面自身已处理滚动，不启用全局键盘避让，保证固定底部栏不随键盘上移
        childIsNativeScrollable ? (<View style={[styles.innerContainer, style]}>
            {wrapScrollableWithKeyboardAvoid(children)}
          </View>) : (<TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
            <View style={[styles.innerContainer, style]}>
              {children}
            </View>
          </TouchableWithoutFeedback>))}
    </View>);
};
const styles = StyleSheet.create({
    innerContainer: {
        flex: 1,
        // 确保内部容器透明，避免背景色遮挡
        backgroundColor: 'transparent',
    },
});
export const Screen = withUniwind(RawScreen);
