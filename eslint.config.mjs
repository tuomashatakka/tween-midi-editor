import config from '@tuomashatakka/eslint-config'


export default [
  {
    ignores: [
      'dist/**',
      'dist-electron/**',
      'node_modules/**',
      'coverage/**',
      'release/**',
    ],
  },
  ...config,
]
