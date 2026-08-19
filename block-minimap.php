<?php
/**
 * Plugin Name:       Block Minimap
 * Plugin URI:        https://github.com/adamsilverstein/minimap
 * Description:       A Block minimap for the WordPress block editor (Gutenberg).
 * Version:           1.1.0
 * Requires at least: 5.0
 * Requires PHP:      5.6
 * Author:            adamsilverstein
 * Author URI:        https://earthbound.com
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
 * Text Domain:       block-minimap
 *
 * @package minimap
 */
namespace BlockMinimap;

/**
 * The plugin's version, read from its own header.
 *
 * The version is the editor bundle's cache key, so it has to be the version
 * that shipped the bundle. Reading the header rather than repeating it keeps
 * a release from bumping one and not the other, which would leave browsers
 * on the previous bundle.
 *
 * @return string Plugin version.
 */
function get_version() {
	static $version = null;

	if ( null === $version ) {
		$data    = get_file_data( __FILE__, array( 'Version' => 'Version' ) );
		$version = $data['Version'];
	}

	return $version;
}

 /**
  * Enqueue the admin JavaScript assets.
  */
function gcm_block_enqueue_scripts() {

	wp_enqueue_script(
		'minimap',
		plugin_dir_url( __FILE__ ) . 'dist/minimap.js',
		array( 'lodash', 'wp-block-editor', 'wp-blocks', 'wp-components', 'wp-data', 'wp-edit-post', 'wp-editor', 'wp-element', 'wp-i18n', 'wp-plugins' ),
		get_version(),
		true
	);

	/*
	 * Registers the script's translations, so the strings the bundle
	 * translates against this domain can actually be translated.
	 */
	wp_set_script_translations( 'minimap', 'block-minimap' );
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\gcm_block_enqueue_scripts' );
