import { useQuery } from '@tanstack/react-query';
import apiFetch, { APIFetchOptions } from '@wordpress/api-fetch';
import wpcomRequest, { canAccessWpcomApis } from 'wpcom-proxy-request';

interface AvailableChecklist {
	slug: string;
	title: string;
}

interface AvailableChecklistObject {
	[ key: string ]: AvailableChecklist;
}

interface LaunchpadNavigatorResponse {
	available_checklists: AvailableChecklistObject;
	current_checklist: string | null;
}

export const fetchLaunchpadNavigator = (
	siteSlug: string
): Promise< LaunchpadNavigatorResponse > => {
	const slug = encodeURIComponent( siteSlug );

	return canAccessWpcomApis()
		? wpcomRequest( {
				path: `/sites/${ slug }/launchpad/navigator`,
				apiNamespace: 'wpcom/v2',
				apiVersion: '2',
		  } )
		: apiFetch( {
				global: true,
				path: `/wpcom/v2/launchpad/navigator`,
		  } as APIFetchOptions );
};

export const useLaunchpadNavigator = ( siteSlug: string, current_checklist: string ) => {
	const key = [ 'launchpad-navigator', siteSlug, current_checklist ];

	return useQuery( {
		queryKey: key,
		queryFn: () =>
			fetchLaunchpadNavigator( siteSlug ).then( ( response ) => {
				const available_checklists = Object.values( response.available_checklists );

				return {
					available_checklists,
					current_checklist: response.current_checklist,
				};
			} ),
		retry: 3,
		initialData: {
			available_checklists: [],
			current_checklist: null,
		},
	} );
};
