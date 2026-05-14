import React from 'react';
import { StyleSheet, Text, View, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 备案信息Footer组件
 * 全局显示在页面最底部，符合备案核验规范
 */
export function BeianFooter() {
  const insets = useSafeAreaInsets();
  
  const handlePress = () => {
    Linking.openURL('https://beian.miit.gov.cn/');
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <Text style={styles.text}>
        <Text style={styles.link} onPress={handlePress}>
          苏 ICP 备 2026027769 号
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    zIndex: -1,
  },
  text: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
  link: {
    fontSize: 12,
    color: '#999999',
    textDecorationLine: 'underline',
  },
});
