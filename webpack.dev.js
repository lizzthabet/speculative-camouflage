const package_json = require("./package.json");
const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = merge(common, {
  mode: "development",
  devServer: {
    compress: true,
    open: true,
  },
  devtool: "inline-source-map",
  plugins: [
    new HtmlWebpackPlugin({
      title: "Dev | " + package_json.name,
      template: "src/index.html",
    }),
  ],
});
