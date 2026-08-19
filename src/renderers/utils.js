const { getBlockType } = wp.blocks;

/*
 * Rich text attributes arrive as RichTextData objects rather than strings, and
 * dangerouslySetInnerHTML needs a string.
 */
export const toHtml = ( value ) => ( value ? String( value ) : '' );

/**
 * Reduces a rich text attribute to plain text, for places that render it as a
 * text node rather than markup.
 *
 * @param {*} value A rich text attribute.
 * @return {string} The text without tags.
 */
export const toPlainText = ( value ) => toHtml( value ).replace( /<[^>]+>/g, '' );

/**
 * The classes every minimap entry carries: `minimap-block` for shared styling
 * plus the block name with its slash flattened, e.g. `core-image`, so styles
 * and tests can address a block type directly.
 *
 * @param {Object}    block Block being rendered.
 * @param {...string} extra Additional class names; falsy entries are dropped.
 * @return {string} Space separated class list.
 */
export const blockClasses = ( block, ...extra ) =>
	[ 'minimap-block', block.name.replace( /\//g, '-' ), ...extra ]
		.filter( Boolean )
		.join( ' ' );

/**
 * The block type's translated title, falling back to the raw block name for
 * types not registered on the client.
 *
 * @param {Object} block Block being rendered.
 * @return {string} Human readable title.
 */
export const blockTitle = ( block ) => {
	const blockType = getBlockType( block.name );

	return ( blockType && blockType.title ) || block.name;
};
