import { localizeUrl } from '@automattic/i18n-utils';
import { ToggleControl } from '@wordpress/components';
import { useTranslate } from 'i18n-calypso';
import FormSettingExplanation from 'calypso/components/forms/form-setting-explanation';

export const FEATURED_IMAGE_IN_EMAIL_OPTION = 'wpcom_featured_image_in_email';

type FeaturedImageEmailSettingProps = {
	value?: boolean;
	handleToggle: ( field: string ) => ( value: boolean ) => void;
	disabled?: boolean;
};

export const FeaturedImageEmailSetting = ( {
	value = false,
	handleToggle,
	disabled,
}: FeaturedImageEmailSettingProps ) => {
	const translate = useTranslate();

	return (
		<>
			<ToggleControl
				checked={ !! value }
				onChange={ handleToggle( FEATURED_IMAGE_IN_EMAIL_OPTION ) }
				disabled={ disabled }
				label={ translate( 'Enable featured image on your new post emails' ) }
			/>
			<FormSettingExplanation>
				{ translate(
					"Includes your post's featured image in the email sent out to your readers. {{link}}Learn more about the featured image{{/link}}.",
					{
						components: {
							link: (
								<a
									href={ localizeUrl( 'https://wordpress.com/support/featured-images/' ) }
									target="_blank"
									rel="noreferrer"
								/>
							),
						},
					}
				) }
			</FormSettingExplanation>
		</>
	);
};
