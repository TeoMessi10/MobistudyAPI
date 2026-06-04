/**
 * This provides the data access for the clinical notes that researchers
 * write about participants. Notes are bound to a study and a participant,
 * so that all researchers involved in a study can see them.
 */
import * as Types from '../../models/jsdocs.js'

import utils from './utils.mjs'
import { applogger } from '../services/logger.mjs'

const COLLECTION_NAME = 'notes'

let collection, db

/**
 * Initializes the database by creating the needed collection.
 */
const init = async function (DB) {
  db = DB
  collection = await utils.getCollection(db, COLLECTION_NAME)
  collection.ensureIndex({ type: 'persistent', fields: ['studyKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['participantUserKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['authorUserKey'] })
  collection.ensureIndex({ type: 'persistent', fields: ['createdTS'] })
}

const DAL = {
  /**
   * Gets the transaction used for this data type
   * @returns {string}
   */
  notesTransaction () {
    return COLLECTION_NAME
  },

  /**
   * Gets the notes about a participant, optionally filtered by study.
   * @param {!string} participantUserKey - user key of the participant the notes are about
   * @param {?string} studyKey - optional, study key
   * @param {?number} offset - optional, starting from result N, used for paging
   * @param {?number} count - optional, number of results to be returned, used for paging
   * @param {?Function} dataCallback - optional, callback used when receiving data one by one (except when using pagination)
   * @returns {Promise<Array<Types.Note> | Types.PagedQueryResult<Types.Note> | null>} a promise that passes the data as an array, or empty if dataCallback is specified
   */
  async getNotes (participantUserKey, studyKey, offset, count, dataCallback) {
    const hasPaging = typeof (offset) !== 'undefined' && offset != null && typeof (count) !== 'undefined' && count != null

    let bindings = {}
    let queryOptions = {}

    let query = `FOR data IN ${COLLECTION_NAME}`
    if (studyKey) {
      bindings.studyKey = studyKey
      query += `
      FILTER data.studyKey == @studyKey
      `
    }
    if (participantUserKey) {
      bindings.participantUserKey = participantUserKey
      query += `
      FILTER data.participantUserKey == @participantUserKey
      `
    }

    query += `
    SORT data.createdTS DESC`

    if (hasPaging) {
      query += `
      LIMIT @offset, @count`
      bindings.offset = parseInt(offset)
      bindings.count = parseInt(count)
      queryOptions.fullCount = true
    }

    query += `
    RETURN data`

    applogger.trace(bindings, 'Querying "' + query + '"')
    const cursor = await db.query(query, bindings, queryOptions)
    if (dataCallback) {
      while (cursor.hasNext) {
        const a = await cursor.next()
        dataCallback(a)
      }
    } else {
      if (hasPaging) {
        return {
          totalCount: cursor.extra.stats.fullCount,
          subset: await cursor.all()
        }
      } else {
        return cursor.all()
      }
    }
  },

  /**
   * Gets a single note by its key
   * @param {string} _key - key of the note
   * @returns {Promise<Types.Note>} a promise that passes the note, null if not found
   */
  async getOneNote (_key) {
    const note = await collection.document(_key, { graceful: true })
    return note
  },

  /**
   * Creates a new note
   * @param {Types.Note} newNote - the new note
   * @param {?object} trx - optional, for transactions
   * @returns {Promise<Types.Note>} a promise that passes the new note, with added _key
   */
  async createNote (newNote, trx) {
    let meta
    if (trx) {
      meta = await trx.step(() => collection.save(newNote))
    } else {
      meta = await collection.save(newNote)
    }
    applogger.trace(newNote, 'Creating note "' + meta._key + '"')

    newNote._key = meta._key
    return newNote
  },

  /**
   * Replaces a note, we assume the _key is the correct one
   * @param {string} _key - key of the note
   * @param {Types.Note} newNote - the new note
   * @param {?object} trx - optional, for transactions
   * @returns {Promise<Types.Note>} a promise that passes the new note
   */
  async replaceNote (_key, newNote, trx) {
    let meta
    if (trx) {
      meta = await trx.step(() => collection.replace(_key, newNote))
    } else {
      meta = await collection.replace(_key, newNote)
    }
    applogger.trace(newNote, 'Replacing note "' + _key + '"')

    newNote._key = meta._key
    return newNote
  },

  /**
   * Deletes a note by key
   * @param {string} _key - key of the note
   * @param {?object} trx - optional, transaction
   * @returns {Promise<boolean>}
   */
  async deleteNote (_key, trx) {
    if (trx) {
      await trx.step(() => collection.remove(_key))
    } else {
      await collection.remove(_key)
    }
    applogger.trace('Deleting note "' + _key + '"')
    return true
  },

  /**
   * Deletes all notes based on study
   * @param {string} studyKey
   * @param {?object} trx - optional, transaction
   */
  async deleteNotesByStudy (studyKey, trx) {
    applogger.trace('Deleting all notes by study "' + studyKey + '"')
    const query = 'FOR data IN ' + COLLECTION_NAME + ' FILTER data.studyKey == @studyKey REMOVE data._key IN ' + COLLECTION_NAME
    const bindings = { studyKey: studyKey }
    applogger.trace(bindings, 'Querying "' + query + '"')

    if (trx) {
      await trx.step(() => db.query(query, bindings))
    } else {
      await db.query(query, bindings)
    }
  },

  /**
   * Deletes all notes about a participant
   * @param {string} participantUserKey - user key of the participant the notes are about
   * @param {?object} trx - optional, transaction
   */
  async deleteNotesByParticipant (participantUserKey, trx) {
    applogger.trace('Deleting all notes by participant "' + participantUserKey + '"')

    const query = 'FOR data IN ' + COLLECTION_NAME + ' FILTER data.participantUserKey == @participantUserKey REMOVE data._key IN ' + COLLECTION_NAME
    const bindings = { participantUserKey: participantUserKey }
    applogger.trace(bindings, 'Querying "' + query + '"')

    if (trx) {
      await trx.step(() => db.query(query, bindings))
    } else {
      await db.query(query, bindings)
    }
  }
}

export { init, DAL }
