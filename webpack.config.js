var path = require('path');

module.exports = (env, argv) => {
  let devtool = false;
  if (argv.mode === 'development') {
    devtool = 'inline-source-map';
  }
  console.log(`${argv.mode} build`);
  const externals = {
    aframe: {
      commonjs: 'aframe',
      commonjs2: 'aframe',
      amd: 'aframe',
      root: 'AFRAME' // indicates global variable
    },
    three: {
      commonjs: 'three',
      commonjs2: 'three',
      amd: 'three',
      root: 'THREE' // indicates global variable
    }
  };
  const module = {
    rules: [
      {
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: {
            inline: 'no-fallback'
          }
        }
      },
      {
        test: /\.ts$/,
        loader: 'ts-loader'
      }
    ]
  };

  return [{
    name: 'threex',
    devtool,
    entry: './three.js/src/index-threex.ts',
    output: {
      library: 'THREEx',
      path: path.resolve(__dirname, 'three.js/build'),
      filename: 'ar-threex.js',
      libraryTarget: 'umd',
      globalObject: 'this'
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        jsartoolkit: '@ar-js-org/artoolkit5-js',
        threexArmarkercontrols$: path.resolve(__dirname, 'three.js/src/threex/arjs-markercontrols.js')
      }
    },
    module,
    externals: {
      three: {
      commonjs: 'three',
      commonjs2: 'three',
      amd: 'three',
      root: 'THREE' // indicates global variable
      }
    }
  },
  {
    name: 'threex-location-only',
    devtool,
    entry: './three.js/src/location-based/index.ts',
    output: {
      library: 'THREEx',
      path: path.resolve(__dirname, 'three.js/build'),
      filename: 'ar-threex-location-only.js',
      libraryTarget: 'umd',
      globalObject: 'this'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module,
    externals: {
      three: {
      commonjs: 'three',
      commonjs2: 'three',
      amd: 'three',
      root: 'THREE' // indicates global variable
      }
    }
  },
  {
    name: 'ar.js',
    devtool,
    entry: './three.js/src/index-arjs.ts',
    output: {
      library: 'ARjs',
      path: path.resolve(__dirname, 'three.js/build'),
      filename: 'ar.js',
      libraryTarget: 'umd',
      globalObject: 'this'
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        jsartoolkit: '@ar-js-org/artoolkit5-js',
        threexArmarkercontrols$: path.resolve(__dirname, 'three.js/src/threex/arjs-markercontrols.js')
      }
    },
    module,
    externals: {
      three: {
      commonjs: 'three',
      commonjs2: 'three',
      amd: 'three',
      root: 'THREE' // indicates global variable
      }
    }
  }
 ];
};
