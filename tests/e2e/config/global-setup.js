/**
 * External dependencies
 */
const { request } = require( '@playwright/test' );
const { RequestUtils } = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Authenticates once for the whole run, activates the plugin under test and
 * clears out any posts left behind by an earlier run.
 *
 * @param {import('@playwright/test').FullConfig} config Playwright config.
 */
async function globalSetup( config ) {
	const { storageState, baseURL } = config.projects[ 0 ].use;
	const storageStatePath =
		typeof storageState === 'string' ? storageState : undefined;

	const requestContext = await request.newContext( { baseURL } );
	const requestUtils = new RequestUtils( requestContext, {
		storageStatePath,
	} );

	await requestUtils.setupRest();

	await requestUtils.activatePlugin( 'block-minimap' );
	await requestUtils.deleteAllPosts();

	await requestContext.dispose();
}

module.exports = globalSetup;
