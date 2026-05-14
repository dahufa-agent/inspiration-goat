// eslint-plugin-forbid-emoji: Forbid emoji usage
export default {
  meta: {
    name: 'forbidEmoji',
    version: '1.0.0',
  },
  rules: {
    'no-emoji': {
      meta: {
        type: 'suggestion',
        docs: { description: 'Forbid emoji characters' },
      },
      create(context) {
        return {};
      },
    },
  },
};
