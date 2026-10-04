/**
 * Minimap sizes: how compact the minimap draws.
 *
 * Below full size, body text draws as gray bars the length of each line,
 * the way code editor minimaps do, while headings stay real text so the
 * outline is still scannable. The CSS reads the chosen scale from the
 * `--minimap-scale` custom property.
 */

import {
	canSavePreferences,
	getPreference,
	savePreference,
} from './preferences';

const { __ } = wp.i18n;
const { select } = wp.data;

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
 * Automatic sizing, by how much the post holds: one point per block,
 * including nested ones, plus one per WORDS_PER_POINT words of text, so a
 * few long paragraphs weigh in as well as many short ones. Counting content
 * rather than measuring the rendered minimap keeps the choice stable: a
 * measurement would change with the very size it picks.
 */
const AUTO_SIZES = [
	[ 30, 'full' ],
	[ 70, 'two-thirds' ],
	[ Infinity, 'half' ],
];

const WORDS_PER_POINT = 100;

/*
 * How far the block count has to fall back below a threshold before
 * Automatic grows the minimap again, so adding and removing a block or two
 * around a threshold does not make it jump back and forth.
 */
const AUTO_SLACK = 10;

/**
 * Reads the saved size.
 *
 * @param {string} unsaved What to return where there is no store to read,
 *                         such as the size already chosen this session.
 * @return {string} A size key or `auto`.
 */
export function getSavedSize( unsaved = DEFAULT_SIZE ) {
	if ( ! canSavePreferences() ) {
		return unsaved;
	}

	const saved = getPreference( 'size' );

	return saved === 'auto' || SIZES[ saved ] ? saved : DEFAULT_SIZE;
}

/**
 * Saves the size for next time.
 *
 * @param {string} size A size key or `auto`.
 */
export const saveSize = ( size ) => savePreference( 'size', size );

/**
 * How much the post holds, as Automatic sizing weighs it.
 *
 * @return {number} One point per block plus one per WORDS_PER_POINT words.
 */
export function contentWeight() {
	const { getClientIdsWithDescendants, getBlockAttributes } = select(
		'core/block-editor'
	);
	const clientIds = getClientIdsWithDescendants();
	let words = 0;

	clientIds.forEach( ( clientId ) => {
		const { content } = getBlockAttributes( clientId ) || {};

		if ( content ) {
			// Rich text may be a string or an object that prints as HTML.
			const text = String( content ).replace( /<[^>]*>/g, ' ' ).trim();

			words += text ? text.split( /\s+/ ).length : 0;
		}
	} );

	return clientIds.length + words / WORDS_PER_POINT;
}

/**
 * Picks the automatic size for how much the post holds.
 *
 * @param {number}  count   The post's content weight, from contentWeight().
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
