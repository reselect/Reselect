var path = require('path')
var ExtractTextPlugin = require('extract-text-webpack-plugin')

module.exports = {
    entry: {
        'reselect': path.resolve(__dirname, '../src/reselect'),
    },
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: '[name].js'
    },
    module: {
        preLoaders: [{
            test: /\.js$/,
            loader: 'eslint-loader',
            include: path.resolve(__dirname, '../src'),
            exclude: [/node_modules/, /template-cache\.js/]
        }],
        loaders: [{
            test: /\.js$/,
            loader: 'babel?presets[]=es2015',
            include: [path.resolve(__dirname, '../src')]
        }, {
            test: /\.html$/,
            loader: 'raw'
        }, {
            test: /\.scss$/,
            loader: ExtractTextPlugin.extract('css!sass')
        }, {
            test: /\.css$/,
            loader: 'raw'
        }, {
            test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
            loader: 'file'
        }]
    },
    resolve: {
        extensions: ['', '.js']
    },
    sassLoader: {
        includePaths: [
            path.resolve(__dirname, '../node_modules/compass-mixins/lib')
        ]
    }
}
