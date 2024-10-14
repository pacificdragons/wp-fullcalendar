<?php
class WPFC_Admin {
	
	public static function menus() {
		$page = add_options_page('WP FullCalendar', 'WP FullCalendar', 'manage_options', 'wp-fullcalendar', array('WPFC_Admin','admin_options'));
		wp_enqueue_style('wp-fullcalendar', plugins_url('includes/css/admin.css', __FILE__));
	}


	public static function admin_options() {
		if ( !empty($_REQUEST['_wpnonce']) && wp_verify_nonce($_REQUEST['_wpnonce'], 'wpfc_options_save')) {
			foreach ($_REQUEST as $option_name => $option_value) {
				if (substr($option_name, 0, 5) == 'wpfc_') {
					if ( $option_name == 'wpfc_scripts_limit' ) {
						$option_value = str_replace( ' ', '', $option_value ); //clean up comma seperated emails, no spaces needed
					}
					update_option($option_name, static::sanitize_text_array($option_value));
				}
			}
			if ( empty($_REQUEST['wpfc_post_taxonomies']) ) {
				update_option('wpfc_post_taxonomies', '');
			}
			echo '<div class="updated notice"><p>' . esc_html__('Settings saved.') . '</p></div>';
		}
		$tippy_options = array(
			'top' => __('Top', 'wp-fullcalendar') . '-' . __('Center', 'wp-fullcalendar'),
			'top-start' => __('Top', 'wp-fullcalendar') . '-' . __('Left', 'wp-fullcalendar'),
			'top-end' => __('Top', 'wp-fullcalendar') . '-' . __('Right', 'wp-fullcalendar'),
			
			'bottom' => __('Bottom', 'wp-fullcalendar') . '-' . __('Center', 'wp-fullcalendar'),
			'bottom-start' => __('Bottom', 'wp-fullcalendar') . '-' . __('Left', 'wp-fullcalendar'),
			'bottom-end' => __('Bottom', 'wp-fullcalendar') . '-' . __('Right', 'wp-fullcalendar'),
			
			'left' => __('Left', 'wp-fullcalendar') . '-' . __('Center', 'wp-fullcalendar'),
			'left-start' => __('Left', 'wp-fullcalendar') . '-' . __('Top', 'wp-fullcalendar'),
			'left-end' => __('Left', 'wp-fullcalendar') . '-' . __('Bottom', 'wp-fullcalendar'),
			
			'right' => __('Right', 'wp-fullcalendar') . '-' . __('Center', 'wp-fullcalendar'),
			'right-start' => __('Right', 'wp-fullcalendar') . '-' . __('Top', 'wp-fullcalendar'),
			'right-end' => __('Right', 'wp-fullcalendar') . '-' . __('Bottom', 'wp-fullcalendar'),
			
			'auto' => __('Auto', 'wp-fullcalendar') . '-' . __('Center', 'wp-fullcalendar'),
			'auto-start' => __('Auto', 'wp-fullcalendar') . '-' . __('Start', 'wp-fullcalendar'),
			'auto-end' => __('Auto', 'wp-fullcalendar') . '-' . __('End', 'wp-fullcalendar'),

		)
		?>
		<div class="wrap" id="wp-fullcalendar-options">
			<h1>WP FullCalendar</h1>
			<div id="poststuff" class="metabox-holder has-right-sidebar">
				<div id="side-info-column" class="inner-sidebar">
					<div id="categorydiv" class="postbox ">
						<h3 class="hndle" style="color:green;">** Support this plugin! **</h3>
						<div class="inside">
							<p>This plugin was developed by <a href="http://msyk.es/">Marcus Sykes</a> and is now provided free of charge thanks to proceeds from the <a href="http://wp-events-plugin.com/">Events Manager</a> Pro plugin.</p>
							<p>We're not asking for donations, but we'd appreciate a 5* rating and/or a link to our plugin page!</p>
							<ul>
								<li><a href="http://wordpress.org/extend/plugins/wp-fullcalendar/" >Give us 5 Stars on WordPress.org</a></li>
								<li><a href="http://wordpress.org/extend/plugins/wp-fullcalendar/" >Link to our plugin page.</a></li>
							</ul>
						</div>
					</div>
					<div id="categorydiv" class="postbox ">
						<h3 class="hndle">About FullCalendar</h3>
						<div class="inside">
							<p><a href="http://arshaw.com/fullcalendar/">FullCalendar</a> is a jQuery plugin developed by Adam Shaw, which adds a beautiful AJAX-enabled calendar which can communicate with your blog.</p> 
							<p>If you find this calendar particularly useful and can spare a few bucks, please <a href="http://arshaw.com/fullcalendar/">donate something to his project</a>, most of the hard work here was done by him and he gives this out freely for everyone to use!</p>
						</div>
					</div>
					<div id="categorydiv" class="postbox ">
						<h3 class="hndle">Getting Help</h3>
						<div class="inside">
							<p>Before asking for help, check the readme files or the plugin pages for answers to common issues.</p>
							<p>If you're still stuck, try the <a href="http://wordpress.org/support/plugin/wp-fullcalendar/">community forums</a>.</p>
						</div>
					</div>
					<div id="categorydiv" class="postbox ">
						<h3 class="hndle">Translating</h3>
						<div class="inside">
							<p>If you'd like to translate this plugin, the language files are in the langs folder.</p>
							<p>Please email any translations to wp.plugins@netweblogic.com and we'll incorporate it into the plugin.</p>
						</div>
					</div>
				</div>
				<div id="post-body">
					<div id="post-body-content">
						<p>
							<?php echo sprintf(esc_html__('To use this plugin, simply use the %s shortcode in one of your posts or pages.', 'wp-fullcalendar'), '<code>[fullcalendar]</code>'); ?>
							<?php echo sprintf(esc_html__('You can also do this with PHP and this snippet : %s.', 'wp-fullcalendar'), '<code>echo WP_FullCalendar::calendar($args);</code>'); ?>
						</p>
						<form action="" class="wpfc-options" method="post">
							<?php do_action('wpfc_admin_before_options'); ?>
							<h2 style="margin-top:0px;"><?php esc_html__('Post Types', 'wp-fullcalendar'); ?></h2>
							<p><?php echo sprintf(esc_html__('By default, your calendar will show the types of posts based on settings below.', 'wp-fullcalendar'), ''); ?></p>
							<p>
								<?php echo sprintf(esc_html__('You can override these settings by choosing your post type in your shortode like this %s.', 'wp-fullcalendar'), '<code>[fullcalendar type="post"]</code>'); ?>
								<?php echo sprintf(esc_html__('You can override taxonomy search settings as well like this %s.', 'wp-fullcalendar'), '<code>[fullcalendar taxonomies="post_tag,category"]</code>'); ?>
								<?php esc_html_e('In both cases, the values you should use are in (parenteses) below.', 'wp-fullcalendar'); ?>
							</p>
							<p>
								<ul class="wpfc-post-types">
									<?php 
									$selected_taxonomies = get_option('wpfc_post_taxonomies');
									foreach ( get_post_types( apply_filters('wpfc_get_post_types_args', array('public'=>true )), 'names') as $post_type ) {
										$checked = get_option('wpfc_default_type') == $post_type ? 'checked':'';
										$post_data = get_post_type_object($post_type);
										echo "<li><label><input type='radio' class='wpfc-post-type' name='wpfc_default_type' value='".esc_attr($post_type)."' ".esc_attr($checked)." />&nbsp;&nbsp;".esc_html($post_data->labels->name)." (<em>".esc_html($post_type)."</em>)</label>";
										do_action('wpfc_admin_options_post_type_' . $post_type);
										$post_type_taxonomies = get_object_taxonomies($post_type);
										if ( count($post_type_taxonomies) > 0 ) {
											$display = empty($checked) ? 'style="display:none;"':'';
											echo "<div ".esc_attr($display).">";
											echo '<p>' . esc_html__('Choose which taxonomies you want to see listed as search options on the calendar.', 'wp-fullcalendar') . '</p>';
											echo '<ul>';
											foreach ( $post_type_taxonomies as $taxonomy_name ) {
												$taxonomy = get_taxonomy($taxonomy_name);
												$tax_checked = !empty($selected_taxonomies[$post_type][$taxonomy_name]) ? 'checked':'';
												echo "<li><label><input type='checkbox' name='".esc_attr("wpfc_post_taxonomies[$post_type][$taxonomy_name]")."' value='1' ".esc_attr($tax_checked)." />&nbsp;&nbsp;".esc_html($taxonomy->labels->name)." (<em>".esc_html($taxonomy_name)."</em>)</label></li>";
											}
											echo '</ul>';
											echo '</div>';
										}
										echo '</li>';
									}
									?>
								</ul>
							</p>
							<script type="text/javascript">
								jQuery(document).ready(function($){
									$('input.wpfc-post-type').change(function(){
										$('ul.wpfc-post-types div').hide();
										$('input[name=wpfc_default_type]:checked').parent().parent().find('div').show();
									});
								});
							</script>
							<?php do_action('wpfc_admin_after_cpt_options'); ?>
							<h2><?php esc_html_e('Calendar Options', 'wp-fullcalendar'); ?></h2>
							<table class='form-table'>
								<?php 
								$available_views = apply_filters('wpfc_available_views', array('month'=>'Month','basicWeek'=>'Week (basic)','basicDay'=>'Day (basic)','agendaWeek'=>'Week (agenda)','agendaDay'=>'Day (agenda)'));
								?>
								<tr>
									<th scope="row"><?php esc_html_e('Available Views', 'wp-fullcalendar'); ?></th>
									<td>
										<?php $wpfc_available_views = get_option('wpfc_available_views', array('month','basicWeek','basicDay')); ?>
										<?php foreach ( $available_views as $view_key => $view_value ) : ?>
										<input type="checkbox" name="wpfc_available_views[]" value="<?php echo esc_attr($view_key); ?>"
																											   <?php 
																												if ( in_array($view_key, $wpfc_available_views) ) {
																													echo 'checked="checked"'; } 
																												?>
										/> <?php echo esc_html($view_value); ?><br />
										<?php endforeach; ?>
										<em><?php esc_html_e('Users will be able to select from these views when viewing the calendar.'); ?></em>
									</td>
								</tr>
								<?php
								wpfc_options_select( __('Default View', 'wp-fullcalendar'), 'wpfc_defaultView', $available_views, __('Choose the default view to be displayed when the calendar is first shown.', 'wp-fullcalendar') );
								wpfc_options_input_text ( __( 'Time Format', 'wp-fullcalendar'), 'wpfc_timeFormat', sprintf(__('Set the format used for showing the times on the calendar, <a href="%s">see possible combinations</a>. Leave blank for no time display.', 'wp-fullcalendar'), 'http://momentjs.com/docs/#/displaying/format/'), 'h(:mm)a' );
								wpfc_options_input_text ( __( 'Events limit', 'wp-fullcalendar'), 'wpfc_limit', __('Enter the maximum number of events to show per day, which will then be preceded by a link to the calendar day page.', 'wp-fullcalendar') );
								wpfc_options_input_text ( __( 'View events link', 'wp-fullcalendar'), 'wpfc_limit_txt', __('When the limit of events is shown for one day, this text will be used for the link to the calendar day page.', 'wp-fullcalendar') );
								?>
							</table>
							<?php do_action('wpfc_admin_after_calendar_options'); ?>
							<h2><?php esc_html_e('jQuery UI Themeroller', 'wp-fullcalendar'); ?></h2>
							<p><?php echo sprintf(__( 'You can select from a set of pre-made CSS themes, which are taken from the <a href="%s">jQuery Theme Roller</a> gallery. If you roll your own theme, upload the CSS file and images folder to <code>wp-content/yourtheme/plugins/wp-fullcalendar/</code> and refresh this page, it should appear an option in the pull down menu below.', 'wp-fullcalendar'), 'http://jqueryui.com/themeroller/'); ?></p>
							<table class='form-table'>
								<?php
								//jQuery UI ships with pre-made themes, so here they are. This was coded for packaged CSS Themes 1.10.4 and 1.11.4
								$jquery_themes = array('black-tie','blitzer','cupertino','dark-hive','dot-luv','eggplant','excite-bike','flick','hot-sneaks','humanity','le-frog','mint-choc','overcast','pepper-grinder','redmond','smoothness','south-street','start','sunny','swanky-purse','trontastic','ui-darkness','ui-lightness','vader');
								$jquery_themes = apply_filters('wpfc_jquery_themes', $jquery_themes);
								//get custom theme CSS files
								$plugin_path = get_stylesheet_directory() . '/plugins/wp-fullcalendar/';
								foreach ( glob( $plugin_path . '*.css') as $css_file ) {
									$css_file = str_replace($plugin_path, '', $css_file);
									$css_custom_files[] = $css_file;
								}
								?>
								<tr class="form-field">
									<th scope="row" valign="top"><label for="product_package_unit_price"><?php esc_html_e( 'jQuery CSS Theme?', 'wp-fullcalendar'); ?></label></th>
									<td>
										<select name="wpfc_theme_css">
											<option value="0"><?php esc_html_e( 'No Theme', 'wp-fullcalendar'); ?></option>
											<optgroup label="<?php esc_html_e('Built-In', 'wp-fullcalendar'); ?>">
												<?php foreach ( $jquery_themes as $jquery_theme ) : ?>
												<option 
													<?php 
													if (get_option('wpfc_theme_css') == $jquery_theme) {
														echo 'selected="selected"';} 
													?>
												><?php echo esc_html($jquery_theme); ?></option>
												<?php endforeach; ?>
											</optgroup>
											<?php if ( !empty($css_custom_files) ) : ?>
											<optgroup label="<?php esc_html_e('Custom', 'wp-fullcalendar'); ?>">
												<?php foreach ( $css_custom_files as $css_custom_file ) : ?>
													<option 
													<?php 
													if (get_option('wpfc_theme_css') == $css_custom_file) {
														echo 'selected="selected"';} 
													?>
													><?php echo esc_html($css_custom_file); ?></option>
												<?php endforeach; ?>
											</optgroup>
											<?php endif; ?>
										</select>
										<i><?php esc_html_e( 'You can use the jQuery UI CSS framework to style the calendar, and choose from a set of themes below.', 'wp-fullcalendar'); ?></i>
									</td>
								</tr>
							</table>
							<?php do_action('wpfc_admin_after_themeroller_options'); ?>
							<h2 class="title"><?php esc_html_e('Tooltips', 'wp-fullcalendar'); ?></h2>
							<p><strong><em><?php sprintf(esc_html__('Since version 1.4 we have moved to using a different tooltip library called %s, if you prefer the old library you will need to downgrade to version 1.3.1 as qTips is not a maintained library and is not compatible with future versions of WordPress.', 'wp-fullcalendar'), '<a href="https://atomiks.github.io/tippyjs/">tippy.js</a>'); ?></em></strong></p>
							<p><?php sprintf(esc_html__( 'You can use tooltips to show excerpts of your events within a tooltip when hovering over a specific event on the calendar. You can control the content shown, positioning and style of the tool tips below.', 'wp-fullcalendar'), '<a href="https://github.com/atomiks/tippyjs">Tippy.js</a>'); ?></p>
							<table class='form-table'>
								<?php
								$tip_styles = array('light'=>'light', 'light-border'=>'light-border', 'material'=>'material', 'translucent'=>'transulcent');//get custom theme CSS files
								$custom_tip_styles = array();
								$plugin_path = get_stylesheet_directory() . '/plugins/wp-fullcalendar/tippy/';
								foreach ( glob( $plugin_path . '*.css') as $css_file ) {
									$css_file = str_replace(array($plugin_path, '.css'), '', $css_file);
									$custom_tip_styles[$css_file] = $css_file;
								}
								if ( !empty($custom_tip_styles ) ) {
									$tip_styles = array(
										__('Built-In', 'wp-fullcalendar') => $tip_styles,
										__('Custom', 'wp-fullcalendar') => $custom_tip_styles,
									);
								}
								wpfc_options_radio_binary ( __( 'Enable event tooltips?', 'wp-fullcalendar'), 'wpfc_qtips', '' );
								wpfc_options_select(__('Tooltip style', 'wp-fullcalendar'), 'wpfc_tippy_style', $tip_styles, sprintf(__('You can choose from one of these preset styles for your tooltip, or any custom CSS files in your theme folder %s.', 'wp-fullcalendar'), '<code>/plugins/wp-fullcalendar/tippy/</code>'));
								wpfc_options_select ( __( 'Tooltip bubble position', 'wp-fullcalendar'), 'wpfc_tippy_placement', $tippy_options, __( 'Choose where your tooltip will be situated relative to the event link which triggers the tooltip.', 'wp-fullcalendar') );
								?>
								<tr>
									<td><label><?php esc_html_e('Featured image size', 'wp-fullcalendar'); ?></label></td>
									<td>
										<?php esc_html_e('Width', 'wp-fullcalendar'); ?> : <input name="wpfc_qtips_image_w" type="text" style="width:40px;" value="<?php echo esc_attr(get_option('wpfc_qtips_image_w')); ?>" />
										<?php esc_html_e('Height', 'wp-fullcalendar'); ?> : <input name="wpfc_qtips_image_h" type="text" style="width:40px;" value="<?php echo esc_attr(get_option('wpfc_qtips_image_h')); ?>" />
									</td>
								</tr>
							</table>
							<?php do_action('wpfc_admin_after_tooltip_options'); ?>
							
							<h2><?php esc_html_e ( 'JS and CSS Files (Optimization)', 'wp-fullcalendar'); ?></h2>
							<table class="form-table">
								<?php
								wpfc_options_input_text( __( 'Load JS and CSS files on', 'dbem' ), 'wpfc_scripts_limit', __('Write the page IDs where you will display the FullCalendar on so CSS and JS files are only included on these pages. For multiple pages, use comma-seperated values e.g. 1,2,3. Leaving this blank will load our CSS and JS files on EVERY page, enter -1 for the home page.', 'wp-fullcalendar') );
								?>
							</table>
							<?php do_action('wpfc_admin_after_optimizations'); ?>
							
							<input type="hidden" name="_wpnonce" value="<?php echo esc_attr(wp_create_nonce('wpfc_options_save')); ?>" />
							<p class="submit"><input type="submit" value="<?php esc_html_e('Submit Changes', 'wp-fullcalendar'); ?>" class="button-primary"></p>
						</form>
					</div>
				</div>
			</div>
		</div>
		<?php
	}
	
