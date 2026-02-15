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
    add_action('wp_ajax_wpfc_update_event', array('WP_FullCalendar', 'ajax_update_event'));
    add_action('wp_ajax_wpfc_clone_event', array('WP_FullCalendar', 'ajax_clone_event'));
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

  /**
   * AJAX handler to update an event's date (for drag-and-drop rescheduling)
   */
  public static function ajax_update_event()
  {
    // Verify nonce
    $event_id = isset($_POST['event_id']) ? absint($_POST['event_id']) : 0;
    $nonce = isset($_POST['nonce']) ? sanitize_text_field($_POST['nonce']) : '';

    if (!$event_id || !wp_verify_nonce($nonce, 'wpfc_update_event')) {
      wp_send_json_error(array('message' => 'Invalid security token'));
    }

    if (!current_user_can('edit_events')) {
      wp_send_json_error(array('message' => 'Permission denied'));
    }

    $new_start_date = isset($_POST['new_start_date']) ? sanitize_text_field($_POST['new_start_date']) : '';
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $new_start_date)) {
      wp_send_json_error(array('message' => 'Invalid date format'));
    }

    if (!function_exists('em_get_event')) {
      wp_send_json_error(array('message' => 'Events Manager not available'));
    }

    $event = em_get_event($event_id);
    if (empty($event->event_id)) {
      wp_send_json_error(array('message' => 'Event not found'));
    }

    // Calculate day offset and apply to both start and end dates
    $old_start = new DateTime($event->event_start_date);
    $new_start = new DateTime($new_start_date);
    $diff = $old_start->diff($new_start);

    $old_end = new DateTime($event->event_end_date);
    if ($diff->invert) {
      $old_end->sub(new DateInterval('P' . $diff->days . 'D'));
    } else {
      $old_end->add(new DateInterval('P' . $diff->days . 'D'));
    }

    $event->event_start_date = $new_start_date;
    $event->event_end_date = $old_end->format('Y-m-d');

    if ($event->save()) {
      wp_send_json_success(array('message' => 'Event rescheduled'));
    } else {
      wp_send_json_error(array('message' => 'Failed to save event'));
    }
  }

  /**
   * AJAX handler to clone an event to a new date
   */
  public static function ajax_clone_event()
  {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'wpfc_clone_event')) {
      wp_send_json_error(array('message' => 'Invalid security token'));
    }

    // Check capability
    if (!current_user_can('edit_events')) {
      wp_send_json_error(array('message' => 'Permission denied'));
    }

    $event_id = isset($_POST['event_id']) ? absint($_POST['event_id']) : 0;
    $new_start_date = isset($_POST['new_start_date']) ? sanitize_text_field($_POST['new_start_date']) : '';

    if (!$event_id) {
      wp_send_json_error(array('message' => 'Invalid event ID'));
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $new_start_date)) {
      wp_send_json_error(array('message' => 'Invalid date format'));
    }

    if (!class_exists('EM_Event')) {
      wp_send_json_error(array('message' => 'Events Manager not available'));
    }

    // Load source event
    $source_event = em_get_event($event_id);
    if (empty($source_event->event_id)) {
      wp_send_json_error(array('message' => 'Source event not found'));
    }

    // Use Events Manager's built-in duplicate method
    $new_event = $source_event->duplicate();
    if ($new_event === false) {
      wp_send_json_error(array('message' => 'Failed to clone event'));
    }

    // Calculate day offset and apply to the duplicated event's dates
    $old_start = new DateTime($source_event->event_start_date);
    $new_start = new DateTime($new_start_date);
    $diff = $old_start->diff($new_start);

    $old_end = new DateTime($new_event->event_end_date);
    if ($diff->invert) {
      $old_end->sub(new DateInterval('P' . $diff->days . 'D'));
    } else {
      $old_end->add(new DateInterval('P' . $diff->days . 'D'));
    }

    $new_event->event_start_date = $new_start_date;
    $new_event->event_end_date = $old_end->format('Y-m-d');
    $new_event->post_status = 'publish';
    $new_event->event_status = 1;

    if ($new_event->save()) {
      // Publish the cloned event (EM_Event->save() doesn't update post_status)
      wp_update_post(array(
        'ID' => $new_event->post_id,
        'post_status' => 'publish'
      ));

      wp_send_json_success(array(
        'message' => 'Event cloned',
        'event_id' => $new_event->event_id
      ));
    } else {
      wp_send_json_error(array('message' => 'Failed to update cloned event dates'));
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
      WPFC.canEditEvents = true;
      WPFC.createEventNonce = <?php echo wp_json_encode(wp_create_nonce('wpfc_create_event')); ?>;
      WPFC.updateEventNonce = <?php echo wp_json_encode(wp_create_nonce('wpfc_update_event')); ?>;
      WPFC.cloneEventNonce = <?php echo wp_json_encode(wp_create_nonce('wpfc_clone_event')); ?>;
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
