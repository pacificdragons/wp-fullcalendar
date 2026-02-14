/**
 * WP FullCalendar
 *
 * A WordPress calendar plugin using FullCalendar library.
 * Provides event display, creation (double-click), and drag-and-drop rescheduling.
 *
 * @requires @fullcalendar/core
 * @requires @fullcalendar/daygrid
 * @requires @fullcalendar/interaction
 * @requires @fullcalendar/list
 * @requires @fullcalendar/timegrid
 */

import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";

/**
 * Global configuration from WordPress
 * @type {Object}
 */
const {
  ajaxurl,
  data,
  page = "default",
  nameSpace = "WPFC",
  canCreateEvents,
  canEditEvents,
  createEventNonce,
  cloneEventNonce,
} = window.WPFC;

/** @type {Storage} Reference to localStorage for view preference persistence */
const LS = localStorage;

/* ==========================================================================
   State Variables
   ========================================================================== */

/** @type {number} Timestamp of last click for double-click detection */
let lastClickTime = 0;

/** @type {string|null} Date string of last clicked date */
let lastClickDate = null;

/** @type {number} Maximum ms between clicks to count as double-click */
const DOUBLE_CLICK_DELAY = 300;

/** @type {string|null} Date pending event creation confirmation */
let pendingEventDate = null;

/** @type {Object|null} FullCalendar event info pending move confirmation */
let pendingMoveEvent = null;

/* ==========================================================================
   Dialog Functions
   ========================================================================== */

/**
 * Creates and appends the event creation confirmation dialog to the DOM.
 * Dialog is shown when user double-clicks a date on the calendar.
 */
const createConfirmDialog = () => {
  const dialogHtml = `
    <dialog id="wpfc-create-event-dialog" style="border-radius: 8px; border: 1px solid #ccc; padding: 0; max-width: 320px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;">
      <form method="dialog" style="padding: 1.5rem;">
        <h3 style="margin: 0 0 1rem; font-size: 1.1rem;">Create Event</h3>
        <p style="margin: 0 0 1.5rem;">Create a new event on <strong id="wpfc-dialog-date"></strong>?</p>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button type="submit" value="cancel" style="padding: 0.5rem 1rem; cursor: pointer;">Cancel</button>
          <button type="submit" value="confirm" style="padding: 0.5rem 1rem; background: #0073aa; color: white; border: none; border-radius: 4px; cursor: pointer;">Create Event</button>
        </div>
      </form>
    </dialog>
  `;
  document.body.insertAdjacentHTML("beforeend", dialogHtml);
};

/**
 * Creates and appends the event move confirmation dialog to the DOM.
 * Dialog is shown when user drags an event to a new date.
 */
const createMoveDialog = () => {
  const dialogHtml = `
    <dialog id="wpfc-move-event-dialog" style="border-radius: 8px; border: 1px solid #ccc; padding: 0; max-width: 360px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;">
      <form method="dialog" style="padding: 1.5rem;">
        <h3 style="margin: 0 0 1rem; font-size: 1.1rem;">Reschedule Event</h3>
        <p style="margin: 0 0 0.5rem;">"<strong id="wpfc-move-event-title"></strong>"</p>
        <p style="margin: 0 0 1.5rem; color: #666;">
          From <strong id="wpfc-move-old-date"></strong><br>
          to <strong id="wpfc-move-new-date"></strong>
        </p>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button type="submit" value="cancel" style="padding: 0.5rem 1rem; cursor: pointer;">Cancel</button>
          <button type="submit" value="clone" style="padding: 0.5rem 1rem; background: #2271b1; color: white; border: none; border-radius: 4px; cursor: pointer;">Clone</button>
          <button type="submit" value="move" style="padding: 0.5rem 1rem; background: #0073aa; color: white; border: none; border-radius: 4px; cursor: pointer;">Move</button>
        </div>
      </form>
    </dialog>
  `;
  document.body.insertAdjacentHTML("beforeend", dialogHtml);
};

/* ==========================================================================
   AJAX Functions
   ========================================================================== */

/**
 * Creates a new event via WordPress AJAX.
 * On success, opens the event edit page in a new tab.
 *
 * @param {string} date - The date for the new event (YYYY-MM-DD format)
 */
