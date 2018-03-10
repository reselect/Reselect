/* global __dirname, require, module */

const webpack = require('webpack')
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const path = require('path')
const env = require('yargs').argv.env // use --env with webpack 2

let libraryName = 'reselect'

let plugins = []
let outputFile

if (env === 'build') {
    plugins.push(new UglifyJsPlugin({
        minimize: true
    }))
    outputFile = libraryName + '.min.js'
} else {
    // plugins.push(new ExtractTextPlugin('[name].css'))
    outputFile = libraryName + '.js'
}

const config = {
    entry: __dirname + '/src/index.js',
    devtool: 'source-map',
    devServer: {
        contentBase: path.join(__dirname, 'lib'),
        compress: true,
        port: 9000
    },
    output: {
        path: __dirname + '/lib',
        filename: outputFile,
        library: libraryName,
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    module: {
        rules: [{
            test: /(\.jsx|\.js)$/,
            loader: 'babel-loader',
            exclude: /(node_modules|bower_components)/
        },
        {
            test: /(\.jsx|\.js)$/,
            loader: 'eslint-loader',
            exclude: /node_modules/
        },
        {
            test: /(\.html)$/,
            loader: 'raw-loader'
        },
        {
            test: /\.css$/,
            loader: 'style-loader!css-loader?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]',
            exclude: /node_modules/
        },
        {
            test: /\.scss$/,
            use: [{
                loader: 'style-loader'
            }, {
                loader: 'css-loader'
            }, {
                loader: 'sass-loader'
            }]
        }
        ]
    },
    resolve: {
        modules: [path.resolve('./node_modules'), path.resolve('./src')],
        extensions: ['.json', '.js']
    },
    plugins: plugins
}

module.exports = config
