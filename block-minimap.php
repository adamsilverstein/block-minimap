<?php
/**
 * Plugin Name:       Block Minimap
 * Plugin URI:        https://github.com/10up/minimap
 * Description:       A Block minimap for the WordPress block editor (Gutenberg).
 * Version:           1.0.1
 * Requires at least: 5.2
 * Requires PHP:      5.6
 * Author:            10up
 * Author URI:        https://10up.com
 * License:           MIT
 * License URI:       https://www.gnu.org/licenses/mit.html
 * Text Domain:       minimap
 *
 * @package minimap
 */
namespace BlockMinimap;

 /**
  * Enqueue the admin JavaScript assets.
  */
function gcm_block_enqueue_scripts() {

	wp_enqueue_script(
		'minimap',
		plugin_dir_url( __FILE__ ) . 'dist/minimap.js',
		array( 'wp-blocks', 'wp-i18n', 'wp-editor' ),
		'',
		true
	);
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\gcm_block_enqueue_scripts' );
