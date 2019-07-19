// @ts-ignore
const path = require('path');

module.exports = {
    mode: 'development',
    devtool: 'source-map',
    entry: './src/index.tsx',
    output: {
        // @ts-ignore
        path: path.resolve(__dirname, 'www'),
        filename: 'index.js',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
    },
    module: {
        rules: [
            {
                test: /\.worker\.(j|t)s$/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        name: '[name].js',
                    },
                }
            },
            {
                test: /.(j|t)sx?$/,
                use: 'awesome-typescript-loader',
            },
            {
                test: /.css$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                        },
                    },
                ],
            },
        ],
    },
    devServer: {
        host: '0.0.0.0',
        contentBase: path.join(__dirname, 'www'),
        compress: true,
        port: 9000,
    }
};