	public static function sanitize_text_array( $value ){
		if( is_array($value) ){
			foreach( $value as $k => $v ){
				$value[$k] = static::sanitize_text_array($v);
			}
			return $value;
		}else{
			return sanitize_text_field($value);
		}
	}
}
//check for updates
if ( version_compare(WPFC_VERSION, get_option('wpfc_version', 0)) > 0 && current_user_can('activate_plugins') ) {
	include('wpfc-install.php');
}
//add admin action hook
add_action ( 'admin_menu', array('WPFC_Admin', 'menus') );


/*
 * Admin UI Helpers
*/
function wpfc_options_input_text( $title, $name, $description, $default = '') {
	?>
	<tr valign="top" id='<?php echo esc_attr($name); ?>_row'>
		<th scope="row"><?php echo esc_html($title); ?></th>
		<td>
			<input name="<?php echo esc_attr($name); ?>" type="text" id="<?php echo esc_attr($title); ?>" style="width: 95%" value="<?php echo esc_attr(get_option($name, $default), ENT_QUOTES); ?>" size="45" />
			<br/><em><?php echo wp_kses_post($description); ?></em>
		</td>
	</tr>
	<?php
}
function wpfc_options_input_password( $title, $name, $description) {
	?>
	<tr valign="top" id='<?php echo esc_attr($name); ?>_row'>
		<th scope="row"><?php echo esc_html($title); ?></th>
		<td>
			<input name="<?php echo esc_attr($name); ?>" type="password" id="<?php echo esc_attr($title); ?>" style="width: 95%" value="<?php echo esc_attr(get_option($name)); ?>" size="45" />
			<br/><em><?php echo wp_kses_post($description); ?></em>
		</td>
	</tr>
	<?php
}

