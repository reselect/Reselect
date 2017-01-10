var webpack = require('webpack')
var baseWebpack = require('./webpack.base.config')
var merge = require('webpack-merge')
var ExtractTextPlugin = require('extract-text-webpack-plugin')

module.exports = merge(baseWebpack, {
    devtool: 'eval',
    plugins: [
        new webpack.DefinePlugin({
            'DEVELOPMENT': true,
            'PRODUCTION': false
        }),
        new webpack.optimize.OccurenceOrderPlugin(),
        new ExtractTextPlugin('reslect.css')
    ],
    resolve: {},
    eslint: {
        formatter: require('eslint-friendly-formatter')
    }
})
