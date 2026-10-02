/**
 * Exploration for issue #60: a more compact minimap for long documents.
 *
 * Every approach from the issue sits behind one setting so they can be
 * compared side by side on the same post. Only one of them should survive
 * into a real release.
 */

const { __ } = wp.i18n;
const { select } = wp.data;

const STORAGE_KEY = 'blockMinimapCompact';

/** The sizes offered, as a fraction of the full size minimap. */
export const SIZES = {
	full: 1,
	'two-thirds': 2 / 3,
	half: 1 / 2,
};

/**
 * The ways a size can be applied.
 *
 * - transform: `transform: scale()` on the container, with a frame whose
 *   height is corrected so the sidebar scrolls the scaled height.
 * - zoom: CSS `zoom` on the container.
 * - vars: re-render through CSS custom properties, shrinking type, gaps and
 *   media but keeping the full column width.
 * - lines: vars, plus body text drawn as gray bars below full size, with
 *   headings kept as real text.
 */
export const METHODS = [ 'transform', 'zoom', 'vars', 'lines' ];

/*
 * Automatic sizing thresholds, in blocks including nested ones. Counting
 * blocks rather than measuring the rendered minimap keeps the choice stable:
 * measuring would change with the very size it picks.
 */
const AUTO_THRESHOLDS = [
	[ 40, 'full' ],
	[ 90, 'two-thirds' ],
];

export const SIZE_OPTIONS = [
	{ value: 'auto', label: __( 'Automatic', 'block-minimap' ) },
	{ value: 'full', label: __( '100%', 'block-minimap' ) },
	{ value: 'two-thirds', label: __( '2/3', 'block-minimap' ) },
	{ value: 'half', label: __( '1/2', 'block-minimap' ) },
];

export const METHOD_OPTIONS = [
	{ value: 'transform', label: 'transform: scale()' },
	{ value: 'zoom', label: 'zoom' },
	{ value: 'vars', label: 'Custom properties' },
	{ value: 'lines', label: 'Custom properties + lines' },
];

const DEFAULTS = { size: 'full', method: 'lines' };

/**
 * Reads the saved choice, falling back to the defaults wherever storage is
 * unavailable or holds something unexpected.
 *
 * @return {{size: string, method: string}} The saved choice.
 */
export function loadCompact() {
	try {
		const saved = JSON.parse(
			window.localStorage.getItem( STORAGE_KEY ) || '{}'
		);

		return {
			size:
				saved.size === 'auto' || SIZES[ saved.size ]
					? saved.size
					: DEFAULTS.size,
			method: METHODS.includes( saved.method )
				? saved.method
				: DEFAULTS.method,
		};
	} catch ( e ) {
		return { ...DEFAULTS };
	}
}

/**
 * Saves the choice for next time, quietly doing nothing where storage is
 * unavailable.
 *
 * @param {{size: string, method: string}} compact The choice.
 */
export function saveCompact( compact ) {
	try {
		window.localStorage.setItem( STORAGE_KEY, JSON.stringify( compact ) );
	} catch ( e ) {}
}

/**
 * Resolves `auto` to a concrete size from how many blocks the post holds.
 *
 * @param {string} size A size key or `auto`.
 * @return {string} A size key.
 */
export function resolveSize( size ) {
	if ( size !== 'auto' ) {
		return size;
	}

	const count = select( 'core/block-editor' ).getClientIdsWithDescendants()
		.length;
	const match = AUTO_THRESHOLDS.find( ( [ max ] ) => count <= max );

	return match ? match[ 1 ] : 'half';
}
