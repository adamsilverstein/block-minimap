/**
 * External dependencies
 */
const path = require( 'path' );
const { defineConfig, devices } = require( '@playwright/test' );

process.env.WP_ARTIFACTS_PATH ??= path.join( process.cwd(), 'artifacts' );
process.env.STORAGE_STATE_PATH ??= path.join(
	process.env.WP_ARTIFACTS_PATH,
	'storage-states/admin.json'
);

/*
 * `@wordpress/e2e-test-utils-playwright` reads WP_BASE_URL from the environment
 * when it discovers the REST root, so it has to be set rather than only passed
 * to Playwright. It points at the wp-env tests site by default.
 */
process.env.WP_BASE_URL ??= 'http://localhost:8889';

const baseUrl = new URL( process.env.WP_BASE_URL );

module.exports = defineConfig( {
	testDir: './tests/e2e/specs',
	globalSetup: require.resolve( './tests/e2e/config/global-setup.js' ),
	outputDir: path.join( process.env.WP_ARTIFACTS_PATH, 'test-results' ),
	reporter: process.env.CI ? [ [ 'github' ] ] : [ [ 'list' ] ],
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// The minimap redraws on a 250ms debounce, so tests are not instant.
	timeout: 100_000,
	// The suite shares a single WordPress install and one admin session.
	workers: 1,
	use: {
		baseURL: baseUrl.href,
		storageState: process.env.STORAGE_STATE_PATH,
		headless: true,
		viewport: { width: 1280, height: 800 },
		locale: 'en-US',
		contextOptions: {
			reducedMotion: 'reduce',
			strictSelectors: true,
		},
		actionTimeout: 10_000,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'on-first-retry',
	},
	webServer: {
		command: 'npm run env:start',
		port: Number( baseUrl.port ),
		timeout: 300_000,
		reuseExistingServer: true,
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices[ 'Desktop Chrome' ] },
		},
	],
} );
