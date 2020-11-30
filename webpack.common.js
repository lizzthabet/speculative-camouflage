const path = require("path");

module.exports = {
  entry: ["./src/ts/index.ts"],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.worker.\.ts$/,
        use: [
          { loader: "babel-loader" },
          { loader: "worker-loader" },
        ], 
        exclude: ["/node_modules"],
      },
      {
        test: /\.ts$/,
        use: "babel-loader",
        exclude: ["/node_modules"],
      },
    ],
  },
  plugins: [],
  resolve: {
    extensions: [".ts", ".js"],
  },
};
