import { Calendar } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid'

const { ajaxurl, data, page = 'default', canCreateEvents, canEditEvents, createEventNonce } = window.WPFC

// Double-click detection for event creation
let lastClickTime = 0
let lastClickDate = null
const DOUBLE_CLICK_DELAY = 300 // ms
let pendingEventDate = null

// Drag-and-drop state for event rescheduling
let pendingMoveEvent = null

// Create confirmation dialog HTML
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
  `
  document.body.insertAdjacentHTML('beforeend', dialogHtml)
}

// Create move confirmation dialog HTML
const createMoveDialog = () => {
  const dialogHtml = `
    <dialog id="wpfc-move-event-dialog" style="border-radius: 8px; border: 1px solid #ccc; padding: 0; max-width: 360px; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;">
      <form method="dialog" style="padding: 1.5rem;">
        <h3 style="margin: 0 0 1rem; font-size: 1.1rem;">Reschedule Event</h3>
        <p style="margin: 0 0 0.5rem;">Move "<strong id="wpfc-move-event-title"></strong>"</p>
        <p style="margin: 0 0 1.5rem; color: #666;">
          From <strong id="wpfc-move-old-date"></strong><br>
          to <strong id="wpfc-move-new-date"></strong>?
        </p>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button type="submit" value="cancel" style="padding: 0.5rem 1rem; cursor: pointer;">Cancel</button>
          <button type="submit" value="confirm" style="padding: 0.5rem 1rem; background: #0073aa; color: white; border: none; border-radius: 4px; cursor: pointer;">Move Event</button>
        </div>
      </form>
    </dialog>
  `
  document.body.insertAdjacentHTML('beforeend', dialogHtml)
}

// Create event via AJAX
const createEvent = (date) => {
  const formData = new FormData()
  formData.append('action', 'wpfc_create_event')
  formData.append('nonce', createEventNonce)
  formData.append('date', date)

  fetch(ajaxurl, {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(result => {
      if (result.success && result.data.edit_url) {
        window.open(result.data.edit_url, '_blank')
      }
    })
}

// Update event date via AJAX (for drag-and-drop rescheduling)
const updateEventDate = (eventId, nonce, newStartDate) => {
  const formData = new FormData()
  formData.append('action', 'wpfc_update_event')
  formData.append('event_id', eventId)
  formData.append('nonce', nonce)
  formData.append('new_start_date', newStartDate)

  return fetch(ajaxurl, {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(result => {
      if (!result.success) {
        throw new Error(result.data?.message || 'Failed to update event')
      }
      return result
    })
}

/**
 * dataToKVP
 * Convert AjaxGetData to key value pairs
 * @param data:AjaxGetData
 * @returns {Array[]}
 */
const dataToKVP = (data) => Object.keys(data).map(key => `${key}=${encodeURIComponent(data[key])}`)

/**
 * getAjaxUrl
 * Form the ajax GET request URL to admin ajax endpoint
 * @param data
 * @returns {string}
 */
const getAjaxUrl = (data) => `${ajaxurl}?${dataToKVP(data).join('&')}`

const hexToRgb = (hex) => {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

const calendarEl = document.getElementById('full-calendar')

// styling hook
calendarEl.classList.add(`fc-${page.toLowerCase()}`)

const formatDate = (date) => {
  let d     = new Date(date),
      month = '' + (d.getMonth() + 1),
      day   = '' + d.getDate(),
      year  = d.getFullYear()

  if (month.length < 2) {
    month = '0' + month
  }

  if (day.length < 2) {
    day = '0' + day
  }

  return [year, month, day].join('-')
}

const now = new Date()
const todaysDate = formatDate(now)

document.addEventListener('DOMContentLoaded', function() {
  const calendarEl = document.getElementById('full-calendar')

  // Initialize confirmation dialog if user can create events
  if (canCreateEvents && createEventNonce) {
    createConfirmDialog()
    const dialog = document.getElementById('wpfc-create-event-dialog')
    dialog.addEventListener('close', function() {
      if (dialog.returnValue === 'confirm' && pendingEventDate) {
        createEvent(pendingEventDate)
      }
      pendingEventDate = null
    })
  }

  // Create move dialog element if user can edit events
  if (canEditEvents) {
    createMoveDialog()
  }

  const calendar = new Calendar(calendarEl, {
    events ({ start, end }, successCallback, failureCallback) {
      const url = getAjaxUrl({
        action: data.action,
        type: data.type,
        start: formatDate(start),
        end: formatDate(end),
      })
      fetch(url)
        .then(response => response.json())
        .then(successCallback)
        .catch(failureCallback)
    },
    headerToolbar: {
      center: 'title',
      left: 'dayGridMonth,timeGridWeek,listMonth',
      right: 'prev,next',
    },
    initialView: 'listMonth',
    nowIndicator: true,
    firstDay: 1,
    plugins: [ listPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin ],
    editable: !!canEditEvents,
    eventDurationEditable: false,
    eventDrop: (info) => {
      if (!canEditEvents || !info.event.extendedProps?.event_id) {
        info.revert()
        return
      }

      pendingMoveEvent = info

      const formatDateDisplay = (dateStr) => new Date(dateStr).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })

      document.getElementById('wpfc-move-event-title').textContent = info.event.title
      document.getElementById('wpfc-move-old-date').textContent = formatDateDisplay(info.oldEvent.startStr)
      document.getElementById('wpfc-move-new-date').textContent = formatDateDisplay(info.event.startStr)
      document.getElementById('wpfc-move-event-dialog').showModal()
    },
    dateClick: (info) => {
      const now = Date.now()
      if (info.dateStr === lastClickDate && (now - lastClickTime) < DOUBLE_CLICK_DELAY) {
        // Double-click detected
        if (canCreateEvents && createEventNonce) {
          pendingEventDate = info.dateStr
          const dateDisplay = new Date(info.dateStr).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
          document.getElementById('wpfc-dialog-date').textContent = dateDisplay
          document.getElementById('wpfc-create-event-dialog').showModal()
        }
      }
      lastClickTime = now
      lastClickDate = info.dateStr
    },
    showNonCurrentDates: true,
    themeSystem: 'bootstrap5',
    visibleRange:   {
      end: formatDate(now.setDate(now.getDate() + 28)),
      start: todaysDate,
    },
    weekNumbers: true,
    eventDidMount: (data) => {
      if(data.view.type === 'listMonth'){
        return;
      }
      if (data.backgroundColor) {
        let color = data.backgroundColor;
        if (!data.isFuture) {
          // convert hex to RGB
          let rgb = hexToRgb(color);
          // convert RGB to RGBA and change opacity to 50%
          color = `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`;
        }
        data.el.style.backgroundColor = color;
      }
      if (data.textColor) {
        data.el.style.color = data.textColor
      }
      if (data.borderColor) {
        data.el.style.borderColor = data.borderColor;
      }
    }
  });

  calendar.render();

  // Initialize move dialog handler after calendar is created (so we can refetch)
  if (canEditEvents) {
    const moveDialog = document.getElementById('wpfc-move-event-dialog')
    moveDialog.addEventListener('close', function() {
      const moveInfo = pendingMoveEvent
      pendingMoveEvent = null

      if (moveDialog.returnValue === 'confirm' && moveInfo) {
        updateEventDate(
          moveInfo.event.extendedProps.event_id,
          moveInfo.event.extendedProps.nonce,
          moveInfo.event.startStr.substring(0, 10)
        )
          .then(() => {
            calendar.refetchEvents()
          })
          .catch((error) => {
            moveInfo.revert()
            alert('Failed to reschedule event: ' + error.message)
          })
      } else if (moveInfo) {
        moveInfo.revert()
      }
    })
  }
});


