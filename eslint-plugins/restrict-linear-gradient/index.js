// eslint-plugin-restrict-linear-gradient: Restrict LinearGradient usage
export default {
  meta: {
    name: 'restrictLinearGradient',
    version: '1.0.0',
  },
  rules: {
    'no-linear-gradient-backgroundcolor': {
      meta: {
        type: 'suggestion',
        docs: { description: 'Restrict LinearGradient usage' },
      },
      create(context) {
        return {};
      },
    },
  },
};
