import { Calendar } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import timeGridPlugin from '@fullcalendar/timegrid'

const { ajaxurl, data, lastUpdated = 0, nameSpace = 'FC', page = 'default' } = window.WPFC
const LS = localStorage
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
          resolve()
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

const calendar = new Calendar(
  calendarEl,
  {
    datesRender ({ view }) {
      LS.setItem(`${nameSpace}_DEFAULT_VIEW`, view.type)
    },
    defaultView: LS.getItem(`${nameSpace}_DEFAULT_VIEW`) !== null ? LS.getItem(`${nameSpace}_DEFAULT_VIEW`) : 'listMonth',
    eventLimit: false,
    events ({ start, end }, successCallback, failureCallback) {
      const year = start.getFullYear()
      const month = start.getMonth()
      saveEventDataLocally(getAjaxUrl({
          action: data.action,
          type: data.type,
          start: formatDate(new Date(year, month + 1, 1)),
          end: formatDate(new Date(year, month + 2, 0)),
        }),
        nameSpace,
        lastUpdated
      ).then(() => getAllLocallySavedEvents(successCallback)).catch(failureCallback)

    },
    firstDay: 1,
    header: {
      left: 'dayGridMonth,timeGridWeek,listMonth',
      center: 'title',
      right: 'prev,next,today',
    },
    height: 'parent',
    loading (state) {
      calendarEl.classList[state ? 'add' : 'remove']('fc--loading')
    },
    plugins: [dayGridPlugin, listPlugin, timeGridPlugin],
    showNonCurrentDates: true,
    timeZone: 'local',
  })

calendar.render()

