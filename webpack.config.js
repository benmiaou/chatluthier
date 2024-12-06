// webpack.config.js

const webpack = require('webpack')
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


const isLocal = process.env.NODE_ENV === 'local';


module.exports = {
    entry: './src/js/main.js',
    output: {
        filename: 'js/[name].[contenthash].js', // [contenthash] for cache busting
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/', // Set to '/' for absolute paths
    },
    mode: isLocal ? 'development' : 'production',
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
                use: !isLocal
                    ? [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            publicPath: '../', // Adjust the publicPath relative to CSS
                        },
                    },
                    'css-loader',
                    'postcss-loader'
                ] :  ['style-loader', 'css-loader', 'postcss-loader'],
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
        ...(!isLocal ? [new MiniCssExtractPlugin({
            filename: 'css/[name].[contenthash].css',
        })] : []),
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
        watchFiles: ['src/**/*'],
        port: 5000,
        open: false,
        liveReload: true,
        hot: false, // Disable HMR
        proxy: {
            '/': {
                target: 'http://0.0.0.0:3000', // Updated to match backend server port
                changeOrigin: true,
            },
        },
    },
    watchOptions: {
        poll: 1000, // Check for changes every second
        ignored: /node_modules/, // Ignore node_modules for performance
    },
};
