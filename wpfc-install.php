<?php
//if called, assume we're installing/updated
add_option('wpfc_theme', get_option('dbem_emfc_theme', 1));
add_option('wpfc_theme_css', 'ui-lightness');
add_option('wpfc_limit', get_option('dbem_emfc_events_limit', 3));
add_option('wpfc_limit_txt', get_option('dbem_emfc_events_limit_txt', 'more ...'));
add_option('wpfc_qtips', get_option('dbem_emfc_qtips', true));
add_option('wpfc_qtips_image', 1);
add_option('wpfc_qtips_image_w', 75);
add_option('wpfc_qtips_image_h', 75);
add_option('wpfc_timeFormat', 'h(:mm)A');
add_option('wpfc_defaultView', 'month');
add_option('wpfc_available_views', array('month','basicWeek','basicDay'));
add_option('wpfc_tippy_placement', 'auto');
add_option('wpfc_tippy_placeholder', __('Loading...', 'wp-fullcalendar'));
add_option('wpfc_tippy_theme', 'light-border');

//make a change to the theme
if ( version_compare( get_option('wpfc_version'), '1.0.2') ) {
	$wpfc_theme_css = get_option('wpfc_theme_css');
	//replace CSS theme value for new method
	$wpfc_theme_css = str_replace( plugins_url('includes/css/ui-themes/', __FILE__), '', $wpfc_theme_css);
	if ( $wpfc_theme_css !== get_option('wpfc_theme_css') ) {
		//it uses jQuery UI CSS, so remove trailing .css from value
		$wpfc_theme_css = str_replace('.css', '', $wpfc_theme_css);
	} else {
		//replace custom CSS value
		$wpfc_theme_css = str_replace( get_stylesheet_directory_uri() . '/plugins/wp-fullcalendar/', '', $wpfc_theme_css);
	}
	update_option('wpfc_theme_css', $wpfc_theme_css);
}
if ( get_option('wpfc_version', 0) < 1.32 ) {
	$qtip_positions = array(
		'top left' => 'top-start',
		'top right' => 'top-end',
		'top center' => 'top',
		'bottom left' => 'bottom-start',
		'bottom right' => 'bottom-end',
		'bottom center' => 'bottom',
		'right center' => 'right',
		'right top' => 'right',
		'right bottom' => 'right',
		'left center' => 'left',
		'left top' => 'left',
		'left bottom' => 'left',
		'center' => 'auto'
	);
	$qtip_position = get_option('wpfc_qtips_at');
	if ( !empty($qtip_positions[$qtip_position]) ) {
		update_option('wpfc_tippy_placement', $qtip_positions[$qtip_position]);
	}
	// remove qtip options - //TODO at later date to allow rollbacks
	//delete_option('wpfc_qtips_style');
	//delete_option('wpfc_qtips_my');
	//delete_option('wpfc_qtips_at');
	//delete_option('wpfc_qtips_rounded');
}

//update version
update_option('wpfc_version', WPFC_VERSION);
