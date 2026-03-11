/**
 * Babel config used only by Jest (Vite uses its own internal transform).
 * Handles TypeScript, React JSX, and transforms import.meta.env to a
 * testable global so frontend services can be tested in a Node environment.
 */
module.exports = (api) => {
  api.cache(true);

  // Plugin: replace `import.meta` with `globalThis.__importMeta` so
  // module-level const SOME_VAR = import.meta.env.VITE_X works in Jest.
  function importMetaPlugin({ types: t }) {
    return {
      visitor: {
        MetaProperty(path) {
          if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
            path.replaceWith(
              t.memberExpression(t.identifier('globalThis'), t.identifier('__importMeta'))
            );
          }
        },
      },
    };
  }

  return {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
      ['@babel/preset-react', { runtime: 'automatic' }],
    ],
    plugins: [importMetaPlugin],
  };
};
