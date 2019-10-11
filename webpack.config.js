const WebpackBar = require( 'webpackbar' );

module.exports = [

	// Build the settings js..
	{
		entry: [ './src/block-minimap.js' ],
		output: {
			filename: 'minimap.js',
			path: __dirname + '/dist/',
		},
		module: {
			rules: [
				{
					test: /\.js$/,

					use: [
						{
							loader: 'babel-loader',
							query: {
								plugins: [ 'lodash' ],
								presets: [ '@babel/env', '@babel/preset-react' ],
							}
						}
					]
				},
				{
					test: /\.css$/,
					use: [ 'style-loader', 'css-loader' ],
				},
			]
		},
		plugins: [ new WebpackBar(
			{
				name: 'Plugin Entry Points',
				color: '#B6CD58',
			}
		) ],
	},

];
