import 'calypso/state/ui/init';

/**
 * Returns the current layout focus area
 *
 *
 * @param {Object}  state Global state tree
 * @returns {?string}  The current layout focus area
 */
export function getCurrentLayoutFocus( state ) {
	return state.ui.layoutFocus.current;
}
