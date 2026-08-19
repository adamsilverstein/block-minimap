/**
 * Internal dependencies
 */
import { blockClasses, blockTitle } from './utils';

/**
 * Renders a separator as the rule itself.
 *
 * @param {Object} block A `core/separator` block.
 * @return {WPElement} The rule.
 */
export const renderSeparator = ( block ) => (
	<hr className={ blockClasses( block ) } aria-label={ blockTitle( block ) } />
);