const createEvent = (date) => {
  const formData = new FormData();
  formData.append("action", "wpfc_create_event");
  formData.append("nonce", createEventNonce);
  formData.append("date", date);

  fetch(ajaxurl, {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success && result.data.edit_url) {
        window.open(result.data.edit_url, "_blank");
      }
    });
};

/**
 * Updates an event's date via WordPress AJAX (for drag-and-drop rescheduling).
 * The backend calculates the day offset and applies it to both start and end dates.
 *
 * @param {number} eventId - The event ID to update
 * @param {string} nonce - Security nonce for this specific event
 * @param {string} newStartDate - The new start date (YYYY-MM-DD format)
 * @returns {Promise<Object>} Resolves with the AJAX response on success
 * @throws {Error} Throws if the update fails
 */
const updateEventDate = (eventId, nonce, newStartDate) => {
  const formData = new FormData();
  formData.append("action", "wpfc_update_event");
  formData.append("event_id", eventId);
  formData.append("nonce", nonce);
  formData.append("new_start_date", newStartDate);

  return fetch(ajaxurl, {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((result) => {
      if (!result.success) {
        throw new Error(result.data?.message || "Failed to update event");
      }
      return result;
    });
};

/**
 * Clones an event to a new date via WordPress AJAX.
 * Creates a copy of the source event at the specified target date.
 *
 * @param {number} eventId - The source event ID to clone
 * @param {string} newStartDate - The new start date (YYYY-MM-DD format)
 * @returns {Promise<Object>} Resolves with the AJAX response on success
 * @throws {Error} Throws if the clone fails
 */
const cloneEvent = (eventId, newStartDate) => {
  const formData = new FormData();
  formData.append("action", "wpfc_clone_event");
  formData.append("event_id", eventId);
  formData.append("nonce", cloneEventNonce);
  formData.append("new_start_date", newStartDate);

  return fetch(ajaxurl, {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((result) => {
      if (!result.success) {
        throw new Error(result.data?.message || "Failed to clone event");
      }
      return result;
    });
};

/* ==========================================================================
   Utility Functions
   ========================================================================== */

/**
 * Converts an object to URL query parameter key-value pairs.
 *
 * @param {Object} data - Object with key-value pairs to convert
 * @returns {string[]} Array of "key=value" strings (URL encoded)
 */
const dataToKVP = (data) =>
  Object.keys(data).map((key) => `${key}=${encodeURIComponent(data[key])}`);

/**
 * Builds a complete AJAX URL with query parameters.
 *
 * @param {Object} data - Query parameters to append
 * @returns {string} Complete URL with query string
 */
const getAjaxUrl = (data) => `${ajaxurl}?${dataToKVP(data).join("&")}`;

/**
 * Converts a hex color string to RGB object.
 *
 * @param {string} hex - Hex color (e.g., "#ff0000" or "ff0000")
 * @returns {Object|null} Object with r, g, b properties, or null if invalid
 */
const hexToRgb = (hex) => {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Formats a Date object as YYYY-MM-DD string.
 *
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  let d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) {
    month = "0" + month;
  }

  if (day.length < 2) {
    day = "0" + day;
  }

  return [year, month, day].join("-");
};

/* ==========================================================================
   Calendar Initialization
   ========================================================================== */

const calendarEl = document.getElementById("full-calendar");

// Add page-specific CSS class for styling hooks
calendarEl.classList.add(`fc-${page.toLowerCase()}`);

const now = new Date();
const todaysDate = formatDate(now);

document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("full-calendar");

  // Initialize event creation dialog (requires edit_events capability)
  if (canCreateEvents && createEventNonce) {
    createConfirmDialog();
    const dialog = document.getElementById("wpfc-create-event-dialog");
    dialog.addEventListener("close", function () {
      if (dialog.returnValue === "confirm" && pendingEventDate) {
        createEvent(pendingEventDate);
      }
      pendingEventDate = null;
    });
  }

  // Initialize event move dialog (requires edit_events capability)
  if (canEditEvents) {
    createMoveDialog();
  }

  /**
   * FullCalendar instance configuration
   */
  const calendar = new Calendar(calendarEl, {
    /**
     * Fetches events from WordPress via AJAX
     */
    events({ start, end }, successCallback, failureCallback) {
      const url = getAjaxUrl({
        action: data.action,
        type: data.type,
        start: formatDate(start),
        end: formatDate(end),
      });
      fetch(url)
        .then((response) => response.json())
        .then(successCallback)
        .catch(failureCallback);
    },

    headerToolbar: {
      center: "title",
      left: "dayGridMonth,timeGridWeek,listMonth",
      right: "prev,next",
    },

    initialView:
      LS.getItem(`${nameSpace}_DEFAULT_VIEW`) !== null
        ? LS.getItem(`${nameSpace}_DEFAULT_VIEW`)
        : "listMonth",

    /**
     * Saves the user's view preference to localStorage when changed.
     */
    datesSet: (info) => {
      LS.setItem(`${nameSpace}_DEFAULT_VIEW`, info.view.type);
    },
    nowIndicator: true,
    firstDay: 1,
    plugins: [listPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin],

    // Drag-and-drop settings
    editable: !!canEditEvents,
    eventDurationEditable: false,

    /**
     * Handles event drag-and-drop to reschedule.
     * Shows confirmation dialog before saving.
     */
    eventDrop: (info) => {
      if (!canEditEvents || !info.event.extendedProps?.event_id) {
        info.revert();
        return;
      }

      pendingMoveEvent = info;

      const formatDateDisplay = (dateStr) =>
        new Date(dateStr).toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

      document.getElementById("wpfc-move-event-title").textContent =
        info.event.title;
      document.getElementById("wpfc-move-old-date").textContent =
        formatDateDisplay(info.oldEvent.startStr);
      document.getElementById("wpfc-move-new-date").textContent =
        formatDateDisplay(info.event.startStr);
      document.getElementById("wpfc-move-event-dialog").showModal();
    },

    /**
     * Handles date clicks for double-click event creation.
     */
    dateClick: (info) => {
      const now = Date.now();
      if (
        info.dateStr === lastClickDate &&
        now - lastClickTime < DOUBLE_CLICK_DELAY
      ) {
        // Double-click detected - show create dialog
        if (canCreateEvents && createEventNonce) {
          pendingEventDate = info.dateStr;
          const dateDisplay = new Date(info.dateStr).toLocaleDateString(
            undefined,
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          );
          document.getElementById("wpfc-dialog-date").textContent = dateDisplay;
          document.getElementById("wpfc-create-event-dialog").showModal();
        }
      }
      lastClickTime = now;
      lastClickDate = info.dateStr;
    },

    showNonCurrentDates: true,
    themeSystem: "bootstrap5",

    visibleRange: {
      end: formatDate(now.setDate(now.getDate() + 28)),
      start: todaysDate,
    },

    weekNumbers: true,

    /**
     * Applies custom styling to events after they're rendered.
     * Past events are shown with 50% opacity.
     */
    eventDidMount: (data) => {
      if (data.view.type === "listMonth") {
        return;
      }
      if (data.backgroundColor) {
        let color = data.backgroundColor;
        if (!data.isFuture) {
          // Convert hex to RGBA with 50% opacity for past events
          let rgb = hexToRgb(color);
          color = `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`;
        }
        data.el.style.backgroundColor = color;
      }
      if (data.textColor) {
        data.el.style.color = data.textColor;
      }
      if (data.borderColor) {
        data.el.style.borderColor = data.borderColor;
      }
    },
  });

  calendar.render();

  // Set up move dialog close handler (after calendar created so we can refetch)
  if (canEditEvents) {
    const moveDialog = document.getElementById("wpfc-move-event-dialog");
    moveDialog.addEventListener("close", function () {
      // Capture pending event before clearing (async operation follows)
      const moveInfo = pendingMoveEvent;
      pendingMoveEvent = null;

      if (moveDialog.returnValue === "move" && moveInfo) {
        updateEventDate(
          moveInfo.event.extendedProps.event_id,
          moveInfo.event.extendedProps.nonce,
          moveInfo.event.startStr.substring(0, 10),
        )
          .then(() => {
            calendar.refetchEvents();
          })
          .catch((error) => {
            moveInfo.revert();
            alert("Failed to reschedule event: " + error.message);
          });
      } else if (moveDialog.returnValue === "clone" && moveInfo) {
        // Revert the drag first (clone keeps original in place)
        moveInfo.revert();
        cloneEvent(
          moveInfo.event.extendedProps.event_id,
          moveInfo.event.startStr.substring(0, 10),
        )
          .then(() => {
            calendar.refetchEvents();
          })
          .catch((error) => {
            alert("Failed to clone event: " + error.message);
          });
      } else if (moveInfo) {
        moveInfo.revert();
      }
    });
  }
});
