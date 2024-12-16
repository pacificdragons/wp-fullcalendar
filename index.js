import { Calendar } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import timeGridPlugin from '@fullcalendar/timegrid'

const { ajaxurl, data, lastUpdated = 0, nameSpace = 'FC', page = 'default' } = window.WPFC
const LS = window.localStorage
Object.values = (obj) => Object.keys(obj).map(key => obj[key])
/**
 * clearLocalStorage
 * Destroys all LS caches based on the prefix
 * @param cachePrefix:String
 * @return null
 */
const clearLocalStorage = (cachePrefix) => {
  Object.keys(LS).forEach(key => {
    if (key.indexOf(cachePrefix) > -1) {
      LS.removeItem(key)
    }
  })
}

/**
 * saveEventDataLocally
 * Sets to localStorage the result of a data ajax query.
 * @param url:String
 * @param cacheName:String
 * @param _cacheTime:String
 * @returns {Promise<null>}
 */
const saveEventDataLocally = (url, cacheName, _cacheTime) => {
  return new Promise((resolve, reject) => {
    const cacheTime = Number(_cacheTime)
    const lastCacheTime = Number(LS.getItem(cacheName))

    if (lastCacheTime !== cacheTime) {
      clearLocalStorage(cacheName)
      LS.setItem(cacheName, cacheTime)
    }
    const eventData = LS.getItem(`${nameSpace}/${url}`)
    if (!eventData) {
      const request = new XMLHttpRequest()
      request.open('GET', url, true)
      request.onload = function () {
        if (request.status >= 200 && request.status < 400) {
          LS.setItem(`${nameSpace}/${url}`, request.responseText)
          resolve(request.responseText)
        } else {
          reject()
        }
      }
      request.onerror = function () {
        reject()
      }
      request.send()
    } else {
      resolve()
    }
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

/**
 * getAllLocallySavedEvents
 * iterates over LS events, removing duplicates
 * @param cb:Function
 * @returns cb
 */
const getAllLocallySavedEvents = (cb) => {
  const allEventsInLocalStorage = Object.keys(LS).reduce((acc, next) => {
    if (next.indexOf(`${nameSpace}/`) > -1) {
      let events = []
      try {
        events = JSON.parse(LS[next])
      } catch (error) {
        return acc
      } finally {
        [...events].forEach((event) => {
          acc[event.event_id] = event
        })
      }
    }
    return acc
  }, {})
  return cb(Object.values(allEventsInLocalStorage))
}

const hexToRgb = (hex) => {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

const calendarEl = document.getElementById('full-calendar')

// styling hook
calendarEl.classList.add(`fc-${page.toLowerCase()}`)

const formatDate = (date) => {
  let d = new Date(date)

  let month = '' + (d.getMonth() + 1)

  let day = '' + d.getDate()

  let year = d.getFullYear()

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

document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('full-calendar')

  const calendar = new Calendar(calendarEl, {
    height: 600,
    events ({ start, end }, successCallback, failureCallback) {
      saveEventDataLocally(getAjaxUrl({
        action: data.action,
        type: data.type,
        start: formatDate(start),
        end: formatDate(end)
      }),
      nameSpace,
      lastUpdated
      ).then(() => getAllLocallySavedEvents(successCallback)).catch(failureCallback)
    },
    viewDidMount: (arg) => {
      LS.setItem(`${nameSpace}_DEFAULT_VIEW`, arg.view.type)
    },
    headerToolbar: {
      center: 'title',
      left: 'dayGridMonth,timeGridWeek,listMonth',
      right: 'prev,next'
    },
    initialView: LS.getItem(`${nameSpace}_DEFAULT_VIEW`) !== null
      ? LS.getItem(`${nameSpace}_DEFAULT_VIEW`)
      : 'listMonth',
    nowIndicator: true,
    firstDay: 1,
    plugins: [ listPlugin, dayGridPlugin, timeGridPlugin ],
    showNonCurrentDates: true,
    themeSystem: 'bootstrap',
    visibleRange: {
      end: formatDate(now.setDate(now.getDate() + 28)),
      start: todaysDate
    },
    weekNumbers: true,
    eventDidMount: (data) => {
      if (data.view.type === 'listMonth') {
        return
      }
      if (data.backgroundColor) {
        let color = data.backgroundColor
        if (!data.isFuture) {
          // convert hex to RGB
          let rgb = hexToRgb(color)
          // convert RGB to RGBA and change opacity to 50%
          color = `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`
        }
        data.el.style.backgroundColor = color
      }
      if (data.textColor) {
        data.el.style.color = data.textColor
      }
      if (data.borderColor) {
        data.el.style.borderColor = data.borderColor
      }
    }
  })

  calendar.render()
})
