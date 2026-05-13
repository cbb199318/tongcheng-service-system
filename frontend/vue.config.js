module.exports = {
  publicPath: './',
  runtimeCompiler: true,
  devServer: {
    port: 3000,
    proxy: {
      '^/(user|merchant|admin|staff|common|upload)': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  }
};
