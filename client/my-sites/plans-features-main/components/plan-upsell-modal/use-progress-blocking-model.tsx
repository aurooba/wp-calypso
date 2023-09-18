import { isFreePlan, PlanSlug } from '@automattic/calypso-products';
import {
	PAID_DOMAIN_FREE_PLAN_SELECTED_MODAL,
	FREE_DOMAIN_FREE_PLAN_SELECTED_MODAL,
	MODAL_LOADER,
} from '.';
type Props = {
	paidDomainName?: string;
};

type ModalType =
	| typeof PAID_DOMAIN_FREE_PLAN_SELECTED_MODAL
	| typeof FREE_DOMAIN_FREE_PLAN_SELECTED_MODAL
	| typeof MODAL_LOADER;
type ModalStateDetails = {
	resolveDisplayedModal: ( currentSelectedPlan: PlanSlug ) => ModalType | null;
};

export function useProgressBlockingModal( { paidDomainName }: Props ): ModalStateDetails {
	const resolveDisplayedModal = ( currentSelectedPlan: PlanSlug ): ModalType | null => {
		if ( ! paidDomainName && isFreePlan( currentSelectedPlan ) ) {
			return FREE_DOMAIN_FREE_PLAN_SELECTED_MODAL;
		}
		if ( paidDomainName && isFreePlan( currentSelectedPlan ) ) {
			return PAID_DOMAIN_FREE_PLAN_SELECTED_MODAL;
		}
		return null;
	};

	return {
		resolveDisplayedModal,
	};
}
