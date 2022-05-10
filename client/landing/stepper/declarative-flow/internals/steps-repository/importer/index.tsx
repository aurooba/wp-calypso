/* eslint-disable wpcalypso/jsx-classname-namespace */
import { SiteDetails } from '@automattic/data-stores/dist/types/site';
import { StepContainer } from '@automattic/onboarding';
import { useI18n } from '@wordpress/react-i18n';
import classnames from 'classnames';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DocumentHead from 'calypso/components/data/document-head';
import QuerySites from 'calypso/components/data/query-sites';
import { LoadingEllipsis } from 'calypso/components/loading-ellipsis';
import { useQuery } from 'calypso/landing/stepper/hooks/use-query';
import { useSite } from 'calypso/landing/stepper/hooks/use-site';
import { useSiteSlugParam } from 'calypso/landing/stepper/hooks/use-site-slug-param';
import { recordTracksEvent } from 'calypso/lib/analytics/tracks';
import { EVERY_FIVE_SECONDS, Interval } from 'calypso/lib/interval';
import NotAuthorized from 'calypso/signup/steps/import-from/components/not-authorized';
import NotFound from 'calypso/signup/steps/import-from/components/not-found';
import { Importer, ImportJob } from 'calypso/signup/steps/import-from/types';
import { getImporterTypeForEngine } from 'calypso/signup/steps/import-from/util';
import { fetchImporterState, resetImport } from 'calypso/state/imports/actions';
import { appStates } from 'calypso/state/imports/constants';
import {
	getImporterStatusForSiteId,
	isImporterStatusHydrated as isImporterStatusHydratedSelector,
} from 'calypso/state/imports/selectors';
import { analyzeUrl } from 'calypso/state/imports/url-analyzer/actions';
import { getUrlData } from 'calypso/state/imports/url-analyzer/selectors';
import { canCurrentUser } from 'calypso/state/selectors/can-current-user';
import { StepProps } from '../../types';
import { useInitialQueryRun } from './hooks/use-initial-query-run';
import { useStepNavigator } from './hooks/use-step-navigator';
import { ImporterCompType } from './types';

interface Props {
	importer: Importer;
}

export function withImporterWrapper( Importer: ImporterCompType ) {
	const ImporterWrapper = ( props: Props & StepProps ) => {
		const { __ } = useI18n();
		const dispatch = useDispatch();
		const { importer, navigation } = props;
		const currentSearchParams = useQuery();

		/**
	 	↓ Fields
	 	*/
		const site = useSite();
		const siteSlug = useSiteSlugParam();
		const siteId = site?.ID;
		const runImportInitially = useInitialQueryRun( siteId );
		const canImport = useSelector( ( state ) =>
			canCurrentUser( state, site?.ID as number, 'manage_options' )
		);
		const siteImports = useSelector( ( state ) => getImporterStatusForSiteId( state, siteId ) );
		const isImporterStatusHydrated = useSelector( isImporterStatusHydratedSelector );

		const fromSite = currentSearchParams.get( 'from' ) as string;
		const fromSiteData = useSelector( getUrlData );
		const stepNavigator = useStepNavigator(
			navigation,
			siteId as number,
			siteSlug as string,
			fromSite
		);

		/**
	 	↓ Effects
	 	*/
		useEffect( fetchImporters, [ siteId ] );
		useEffect( checkFromSiteData, [ fromSiteData?.url ] );
		if ( ! importer ) {
			stepNavigator.goToImportCapturePage?.();
			return null;
		}

		/**
	 	↓ Methods
	 	*/
		function onGoBack() {
			resetImportJob( getImportJob( importer as Importer ) );
			navigation.goBack();
		}

		function fetchImporters() {
			siteId && dispatch( fetchImporterState( siteId ) );
		}

		function getImportJob( importer: Importer ): ImportJob | undefined {
			return siteImports.find( ( x ) => x.type === getImporterTypeForEngine( importer ) );
		}

		function resetImportJob( job: ImportJob | undefined ): void {
			if ( ! job ) return;

			switch ( job.importerState ) {
				case appStates.IMPORTING:
				case appStates.MAP_AUTHORS:
				case appStates.READY_FOR_UPLOAD:
				case appStates.UPLOAD_PROCESSING:
				case appStates.UPLOAD_SUCCESS:
				case appStates.UPLOADING:
				case appStates.UPLOAD_FAILURE:
					dispatch( resetImport( siteId, job.importerId ) );
					break;
			}
		}

		function hasPermission(): boolean {
			return canImport;
		}

		function isLoading(): boolean {
			return ! isImporterStatusHydrated;
		}

		function checkFromSiteData(): void {
			if ( fromSite !== fromSiteData?.url ) {
				dispatch( analyzeUrl( fromSite ) );
			}
		}

		/**
	 	↓ Renders
	 	*/
		function renderStepContent() {
			if ( isLoading() ) {
				return <LoadingEllipsis />;
			} else if ( ! siteSlug ) {
				return <NotFound />;
			} else if ( ! hasPermission() ) {
				return (
					<NotAuthorized
						onStartBuilding={ stepNavigator?.goToIntentPage }
						onBackToStart={ stepNavigator?.goToImportCapturePage }
					/>
				);
			}

			return (
				<Importer
					job={ getImportJob( importer ) }
					run={ runImportInitially }
					siteId={ siteId as number }
					site={ site as SiteDetails }
					siteSlug={ siteSlug as string }
					fromSite={ fromSite }
					urlData={ fromSiteData }
					stepNavigator={ stepNavigator }
				/>
			);
		}

		return (
			<>
				<QuerySites allSites />
				<DocumentHead title={ __( 'Import your site content' ) } />
				<Interval onTick={ fetchImporters } period={ EVERY_FIVE_SECONDS } />

				<StepContainer
					className={ classnames(
						'import__onboarding-page',
						'import-layout__center',
						'importer-wrapper',
						{ [ `importer-wrapper__${ importer }` ]: !! importer }
					) }
					stepName={ 'importer-step' }
					hideSkip={ true }
					hideFormattedHeader={ true }
					goBack={ onGoBack }
					isWideLayout={ true }
					stepContent={ renderStepContent() }
					recordTracksEvent={ recordTracksEvent }
				/>
			</>
		);
	};

	return ImporterWrapper;
}
