'use strict';

// Core imports
const build = require('@microsoft/sp-build-web');
const bundleAnalyzer = require('webpack-bundle-analyzer');
const webpack = require('webpack');
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
      '@constants': path.resolve(__dirname, 'lib/constants'),
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

    // Bundle optimization plugins
    generatedConfiguration.plugins = generatedConfiguration.plugins || [];

    // Ignore unnecessary DevExtreme locales (only keep en)
    generatedConfiguration.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /devextreme/
      })
    );

    // Ignore moment.js locales if moment is used (common in date libraries)
    generatedConfiguration.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/
      })
    );

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

// Version info task - displays current build configuration
task('version', done => {
  const packageJson = require('./package.json');
  const configJson = require('./config/package-solution.json');

  console.log('\n📦 Legal Workflow Build Info');
  console.log('─'.repeat(40));
  console.log(`Package:     ${packageJson.name}`);
  console.log(`Version:     ${configJson.solution.version}`);
  console.log(`Node:        ${process.version}`);
  console.log(`SPFx:        1.21.1`);
  console.log(`TypeScript:  ${packageJson.devDependencies.typescript}`);
  console.log(`React:       ${packageJson.dependencies.react}`);
  console.log('─'.repeat(40) + '\n');
  done();
});

// Bundle size check task - warns if bundle is too large
task('check-size', done => {
  const statsPath = path.join(__dirname, 'temp', 'stats', 'bundle-stats.json');
  const MAX_BUNDLE_SIZE_KB = 1500; // 1.5MB warning threshold

  if (!fs.existsSync(statsPath)) {
    console.log('⚠️  No bundle stats found. Run "npm run release" first.');
    done();
    return;
  }

  try {
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    const assets = stats.assets || [];

    console.log('\n📊 Bundle Size Analysis');
    console.log('─'.repeat(60));

    // Filter and deduplicate JS assets (exclude release path duplicates and localization files)
    const seenNames = new Set();
    const jsAssets = assets
      .filter(a => {
        // Only JS files, no source maps
        if (!a.name.endsWith('.js') || a.name.includes('.map')) return false;
        // Skip release path duplicates
        if (a.name.includes('../release/')) return false;
        // Skip localization files (ControlStrings_*)
        if (a.name.includes('ControlStrings_')) return false;
        // Deduplicate by base name
        const baseName = path.basename(a.name);
        if (seenNames.has(baseName)) return false;
        seenNames.add(baseName);
        return true;
      })
      .sort((a, b) => b.size - a.size);

    let totalSize = 0;
    const mainBundles = [];
    const chunks = [];

    jsAssets.forEach(asset => {
      const baseName = path.basename(asset.name);
      if (baseName.startsWith('chunk.') || baseName.includes('Strings_')) {
        chunks.push(asset);
      } else {
        mainBundles.push(asset);
      }
      totalSize += asset.size;
    });

    // Show main bundles
    console.log('\n📦 Main Bundles:');
    mainBundles.forEach(asset => {
      const sizeKB = (asset.size / 1024).toFixed(1);
      const sizeMB = (asset.size / 1024 / 1024).toFixed(2);
      const icon = asset.size > MAX_BUNDLE_SIZE_KB * 1024 ? '🔴' : '🟢';
      const displaySize = asset.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
      console.log(`   ${icon} ${path.basename(asset.name)}: ${displaySize}`);
    });

    // Show chunks summary
    if (chunks.length > 0) {
      const chunksTotal = chunks.reduce((sum, c) => sum + c.size, 0);
      console.log(`\n📎 Lazy-loaded chunks: ${chunks.length} files (${(chunksTotal / 1024).toFixed(1)} KB total)`);
    }

    console.log('\n' + '─'.repeat(60));
    const totalKB = (totalSize / 1024).toFixed(1);
    const totalMB = (totalSize / 1024 / 1024).toFixed(2);
    const totalIcon = totalSize > MAX_BUNDLE_SIZE_KB * 1024 ? '⚠️ ' : '✅';
    console.log(`${totalIcon} Total JS (excluding localization): ${totalMB} MB (${totalKB} KB)`);

    // Provide actionable insights
    const largestBundle = mainBundles[0];
    if (largestBundle && largestBundle.size > 2 * 1024 * 1024) {
      console.log(`\n💡 Tip: Your largest bundle (${path.basename(largestBundle.name)}) is ${(largestBundle.size / 1024 / 1024).toFixed(1)} MB.`);
      console.log('   Run "gulp analyze-bundle" to see what\'s inside.\n');
    } else {
      console.log('');
    }
  } catch (err) {
    console.log('❌ Failed to parse bundle stats:', err.message);
  }
  done();
});

// Clean all build artifacts
task('clean-all', done => {
  console.log('🧹 Cleaning all build artifacts...');

  const dirsToClean = [
    'lib',
    'dist',
    'temp',
    'release',
    'sharepoint/solution',
    'node_modules/.cache'
  ];

  dirsToClean.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`  ✓ Removed ${dir}`);
    }
  });

  console.log('✅ Clean complete\n');
  done();
});

// Pre-deploy checklist
task('pre-deploy', done => {
  console.log('\n🚀 Pre-Deployment Checklist');
  console.log('─'.repeat(40));

  const checks = [];

  // Check if production build exists
  const sppkgPath = path.join(__dirname, 'sharepoint', 'solution', 'legal-workflow.sppkg');
  checks.push({
    name: 'Production package exists',
    pass: fs.existsSync(sppkgPath),
    hint: 'Run: npm run release'
  });

  // Check package-solution.json version
  try {
    const configJson = require('./config/package-solution.json');
    const version = configJson.solution.version;
    checks.push({
      name: `Version set (${version})`,
      pass: version && version !== '0.0.0.0',
      hint: 'Update version in config/package-solution.json'
    });
  } catch {
    checks.push({ name: 'package-solution.json readable', pass: false });
  }

  // Check for console.log in source (basic check)
  const srcDir = path.join(__dirname, 'src');
  let hasConsoleLogs = false;
  const checkForConsole = dir => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
      if (entry.isDirectory()) {
        checkForConsole(path.join(dir, entry.name));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
        if (/console\.(log|debug|info)\(/.test(content)) {
          hasConsoleLogs = true;
        }
      }
    });
  };
  checkForConsole(srcDir);
  checks.push({
    name: 'No console.log in source',
    pass: !hasConsoleLogs,
    hint: 'Use SPContext.logger instead'
  });

  // Display results
  let allPassed = true;
  checks.forEach(check => {
    const icon = check.pass ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    if (!check.pass && check.hint) {
      console.log(`   └─ ${check.hint}`);
      allPassed = false;
    }
  });

  console.log('─'.repeat(40));
  if (allPassed) {
    console.log('✅ Ready for deployment!\n');
  } else {
    console.log('⚠️  Address issues above before deploying.\n');
  }

  done();
});

// Initialize build
build.initialize(require('gulp'));
