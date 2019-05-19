const path = require("path");

// Uncomment below if you have a large project
// const HappyPack = require("happypack");
// const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

module.exports = {
  entry: ["./src/ts/sketch.ts"],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "babel-loader", // use: 'happypack/loader', if you have a large project
        exclude: ["/node_modules"],
      },
    ],
  },
  plugins: [
    // Uncomment below if you have a large project
    // new HappyPack({
    //   loaders: ['babel-loader']
    // }),
    // new HardSourceWebpackPlugin()
  ],
  resolve: {
    extensions: [".ts", ".js"],
  },
};
