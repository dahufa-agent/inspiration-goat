// eslint-plugin-react-native: Validate React Native best practices
export default {
  meta: {
    name: 'reactnative',
    version: '1.0.0',
  },
  rules: {
    'wrap-horizontal-scrollview-inside-view': {
      meta: {
        type: 'suggestion',
        docs: { description: 'Wrap horizontal ScrollView inside View' },
      },
      create(context) {
        return {};
      },
    },
  },
};
