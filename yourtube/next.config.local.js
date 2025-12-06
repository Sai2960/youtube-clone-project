const path = require('path');

module.exports = {
  webpack: (config, { dev, webpack }) => {
    if (dev) {
      // Force webpack to only watch project directory
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules|\.next/,
      };

      // Add absolute paths to ignore
      config.plugins.push(
        new webpack.WatchIgnorePlugin({
          paths: [
            path.resolve('C:\\pagefile.sys'),
            path.resolve('C:\\hiberfil.sys'),
            path.resolve('C:\\swapfile.sys'),
            path.resolve('C:\\DumpStack.log.tmp'),
            path.resolve('C:\\System Volume Information'),
            path.resolve('C:\\$RECYCLE.BIN'),
          ],
        })
      );
    }
    return config;
  },
};