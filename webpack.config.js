// webpack.config.js

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/js/main.js', // Correct entry point
    output: {
        filename: 'js/[name].[contenthash].js', // [contenthash] for cache busting
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/', // Set to '/' for absolute paths
    },
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development', // Dynamic mode based on environment
    module: {
        rules: [
            // JavaScript: Use Babel to transpile JS files
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
            // CSS: Extract CSS into separate files
            {
                test: /\.css$/i,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                    },
                    'css-loader',
                ],
            },
            // Images: Copy image files to the output directory
            {
                test: /\.(png|jpe?g|gif|svg|ico)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'images/[name].[hash][ext][query]', // e.g., images/favicon.abc123.png
                },
            },
            // Fonts: Handle font files
            {
                test: /\.(woff(2)?|eot|ttf|otf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[name].[hash][ext][query]', // e.g., fonts/BagnardSans.abc123.otf
                },
            },
            // Webmanifest: Handle webmanifest files
            {
                test: /\.webmanifest$/i,
                type: 'asset/resource',
                generator: {
                    filename: '[name].[hash][ext][query]', // e.g., site.abc123.webmanifest
                },
            },
        ],
    },
    plugins: [
        new CleanWebpackPlugin(), // Cleans the dist folder before each build
        new HtmlWebpackPlugin({
            template: './src/pages/index.html', // Source HTML
            filename: 'index.html', // Output HTML
            chunks: ['main'],
            inject: 'body', // Inject scripts at the end of the body
        }),
        // Generate privacy.html
        new HtmlWebpackPlugin({
            filename: 'privacy.html',
            template: './src/pages/privacy.html',
            chunks: ['main'],
        }),
        // Generate about.html
        new HtmlWebpackPlugin({
            filename: 'about.html',
            template: './src/pages/about.html',
            chunks: ['main'],
        }),
        new MiniCssExtractPlugin({
            filename: 'css/[name].[contenthash].css', // e.g., css/styles.abc123.css
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/images/favicons/', to: 'images/favicons/' }, // Copy favicons
                { from: 'src/site.webmanifest', to: 'site.webmanifest' }, // Copy manifest
            ],
        }),
    ],
    optimization: {
        splitChunks: {
            chunks: 'all', // Split vendor code into separate chunks for better caching
        },
    },
    devtool: 'source-map', // Enables source maps for easier debugging
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 3000,
        open: true,
        hot: true, // Enable hot module replacement
        liveReload: true, // Enable live reload
        watchFiles: ['src/**/*'], // Watch for changes in src directory
        proxy: {
            '/api': 'http://localhost:3001', // Proxy API calls to your server
            '/socket.io': {
                target: 'http://localhost:3001',
                ws: true // Enable WebSocket proxying
            }
        }
    },
};