function wpfc_options_textarea( $title, $name, $description) {
	?>
	<tr valign="top" id='<?php echo esc_attr($name); ?>_row'>
		<th scope="row"><?php echo esc_html($title); ?></th>
			<td>
				<textarea name="<?php echo esc_attr($name); ?>" id="<?php echo esc_attr($name); ?>" rows="6" cols="60"><?php echo esc_attr(get_option($name), ENT_QUOTES); ?></textarea>
				<br/><em><?php echo wp_kses_post($description); ?></em>
			</td>
		</tr>
	<?php
}

function wpfc_options_radio( $name, $options, $title = '') {
		$option = get_option($name);
	?>
		   <tr valign="top" id='<?php echo esc_attr($name); ?>_row'>
			<?php if ( !empty($title) ) : ?>
			   <th scope="row"><?php echo esc_html($title); ?></th>
			   <td>
			<?php else : ?>
			   <td colspan="2">
			<?php endif; ?>
				   <table>
				<?php foreach ($options as $value => $text) : ?>
					   <tr>
						   <td><input id="<?php echo esc_attr($name); ?>_<?php echo esc_attr($value); ?>" name="<?php echo esc_attr($name); ?>" type="radio" value="<?php echo esc_attr($value); ?>" 
													 <?php 
														if ($option == $value) {
															echo "checked='checked'";} 
														?>
							 /></td>
						   <td><?php echo esc_html($text); ?></td>
					   </tr>
				<?php endforeach; ?>
				</table>
			</td>
		   </tr>
	<?php
}

