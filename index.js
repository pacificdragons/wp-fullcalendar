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
  lastUpdated = 0,
  monthVersions = {},
  canCreateEvents,
  canEditEvents,
  createEventNonce,
  updateEventNonce,
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
          <button type="submit" value="cancel" class="btn">Cancel</button>
          <button type="submit" value="confirm" class="btn btn-primary">Create Event</button>
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
          <button type="submit" value="cancel" class="btn">Cancel</button>
          <button type="submit" value="clone" class="btn btn-primary">Clone</button>
          <button type="submit" value="move" class="btn btn-primary">Move</button>
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
 * @param {string} newStartDate - The new start date (YYYY-MM-DD format)
 * @returns {Promise<Object>} Resolves with the AJAX response on success
 * @throws {Error} Throws if the update fails
 */
const updateEventDate = (eventId, newStartDate) => {
  const formData = new FormData();
  formData.append("action", "wpfc_update_event");
  formData.append("event_id", eventId);
  formData.append("nonce", updateEventNonce);
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

/* ==========================================================================
   Event-feed Cache (localStorage read-through, month-scoped)
   ==========================================================================
   Caches the event JSON per fetched range in localStorage so navigating the
   calendar doesn't re-hit admin-ajax every time. Invalidation is month-scoped:

     1. Per-month versions: the server (WPFC.monthVersions = { 'YYYY-MM': ts })
        bumps only the month(s) an edited event touches. A cached range records
        the max version of the months it overlaps at fetch time; on read it is
        dropped only if one of those months now has a newer version — so editing
        an August event doesn't evict September's cache.
     2. Global bust: WPFC.lastUpdated (the FC_CACHE option) is bumped only for
        changes we can't localise to a month (recurring events / bulk). A change
        wipes the whole cache on the next load.
     3. TTL backstop: entries older than MAX_AGE_MS are refetched regardless, so
        any missed invalidation self-heals.
     4. Same-session: after a front-end move/clone the affected month(s) are
        cleared explicitly before refetch, since the in-memory versions are stale
        until the page reloads.
   The cache is per-browser, so per-user event visibility stays correct.
   ========================================================================== */

/** @type {string} Prefix for cached event-feed entries (keyed by request URL). */
const CACHE_PREFIX = `${nameSpace}/evt/`;

/** @type {string} Key holding the lastUpdated value the global cache was primed with. */
const GLOBAL_KEY = `${nameSpace}/global`;

/** @type {number} Max age of a cached entry before it is refetched (24h). */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Lists the 'YYYY-MM' months a [start, end) date range overlaps. FullCalendar's
 * end is exclusive, so we walk up to (end - 1 day) to avoid pulling in a month
 * that only the boundary day touches.
 *
 * @param {string} startISO - Range start, 'YYYY-MM-DD'
 * @param {string} endISO - Range end (exclusive), 'YYYY-MM-DD'
 * @returns {string[]} Month keys, e.g. ['2026-07', '2026-08']
 */
const monthsInRange = (startISO, endISO) => {
  const months = [];
  const cursor = new Date(`${startISO}T00:00:00`);
  const last = new Date(`${endISO}T00:00:00`);
  last.setDate(last.getDate() - 1);
  cursor.setDate(1);
  while (cursor <= last) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

/**
 * The version stamp for a range: the newest per-month version among the months
 * it overlaps (0 if none have ever been edited).
 *
 * @param {string} startISO
 * @param {string} endISO
 * @returns {number}
 */
const rangeVersion = (startISO, endISO) =>
  monthsInRange(startISO, endISO).reduce(
    (max, month) => Math.max(max, Number(monthVersions[month] || 0)),
    0,
  );

/**
 * Removes cached entries whose range overlaps any of the given months. With no
 * argument, removes every cached entry.
 *
 * @param {Set<string>|null} months - Month keys to clear, or null for all
 */
const clearEventCache = (months = null) => {
  Object.keys(LS).forEach((key) => {
    if (key.indexOf(CACHE_PREFIX) !== 0) {
      return;
    }
    if (!months) {
      LS.removeItem(key);
      return;
    }
    try {
      const entry = JSON.parse(LS.getItem(key));
      const overlaps = monthsInRange(entry.s, entry.n).some((m) =>
        months.has(m),
      );
      if (overlaps) {
        LS.removeItem(key);
      }
    } catch (e) {
      LS.removeItem(key);
    }
  });
};

/**
 * Fetches the event feed for a range, reading through localStorage. Returns
 * parsed events from cache when still fresh, otherwise fetches and caches them.
 *
 * @param {string} url - The admin-ajax event-feed URL
 * @param {string} startISO - Range start, 'YYYY-MM-DD'
 * @param {string} endISO - Range end (exclusive), 'YYYY-MM-DD'
 * @returns {Promise<Object[]>} Resolves with the parsed event array
 */
const fetchEvents = (url, startISO, endISO) => {
  // Global bust for changes we can't localise to a month (recurring / bulk).
  if (String(LS.getItem(GLOBAL_KEY)) !== String(lastUpdated)) {
    clearEventCache();
    try {
      LS.setItem(GLOBAL_KEY, lastUpdated);
    } catch (e) {
      /* storage unavailable — fall through to a plain fetch */
    }
  }

  const cacheKey = `${CACHE_PREFIX}${url}`;
  const version = rangeVersion(startISO, endISO);
  const cached = LS.getItem(cacheKey);
  if (cached) {
    try {
      const entry = JSON.parse(cached);
      const fresh =
        entry.v === version && Date.now() - (entry.t || 0) < MAX_AGE_MS;
      if (fresh) {
        return Promise.resolve(JSON.parse(entry.e));
      }
    } catch (e) {
      /* corrupt entry — fall through to refetch */
    }
    LS.removeItem(cacheKey);
  }

  return fetch(url)
    .then((response) => response.text())
    .then((text) => {
      const events = JSON.parse(text);
      try {
        LS.setItem(
          cacheKey,
          JSON.stringify({ v: version, t: Date.now(), s: startISO, n: endISO, e: text }),
        );
      } catch (e) {
        /* quota exceeded / private mode — serve uncached, don't fail */
      }
      return events;
    });
};

/**
 * Clears the cache entries for the month(s) of the given event dates, so an
 * in-session move/clone shows immediately without waiting for a reload.
 *
 * @param {...string} dateISOs - One or more 'YYYY-MM-DD' dates
 */
const clearEventCacheForDates = (...dateISOs) => {
  const months = new Set(
    dateISOs.filter(Boolean).map((d) => d.substring(0, 7)),
  );
  clearEventCache(months);
};

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
      const startISO = formatDate(start);
      const endISO = formatDate(end);
      const url = getAjaxUrl({
        action: data.action,
        type: data.type,
        start: startISO,
        end: endISO,
      });
      fetchEvents(url, startISO, endISO)
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
     * Past events can only be cloned, not moved.
     * Events cannot be cloned to a past date.
     */
    eventDrop: (info) => {
      if (!canEditEvents || !info.event.extendedProps?.event_id) {
        info.revert();
        return;
      }

      // Check if original event and target date are in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventStart = new Date(info.oldEvent.start);
      eventStart.setHours(0, 0, 0, 0);
      const targetDate = new Date(info.event.start);
      targetDate.setHours(0, 0, 0, 0);
      const isPastEvent = eventStart < today;
      const isTargetInPast = targetDate < today;

      // If no valid action available, silently revert
      // Move: source must not be in past AND target must not be in past
      // Clone: target must not be in past
      const canMove = !isPastEvent && !isTargetInPast;
      const canClone = !isTargetInPast;
      if (!canMove && !canClone) {
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

      // Past events cannot be moved, only cloned
      const moveButton = document.querySelector(
        '#wpfc-move-event-dialog button[value="move"]',
      );
      moveButton.style.display = canMove ? "" : "none";

      // Cannot clone to a past date
      const cloneButton = document.querySelector(
        '#wpfc-move-event-dialog button[value="clone"]',
      );
      cloneButton.style.display = canClone ? "" : "none";

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
     * Double-clicking on past dates does nothing.
     */
    dateClick: (info) => {
      const now = Date.now();
      if (
        info.dateStr === lastClickDate &&
        now - lastClickTime < DOUBLE_CLICK_DELAY
      ) {
        // Double-click detected - show create dialog (only for future dates)
        if (canCreateEvents && createEventNonce) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const clickedDate = new Date(info.dateStr);
          clickedDate.setHours(0, 0, 0, 0);
          if (clickedDate < today) {
            return;
          }

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
      // Flag events the current user has an accepted booking for so the css can
      // render a green tick before the title (see .wpfc-booked in index.css).
      // is_booked is set server-side on the feed; applies to list, month & week.
      if (data.event.extendedProps?.is_booked) {
        data.el.classList.add("wpfc-booked");
      }
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

      // Capture the dates up-front, before any revert() can reset them.
      const oldDate = moveInfo
        ? moveInfo.oldEvent.startStr.substring(0, 10)
        : null;
      const newDate = moveInfo
        ? moveInfo.event.startStr.substring(0, 10)
        : null;

      if (moveDialog.returnValue === "move" && moveInfo) {
        updateEventDate(moveInfo.event.extendedProps.event_id, newDate)
          .then(() => {
            // A move affects both the source and destination months.
            clearEventCacheForDates(oldDate, newDate);
            calendar.refetchEvents();
          })
          .catch((error) => {
            moveInfo.revert();
            alert("Failed to reschedule event: " + error.message);
          });
      } else if (moveDialog.returnValue === "clone" && moveInfo) {
        // Revert the drag first (clone keeps original in place)
        moveInfo.revert();
        cloneEvent(moveInfo.event.extendedProps.event_id, newDate)
          .then(() => {
            // A clone only adds an event in the destination month.
            clearEventCacheForDates(newDate);
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
