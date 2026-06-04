/**
 * This module is a Data Access Layer (DAL), it abstracts the database with functions.
 */
import Database from 'arangojs'

import * as users from './usersDAL.mjs'
import * as teams from './teamsDAL.mjs'

import * as auditLog from './auditLogDAL.mjs'
import * as studies from './studiesDAL.mjs'
import * as participants from './participantsDAL.mjs'
import * as forms from './formsDAL.mjs'
import * as tasksResults from './tasksResultsDAL.mjs'
import * as studystats from './studyStatsDAL.mjs'
import * as taskResultsIndicators from './taskResultsIndicatorsDAL.mjs'
import * as notes from './notesDAL.mjs'

import { applogger } from '../services/logger.mjs'

export let DAL = {
  db: null,

  async startTransaction (names) {
    return this.db.beginTransaction({
      write: names
    })
  },

  async endTransaction (transaction) {
    return transaction.commit()
  },

  async abortTransaction (transaction) {
    if (transaction) return transaction.abort()
  },

  async extendDAL () {
    Object.assign(this, users.DAL)
    Object.assign(this, teams.DAL)
    Object.assign(this, studies.DAL)
    Object.assign(this, participants.DAL)
    Object.assign(this, auditLog.DAL)
    Object.assign(this, forms.DAL)
    Object.assign(this, tasksResults.DAL)
    Object.assign(this, studystats.DAL)
    Object.assign(this, taskResultsIndicators.DAL)
    Object.assign(this, notes.DAL)
  },

  async init () {
    if (!this.db) {

      if (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_USER || !process.env.DB_PASSWORD) {
        throw new Error('Database configuration is missing')
      }

      try {
        this.db = new Database({
          url: 'http://' + process.env.DB_HOST + ':' + process.env.DB_PORT,
          databaseName: process.env.DB_NAME,
          auth: { username: process.env.DB_USER, password: process.env.DB_PASSWORD }
        })
      }
      catch (err) {
        applogger.fatal(err, 'Cannot connect to database')
        throw err
      }

      applogger.debug('Connected to database')
    }

    // init all parts of the DAL
    await users.init(this.db)
    await teams.init(this.db)
    await auditLog.init(this.db)
    await studies.init(this.db)
    await participants.init(this.db)
    await forms.init(this.db)
    await tasksResults.init(this.db)
    await studystats.init(this.db)
    await taskResultsIndicators.init(this.db)
    await notes.init(this.db)

    // add all functions
    return this.extendDAL()
  }
}
