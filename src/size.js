/**
 * Minimap sizes: how compact the minimap draws.
 *
 * Below full size, body text draws as gray bars the length of each line,
 * the way code editor minimaps do, while headings stay real text so the
 * outline is still scannable. The CSS reads the chosen scale from the
 * `--minimap-scale` custom property.
 */

const { __ } = wp.i18n;
const { select, dispatch } = wp.data;

/** The sizes offered, as a fraction of the full size minimap. */
export const SIZES = {
	full: 1,
	'two-thirds': 2 / 3,
	half: 1 / 2,
};

export const DEFAULT_SIZE = 'auto';

export const SIZE_OPTIONS = [
	{ value: 'auto', label: __( 'Automatic', 'block-minimap' ) },
	{ value: 'full', label: __( '100%', 'block-minimap' ) },
	{ value: 'two-thirds', label: __( '2/3', 'block-minimap' ) },
	{ value: 'half', label: __( '1/2', 'block-minimap' ) },
];

/*
 * Automatic sizing, by how many blocks the post holds including nested ones.
 * Counting blocks rather than measuring the rendered minimap keeps the choice
 * stable: a measurement would change with the very size it picks.
 */
const AUTO_SIZES = [
	[ 40, 'full' ],
	[ 90, 'two-thirds' ],
	[ Infinity, 'half' ],
];

/*
 * How far the block count has to fall back below a threshold before
 * Automatic grows the minimap again, so adding and removing a block or two
 * around a threshold does not make it jump back and forth.
 */
const AUTO_SLACK = 10;

const PREFERENCE_SCOPE = 'block-minimap';
const PREFERENCE_NAME = 'size';

/**
 * The preferences store, which saves the choice for the user the way the
 * editor saves its own preferences. It arrived in WordPress 6.0, so older
 * installs fall back to the default every time.
 *
 * @return {?Object} The store, or null where it is missing.
 */
const preferencesStore = () =>
	( wp.preferences && wp.preferences.store ) || null;

/**
 * Reads the saved size.
 *
 * @return {string} A size key or `auto`.
 */
export function getSavedSize() {
	const store = preferencesStore();
	const saved = store
		? select( store ).get( PREFERENCE_SCOPE, PREFERENCE_NAME )
		: undefined;

	return saved === 'auto' || SIZES[ saved ] ? saved : DEFAULT_SIZE;
}

/**
 * Saves the size for next time.
 *
 * @param {string} size A size key or `auto`.
 */
export function saveSize( size ) {
	const store = preferencesStore();

	if ( store ) {
		dispatch( store ).set( PREFERENCE_SCOPE, PREFERENCE_NAME, size );
	}
}

/**
 * Picks the automatic size for a block count.
 *
 * @param {number}  count   Blocks in the post, including nested ones.
 * @param {?string} current The size Automatic picked last time, if any.
 * @return {string} A size key.
 */
export function autoSize( count, current ) {
	const indexFor = ( slack ) =>
		AUTO_SIZES.findIndex( ( [ max ] ) => count <= max - slack );
	const currentIndex = AUTO_SIZES.findIndex(
		( [ , size ] ) => size === current
	);

	if ( currentIndex === -1 ) {
		return AUTO_SIZES[ indexFor( 0 ) ][ 1 ];
	}

	const smaller = indexFor( 0 );
	const larger = indexFor( AUTO_SLACK );

	if ( smaller > currentIndex ) {
		return AUTO_SIZES[ smaller ][ 1 ];
	}

	if ( larger < currentIndex ) {
		return AUTO_SIZES[ larger ][ 1 ];
	}

	return current;
}
