const p5 = {
  modules: [
    {
      name: "p5",
      cdn: "p5.js",
      path: "p5.min.js",
      version: "0.8.0",
    },
    {
      name: "p5",
      cdn: "p5.js",
      path: "addons/p5.sound.min.js",
      version: "0.8.0",
    },
    {
      name: "p5",
      cdn: "p5.js",
      path: "addons/p5.dom.min.js",
      version: "0.8.0",
    },
  ],
  publicPath: "/node_modules",
  prodUrl: "https://cdnjs.cloudflare.com/ajax/libs/:name/:version/:path",
};

module.exports.p5 = p5;
