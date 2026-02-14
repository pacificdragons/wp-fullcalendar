<?php
/*
Plugin Name: WP FullCalendar
Version: 1.6
Text Domain: wp-fullcalendar
Plugin URI: https://wordpress.org/extend/plugins/wp-fullcalendar/
Description: Uses the jQuery FullCalendar plugin to create a stunning calendar view of events, posts and eventually other CPTs. Integrates well with Events Manager
Author: Marcus Sykes
Author URI: http://msyk.es
*/

/*
Copyright (c) 2025, Marcus Sykes

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
*/

define('WPFC_VERSION', '1.6');
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

    // AJAX handler for creating events
    add_action('wp_ajax_wpfc_create_event', array('WP_FullCalendar', 'ajax_create_event'));
  }

  /**
   * AJAX handler to create a new event with a specific date
   */
  public static function ajax_create_event()
  {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'wpfc_create_event')) {
      wp_send_json_error(array('message' => 'Invalid security token'));
    }

    // Check capability
    if (!current_user_can('edit_events')) {
      wp_send_json_error(array('message' => 'Permission denied'));
    }

    // Validate date format (YYYY-MM-DD)
    $date = isset($_POST['date']) ? sanitize_text_field($_POST['date']) : '';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
      wp_send_json_error(array('message' => 'Invalid date format'));
    }

    // Create new event using Events Manager
    if (!class_exists('EM_Event')) {
      wp_send_json_error(array('message' => 'Events Manager not available'));
    }

    $event = new EM_Event();
    $event->event_name = __('New Event', 'wp-fullcalendar');
    $event->event_start_date = $date;
    $event->event_end_date = $date;
    $event->event_start_time = '09:00:00';
    $event->event_end_time = '17:00:00';
    $event->event_timezone = get_option('timezone_string', 'UTC');
    $event->post_content = '';
    $event->event_status = 0; // Draft status

    if ($event->save()) {
      $edit_url = admin_url('post.php?post=' . $event->post_id . '&action=edit');
      wp_send_json_success(array('edit_url' => $edit_url));
    } else {
      wp_send_json_error(array('message' => 'Failed to create event'));
    }
  }

  public static function enqueue_scripts()
  {
    $cb = '?v=' . WPFC_VERSION;
    wp_enqueue_script('wp-fullcalendar', plugins_url("dist/index.js{$cb}", __FILE__), [], WPFC_VERSION, true);
    wp_enqueue_style('wp-fullcalendar', plugins_url("dist/index.css{$cb}", __FILE__), [], WPFC_VERSION);
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
      var WPFC = <?php echo wp_json_encode(apply_filters('wpfc_fullcalendar_assignment', new stdClass())); ?>;
      WPFC.ajaxurl = <?php echo wp_json_encode(admin_url('admin-ajax.php', is_ssl() ? 'https' : 'http')); ?>;
      WPFC.data = { action: 'WP_FullCalendar', type: 'event' };
      <?php if (current_user_can('edit_events')): ?>
      WPFC.canCreateEvents = true;
      WPFC.createEventNonce = <?php echo wp_json_encode(wp_create_nonce('wpfc_create_event')); ?>;
      <?php endif; ?>
    </script>
    <?php
    do_action('wpfc_calendar_displayed', $args);
    return ob_get_clean();
  }
}

add_action('plugins_loaded', array('WP_FullCalendar', 'init'), 100);

//translations
load_plugin_textdomain('wp-fullcalendar', false, dirname(plugin_basename(__FILE__)) . '/includes/langs');
