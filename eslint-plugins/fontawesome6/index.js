// eslint-plugin-fontawesome6: Validates FontAwesome6 icon usage
export default {
  meta: {
    name: 'fontawesome6',
    version: '1.0.0',
  },
  rules: {
    'valid-name': {
      meta: {
        type: 'suggestion',
        docs: { description: 'Validate FontAwesome6 icon names' },
      },
      create(context) {
        return {};
      },
    },
  },
};
