// eslint-plugin-reanimated: Validate Reanimated usage
export default {
  meta: {
    name: 'reanimated',
    version: '1.0.0',
  },
  rules: {
    'ban-mix-use': {
      meta: {
        type: 'suggestion',
        docs: { description: 'Ban mix useAnimatedStyle with View style' },
      },
      create(context) {
        return {};
      },
    },
  },
};