function wpfc_options_radio_binary( $title, $name, $description, $option_names = '') {
	if ( empty($option_names) ) {
		$option_names = array(0 => __('No', 'dbem'), 1 => __('Yes', 'dbem'));
	}
	if ( substr($name, 0, 7) == 'dbem_ms' ) {
		$list_events_page = get_site_option($name);
	} else {
		$list_events_page = get_option($name);
	}
	?>
	   <tr valign="top" id='<?php echo esc_attr($name); ?>_row'>
		   <th scope="row"><?php echo esc_html($title); ?></th>
		   <td>
			<?php echo esc_html($option_names[1]); ?> <input id="<?php echo esc_attr($name); ?>_yes" name="<?php echo esc_attr($name); ?>" type="radio" value="1"
					   <?php 
						if ($list_events_page) {
							echo "checked='checked'";} 
						?>
			 />&nbsp;&nbsp;&nbsp;
			<?php echo esc_html($option_names[0]); ?> <input  id="<?php echo esc_attr($name); ?>_no" name="<?php echo esc_attr($name); ?>" type="radio" value="0"
					   <?php 
						if (!$list_events_page) {
							echo "checked='checked'";} 
						?>
			 />
			<br/><em><?php echo wp_kses_post($description); ?></em>
		</td>
	   </tr>
	<?php
}

