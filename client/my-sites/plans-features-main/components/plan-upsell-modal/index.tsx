import { PLAN_PERSONAL, PlanSlug } from '@automattic/calypso-products';
import { DomainSuggestions } from '@automattic/data-stores';
import { DataResponse } from 'calypso/my-sites/plan-features-2023-grid/types';
import { FreePlanFreeDomainDialog } from './free-plan-free-domain-dialog';
import { FreePlanPaidDomainDialog } from './free-plan-paid-domain-dialog';
import { useProgressBlockingModal } from './use-progress-blocking-model';

export const PAID_DOMAIN_FREE_PLAN_SELECTED_MODAL = 'FREE_DOMAIN_FREE_PLAN_SELECTED_MODAL';
export const FREE_DOMAIN_FREE_PLAN_SELECTED_MODAL = 'FREE_DOMAIN_FREE_PLAN_SELECTED_MODAL';
export const MODAL_LOADER = 'MODAL_LOADER';

type Props = {
	isModalOpen: boolean;
	paidDomainName?: string;
	selectedPlan: PlanSlug;
	wpcomFreeDomainSuggestion: DataResponse< DomainSuggestions.DomainSuggestion >;
	flowName: string;
	onClose: () => void;
	onFreePlanSelected: () => void;
	onPlanSelected: ( planSlug: string ) => void;
};

export default function ModalContainer( {
	isModalOpen,
	paidDomainName,
	selectedPlan,
	wpcomFreeDomainSuggestion,
	onClose,
	onFreePlanSelected,
	onPlanSelected,
}: Props ) {
	const { resolveDisplayedModal } = useProgressBlockingModal( { paidDomainName } );

	if ( ! isModalOpen ) {
		return;
	}
	switch ( resolveDisplayedModal( selectedPlan ) ) {
		case PAID_DOMAIN_FREE_PLAN_SELECTED_MODAL:
			return (
				<FreePlanPaidDomainDialog
					paidDomainName={ paidDomainName as string }
					wpcomFreeDomainSuggestion={ wpcomFreeDomainSuggestion }
					suggestedPlanSlug={ PLAN_PERSONAL }
					onClose={ onClose }
					onFreePlanSelected={ () => {
						onFreePlanSelected();
					} }
					onPlanSelected={ () => {
						onPlanSelected( PLAN_PERSONAL );
					} }
				/>
			);
		case FREE_DOMAIN_FREE_PLAN_SELECTED_MODAL:
			<FreePlanFreeDomainDialog
				suggestedPlanSlug={ PLAN_PERSONAL }
				freeSubdomain={ wpcomFreeDomainSuggestion }
				onClose={ onClose }
				onFreePlanSelected={ onFreePlanSelected }
				onPlanSelected={ () => {
					onPlanSelected( PLAN_PERSONAL );
				} }
			/>;
		default:
			break;
	}

	return null;
}
