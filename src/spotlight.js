/**
 * The viewport spotlight: whether the minimap marks the part of the post
 * visible in the canvas.
 */

import {
	canSavePreferences,
	getPreference,
	savePreference,
} from './preferences';

const PREFERENCE_NAME = 'spotlight';

/**
 * Reads whether the spotlight is on. It is on unless turned off.
 *
 * @param {boolean} unsaved What to return where there is no store to read,
 *                          such as the choice already made this session.
 * @return {boolean} True when the spotlight shows.
 */
export function getSavedSpotlight( unsaved = true ) {
	if ( ! canSavePreferences() ) {
		return unsaved;
	}

	return getPreference( PREFERENCE_NAME ) !== false;
}

/**
 * Saves whether the spotlight shows, for next time.
 *
 * @param {boolean} enabled True to show it.
 */
export const saveSpotlight = ( enabled ) =>
	savePreference( PREFERENCE_NAME, enabled );
