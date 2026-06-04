/**
 * A person object with a name and age.
 * @template T
 * @typedef {Object} PagedQueryResult
 * @property {!number} totalCount - total number of elements in the dataset
 * @property {!Array<T>} subset - current subset
*/

/**
 * Description of a study.
 * @typedef {Object} StudyDescription
 * @property {string} _key - key of the study
 * @property {!string} teamKey - key of the team that manages the study
 * @property {string} createdTS - ISO 8601 of when the study has been created
 * @property {string} updatedTS - ISO 8601 of when the study has been last updated
 * @property {string} publishedTS - ISO 8601 of when the study has been published
 * @property {boolean} invitational - if true the study can be accessed by invitation
 * @property {string} invitationCode - invitation code used by participants to join the study
 * @property {!Object} generalities - properties related to generalities
 * @property {!Object} inclusionCriteria - properties related to inclusion criteria
 * @property {!Array} tasks - tasks planned in this study
 * @property {!Object} consent - properties related to informed consent
 */

/**
 * Results of a task.
 * @typedef {Object} TaskResults
 * @property {!string} userKey - key of the user
 * @property {string} participantKey - key of the participant
 * @property {!string} studyKey - key of the study
 * @property {!number} taskId - id of the task
 * @property {string} taskType - type fo task
 * @property {string} createdTS - ISO 8601 of when the result has been created
 * @property {?boolean} discarded - if true the task does not contain data
 * @property {object} phone - information about the phone
 * @property {object} summary - summary data of the task
 * @property {object} data - data related to the task
 * @property {Array<string>} attachments - filnames containing additional data
 */

/**
 * Indicators produced by a task.
 * @typedef {Object} TaskResultIndicators
 * @property {!string} userKey - key of the user
 * @property {string} participantKey - key of the participant
 * @property {!string} studyKey - key of the study
 * @property {!string} producer - name of the producer of the indicator
 * @property {!string} createdTS - ISO 8601 of when the result has been created
 * @property {string} updatedTS - ISO 8601 of when the result has been updated
 * @property {!string} indicatorsDate - ISO 8601 of when the result refers to
 * @property {!Array<number>} taskIds - ids of the tasks that produced this indicator
 * @property {!Array<string>} taskResultsKeys - keys of the task results that produced this indicator
 * @property {object} indicators - object containing indicators, typically a key-value pair where the key is the name of the indicator and the value is a numerical value
 */

/**
 * A clinical note written by a researcher about a participant.
 * @typedef {Object} Note
 * @property {string} _key - key of the note
 * @property {!string} studyKey - key of the study this note belongs to
 * @property {!string} participantUserKey - user key of the participant this note is about
 * @property {string} authorUserKey - user key of the researcher that wrote the note
 * @property {string} authorEmail - email of the researcher that wrote the note, denormalised for display
 * @property {!string} text - textual content of the note
 * @property {string} createdTS - ISO 8601 of when the note has been created
 * @property {string} updatedTS - ISO 8601 of when the note has been last updated
 */

/**
 * A participant object.
 * @typedef {Object} Participant
 * @property {!string} userKey - key of the user
 * @property {string} createdTS - ISO 8601 of when the participant has been created
 * @property {string} updatedTS - ISO 8601 of when the participant has been updated
 * @property {string} name - name of the participant
 * @property {string} surname - surname of the participant
 * @property {string} sex - can be 'male', 'female', 'other'
 * @property {string} dateOfBirth - ISO 8601 date of birth (yyyy-mm-dd)
 * @property {string} country - country of residence, ISO 2 letters standard
 * @property {string} language - preferred language, ISO 2 letters
 * @property {number} height - height in cm
 * @property {number} weight - weight in kg
 * @property {array} diseases - list of current long-term diseases / conditions
 * @property {array} medications - list of current long-term medications
 * @property {boolean} studiesSuggestions - true if the participants wants to be suggested studies
 * @property {array} studies - list of studies that were accepted or rejected
 */


/**
 * Location variables.
 * @typedef {Object} Location
 * @property {string} postcode - postcode of the place
 * @property {string} place - name of the place, such as city
 * @property {string} country - name of the country, such as England
 */

/**
 * Weather variables.
 * @typedef {Object} Weather
 * @property {string} location - name of the location, such as the city
 * @property {string} description - description of the weather, such as "clear sky"
 * @property {string} icon - url of an icon representing the weather
 * @property {number} temperature - temperature in Celsius degrees
 * @property {number} temperatureFeels - temperature, as felt, in Celsius degrees
 * @property {number} temperatureMin - minimum temperature, in Celsius degrees
 * @property {number} temperatureMax - maximum temperature, in Celsius degrees
 * @property {number} pressure - air pressure in Pascal
 * @property {number} humidity - air humidity in %
 * @property {string} sunrise - time of sunrise, as ISO 8601 string
 * @property {string} sunset - time of sunrise, as ISO 8601 string
 * @property {number} clouds - presence of clouds
 * @property {Object} wind - properties of wind
 * @property {number} wind.speed - wind speed in m/s
 * @property {number} wind.deg - wind orientation in degrees
 * @property {number} wind.gust - wind gust
 */

/**
 * Pollution variables.
 * @typedef {Object} Pollution
 * @property {number} aqi - Air Quality Index
 * @property {object} components - pollutants
 * @property {number} components.co - concentration of CO
 * @property {number} components.no - concentration of NO
 * @property {number} components.no2 - concentration of NO2
 * @property {number} components.o3 - concentration of O3
 * @property {number} components.so2 - concentration of SO2
 * @property {number} components.pm2_5 - concentration of PM2.5
 * @property {number} components.pm10 - concentration of PM10
 * @property {number} components.nh3 - concentration of NH3
 */

/**
 * Allergens variables.
 * @typedef {Object} Allergens
 * @property {object} pollen - pollen info
 * @property {string} pollen.updatedAt - when info was updated last time, as ISO 8601 string
 * @property {object} pollen.Count - pollen measurement
 * @property {object} pollen.Risk - pollen risk by type
 * @property {object} pollen.Species - pollen by species
 */


/**
 * Environment variables.
 * @typedef {Object} Environment
 * @property {!Weather} weather - current weather
 * @property {!Location} location - location administrative details
 * @property {!Pollution} pollution - pollution conditions
 * @property {!Allergens} allergens - allergens conditions
 * @property
 */



/**
 * jStyle Sleep data.
 * @typedef {Object} JStyleSleep
 * @property {!string} date - start date of the sleep data, as ISO 8601 string
 * @property {number} sleepQualityDurationMins - sleep quality duration in minutes
 * @property {Array<number>} sleepQuality - sleep quality data, array of numbers
 */

/**
 * jStyle data.
 * @typedef {Object} JStyleData
 * @property {object} device - device information
 * @property {Array<object>} activity - physical activity data
 * @property {Array<object>} hr - heart rate data
 * @property {Array<object>} hrv - heart rate variability data
 * @property {Array<object>} temperature - temperature data
 * @property {Array<object>} spo2 - blood oxygen saturation data
 * @property {Array<JStyleSleep>} sleep - sleep data
 */

export const Types = {}
