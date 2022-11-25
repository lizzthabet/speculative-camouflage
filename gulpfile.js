const { src, dest, series, parallel, watch } = require('gulp')
const webpack = require('webpack')
const browserSync = require('browser-sync').create()
const del = require('del')
const webpackDevConfig = require('./webpack.dev.js')
const webpackProdConfig = require('./webpack.prod.js')

// Clean distribution directory
const clean = () => del('dist/**')

// Bundling TS
const bundle = (config) => () => {
  return new Promise((resolve, reject) => {
    webpack(config, (error, stats) => {
      if (error) {
          return reject(error)
      }
      if (stats.hasErrors()) {
          return reject(new Error(stats.compilation.errors.join('\n')))
      }
      resolve()
    })
  })
}

const devBundle = bundle(webpackDevConfig)
devBundle.displayName = 'dev-bundle'

const prodBundle = bundle(webpackProdConfig)
prodBundle.displayName = 'prod-bundle'

// Copying files
const css = () => src('src/css/*').pipe(dest('dist/'))
const assets = () => src('src/img/*').pipe(dest('dist/img/'))
const html = () => src('src/*.html').pipe(dest('dist/'))
const config = () => src('src/_headers').pipe(dest('dist/'))

// Watching files
const watchFiles = () => {
  watch('src/css/*', series(css, reload))
  watch('src/img/*', series(assets, reload))
  watch('src/*.html', series(html, reload))
  watch('src/**/*.ts', series(devBundle, reload))
}

// Serving files
const serve = (done) => {
  browserSync.init({
    server: './dist',
    port: 8080,
  }, done)
}

const serveAndWatch = (done) => {
  browserSync.init({
    server: './dist',
    port: 8080,
  }, done)

  watchFiles()
}
serveAndWatch.displayName = 'serve-and-watch'

const reload = (done) => {
  browserSync.reload()
  done()
}

// Creating production bundle
const productionBuild = series(
  prodBundle,
  parallel(css, assets, html, config),
)

exports.clean = clean
exports.copy = parallel(css, assets, html, config)
exports.build = productionBuild
exports.serve = serve
exports.develop = series(devBundle, parallel(css, assets, html), serveAndWatch)
exports.watch = watchFiles
