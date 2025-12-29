'use strict';

// Core imports
const build = require('@microsoft/sp-build-web');
const bundleAnalyzer = require('webpack-bundle-analyzer');
const path = require('path');
const fs = require('fs');
const { task } = require('gulp');

// Fast serve configuration - let it handle HMR automatically
const { addFastServe } = require('spfx-fast-serve-helpers');

addFastServe(build, {
  serve: {
    open: false,
    port: 4321,
    https: true,
  },
});

// Disable SPFx warnings
build.addSuppression(/Warning - \[sass\]/g);
build.addSuppression(/Warning - lint.*/g);

// Main webpack configuration
build.configureWebpack.mergeConfig({
  additionalConfiguration: generatedConfiguration => {
    const isProduction = build.getConfig().production;

    // Configure path aliases to match tsconfig.json
    // These resolve at both TypeScript compilation and webpack bundling
    generatedConfiguration.resolve = generatedConfiguration.resolve || {};
    generatedConfiguration.resolve.alias = {
      ...generatedConfiguration.resolve.alias,
      '@src': path.resolve(__dirname, 'lib'),
      '@components': path.resolve(__dirname, 'lib/components'),
      '@hooks': path.resolve(__dirname, 'lib/hooks'),
      '@stores': path.resolve(__dirname, 'lib/stores'),
      '@schemas': path.resolve(__dirname, 'lib/schemas'),
      '@contexts': path.resolve(__dirname, 'lib/contexts'),
      '@appTypes': path.resolve(__dirname, 'lib/types'),
      '@services': path.resolve(__dirname, 'lib/services'),
      '@extensions': path.resolve(__dirname, 'lib/extensions'),
      '@sp': path.resolve(__dirname, 'lib/sp'),
      '@utils': path.resolve(__dirname, 'lib/utils'),
    };

    // Enhanced module resolution
    generatedConfiguration.resolve.modules = [
      ...(generatedConfiguration.resolve.modules || []),
      'node_modules',
      path.resolve(__dirname, 'src'),
    ];
    generatedConfiguration.resolve.cache = true;

    // Tree-shaking optimizations
    generatedConfiguration.module = generatedConfiguration.module || {};
    generatedConfiguration.module.rules = generatedConfiguration.module.rules || [];

    // Mark packages as side-effect free for better tree-shaking
    // EXCEPT @pnp modules which have side effects (type augmentation)
    generatedConfiguration.module.rules.push({
      test: /\.tsx?$/,
      exclude: [
        /node_modules\/@pnp/,
        /node_modules\/spfx-toolkit\/lib\/utilities\/context\/pnpImports/
      ],
      sideEffects: false,
    });

    // DevExtreme optimization: use individual component imports for tree-shaking
    // This rule helps webpack understand that DevExtreme React component modules are side-effect free
    generatedConfiguration.module.rules.push({
      test: /node_modules[\\/]devextreme-react[\\/].*.js$/,
      sideEffects: false,
    });

    // DevExtreme core: only keep what's imported
    generatedConfiguration.module.rules.push({
      test: /node_modules[\\/]devextreme[\\/](?!dist[\\/]css).*.js$/,
      sideEffects: false,
    });

    if (isProduction) {
      // Production optimizations
      generatedConfiguration.optimization = {
        ...generatedConfiguration.optimization,
        usedExports: true,
        sideEffects: false,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        // Note: SPFx Form Customizers don't support async chunk splitting
        // Disable to avoid "Unable to find entry point for async bundle" errors
        splitChunks: false,
      };

      // Production source maps
      generatedConfiguration.devtool = 'hidden-source-map';

      // Bundle analyzer
      generatedConfiguration.plugins.push(
        new bundleAnalyzer.BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: path.join(__dirname, 'temp', 'stats', 'bundle-report.html'),
          openAnalyzer: false,
          generateStatsFile: true,
          statsFilename: path.join(__dirname, 'temp', 'stats', 'bundle-stats.json'),
          logLevel: 'warn',
        })
      );

      console.log('🏗️  Production build - Optimized for your dependency stack');
    } else {
      // Development optimizations - keep it simple
      generatedConfiguration.optimization = {
        ...generatedConfiguration.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
        splitChunks: false, // Disable code splitting in dev for faster builds
      };

      // Filesystem cache for faster rebuilds
      generatedConfiguration.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename, path.resolve(__dirname, 'tsconfig.json')],
        },
        cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack'),
        name: 'spfx-dev-cache',
      };

      // Development source maps
      generatedConfiguration.devtool = 'eval-cheap-module-source-map';

      console.log('🔧 Development build - Fast compilation with filesystem cache');
    }

    return generatedConfiguration;
  },
});

// Utility tasks
task('clean-cache', done => {
  console.log('🧹 Clearing build caches...');
  const cacheDir = path.join(__dirname, 'node_modules/.cache');

  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('✅ Cache cleared successfully');
  } else {
    console.log('ℹ️  No cache found');
  }
  done();
});

task('analyze-bundle', done => {
  const reportPath = path.join(__dirname, 'temp', 'stats', 'bundle-report.html');

  if (fs.existsSync(reportPath)) {
    try {
      const open = require('open');
      open(reportPath)
        .then(() => {
          console.log('📊 Bundle analyzer opened');
          done();
        })
        .catch(() => {
          console.log(`📊 Bundle report: ${reportPath}`);
          done();
        });
    } catch {
      console.log(`📊 Bundle report: ${reportPath}`);
      done();
    }
  } else {
    console.log('❌ Run production build first');
    done();
  }
});

// Initialize build
build.initialize(require('gulp'));
