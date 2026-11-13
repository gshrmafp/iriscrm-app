module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
        },
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx', '.json', '.native.js'],
      },
    ],
    [
      'module:react-native-dotenv',
      {moduleName: '@env', path: '.env', safe: false, allowUndefined: false},
    ],
    'react-native-worklets/plugin',
  ],
};
