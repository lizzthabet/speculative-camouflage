const package_json = require("./package.json");
const path = require("path");
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const TerserPlugin = require("terser-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = merge(common, {
  mode: "production",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "./",
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        exclude: ["/node_modules"],
        parallel: true,
        terserOptions: {
          compress: {
            drop_console: false,
          },
        },
      }),
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: package_json.name,
      template: "src/index.html",
    }),
  ],
});