function wpfc_options_select( $title, $name, $list, $description, $default = '') {
	$option_value = get_option($name, $default);
	if ( $name == 'dbem_events_page' && !is_object(get_page($option_value)) ) {
		$option_value = 0; //Special value
	}
	?>
	   <tr valign="top" id='<?php echo esc_attr($name); ?>_row'>
		   <th scope="row"><?php echo esc_html($title); ?></th>
		   <td>
			<select name="<?php echo esc_attr($name); ?>" >
				<?php foreach ($list as $key => $value) : ?>
					<?php if ( is_array($value) ) : ?>
						<optgroup label="<?php echo esc_attr($key); ?>">
						<?php foreach ( $value as $k => $v ) : ?>
							<option value='<?php echo esc_attr($k); ?>' <?php echo ( "$k" == $option_value ) ? "selected='selected' " : ''; ?>>
								<?php echo esc_html($v); ?>
							</option>
						<?php endforeach; ?>
						</optgroup>
					<?php else : ?>
						<option value='<?php echo esc_attr($key); ?>' <?php echo ( "$key" == $option_value ) ? "selected='selected' " : ''; ?>>
							<?php echo esc_html($value); ?>
						</option>
					<?php endif; ?>
				<?php endforeach; ?>
			</select> <br/>
			<em><?php echo wp_kses_post($description); ?></em>
		</td>
	   </tr>
	<?php
}
