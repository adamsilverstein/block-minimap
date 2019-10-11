<?php
/**
 * Plugin Name:       Block Minimap
 * Plugin URI:        https://github.com/adamsilverstein/minimap
 * Description:       A Block minimap for the WordPress block editor (Gutenberg).
 * Version:           1.0.0
 * Requires at least: 5.0
 * Requires PHP:      5.6
 * Author:            adamsilverstein
 * Author URI:        https://earthbound.com
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
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
		array(  ),
		'',
		true
	);
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\gcm_block_enqueue_scripts' );
