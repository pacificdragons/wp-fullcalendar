<?php
/*
Plugin Name: WP FullCalendar
Version: 1.2
Plugin URI: http://wordpress.org/extend/plugins/wp-fullcalendar/
Description: Uses the jQuery FullCalendar plugin to create a stunning calendar view of events, posts and eventually other CPTs. Integrates well with Events Manager
Author: Marcus Sykes
Author URI: http://msyk.es
*/

/*
Copyright (c) 2016, Marcus Sykes

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
*/

define('WPFC_VERSION', '1.2');
define('WPFC_UI_VERSION', '1.11');

class WP_FullCalendar
{
  static $args = array();

  public static function init()
  {
    //Scripts
    if (!is_admin()) { //show only in public area
      add_action('wp_enqueue_scripts', array('WP_FullCalendar', 'enqueue_scripts'));
      //shortcodes
      add_shortcode('fullcalendar', array('WP_FullCalendar', 'calendar'));
    }
    self::$args['type'] = get_option('wpfc_default_type', 'event');
  }

  public static function enqueue_scripts()
  {
    wp_enqueue_script('wp-fullcalendar', plugins_url('dist/index.js?v=1', __FILE__), [], WPFC_VERSION, true);
    wp_enqueue_style('wp-fullcalendar', plugins_url('dist/index.css', __FILE__), [], WPFC_VERSION);
  }

  public static function localize_script()
  {
    $js_vars = array();
    $js_vars['ajaxurl'] = admin_url('admin-ajax.php', is_ssl() ? 'https' : 'http');
    wp_localize_script('wp-fullcalendar', 'WPFC', apply_filters('wpfc_js_vars', $js_vars));
  }

  /**
   * Returns the calendar HTML setup and primes the js to load at wp_footer
   * @param array $args
   * @return string
   */
  public static function calendar($args = array())
  {
    if (is_array($args)) self::$args = array_merge(self::$args, $args);
    self::$args = apply_filters('wpfc_fullcalendar_args', self::$args);
    ob_start();
    ?>
    <div id="full-calendar"></div>
    <script type="text/javascript">
      var WPFC = <?php echo apply_filters('wpfc_fullcalendar_assignment', '{}')?>;
      WPFC.ajaxurl = '<?php echo admin_url('admin-ajax.php', is_ssl() ? 'https' : 'http') ?>'
      WPFC.data = {  action: 'WP_FullCalendar', 'type' : 'event' }
    </script>
    <?php
    do_action('wpfc_calendar_displayed', $args);
    return ob_get_clean();
  }
}

add_action('plugins_loaded', array('WP_FullCalendar', 'init'), 100);

//translations
load_plugin_textdomain('wp-fullcalendar', false, dirname(plugin_basename(__FILE__)) . '/includes/langs');
