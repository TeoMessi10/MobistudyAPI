/**
 * This provides the API endpoints for all tasks results.
 */
import * as Types from '../../models/jsdocs.js'

import { DAL } from '../DAL/DAL.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { studyStatusUpdateCompose } from '../services/emailComposer.mjs'
import { deleteAttachmentsByUserKey } from '../services/attachments.mjs'
import merge from 'deepmerge'


export default {
  /**
   * Json schema validate function
   */
  validate: null,

  /**
   * Initialises the controller.
   */
  async init () {
  },

  /**
   * Creates a new participant
   * @param {Object} req - express request, body must contain new participant
   * @param {Object} res - express response
   */
  async createParticipant (req, res) {
    let newparticipant = req.body
    if (!newparticipant.createdTS) newparticipant.createdTS = new Date()
    try {
      if (req.user.role === 'participant') {
        // impose user key to be the one of the logged in
        newparticipant.userKey = req.user._key
        //make sure studies is present
        if (!newparticipant.studies) newparticipant.studies = []

        // check if the participant already exists
        let existing = await DAL.getParticipantByUserKey(newparticipant.userKey)
        if (existing) {
          applogger.warn(
            { userKey: newparticipant.userKey },
            'Participant profile already exists'
          )
          newparticipant = await DAL.updateParticipant(
            existing._key,
            newparticipant
          )
          applogger.info(
            { participantKey: participant._key },
            'Participant profile updated'
          )
          auditLogger.log(
            'participantUpdated',
            req.user._key,
            undefined,
            undefined,
            'Participant updated',
            'participants',
            participant._key
          )
          res.send(newparticipant)
        } else {
          newparticipant = await DAL.createParticipant(newparticipant)
          res.send(newparticipant)
          applogger.info(
            {
              userKey: newparticipant.userKey,
              participantKey: newparticipant._key
            },
            'New participant profile created'
          )
          auditLogger.log(
            'participantCreated',
            req.user._key,
            undefined,
            undefined,
            'New participant created',
            'participants',
            newparticipant._key
          )
        }
      } else res.sendStatus(403)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot store new participant')
      res.sendStatus(500)
    }
  },

  /**
   * Retrieves a participant using its key (not user key)
   * @param {Object} req - express request, must contain param: participantKey
   * @param {Object} res - xpress response
   * @returns {Promise<Types.Participant>}
   */
  async getParticipantByKey (req, res) {
    try {
      let partKey = req.params.participantKey
      const participant = await DAL.getOneParticipant(partKey)

      if (req.user.role === 'participant' && participant) {
        if (participant.userKey != req.user._key) {
          return res.sendStatus(403)
        }
      } else if (req.user.role === 'researcher') {
        const areLinked = await DAL.hasResearcherParticipant(req.user._key, null, req.params.participantKey)
        if (!areLinked) {
          applogger.warn('Researcher ' + req.user._key + ' trying to get details of participant with key (not user) ' + req.params.userKey + ' but has no studies with such person')
          return res.sendStatus(403)
        }
      }
      if (!participant) return res.sendStatus(404)
      res.send(participant)
    } catch (err) {
      applogger.error(
        { error: err },
        'Cannot retrieve participant with _key ' + req.params.participantKey
      )
      res.sendStatus(500)
    }
  },

  /**
   * Gets participant details by user key
   * @param {Object} req - request, must contain params: participantUserKey
   * @param {Object} res - express response
   * @returns {Promise<Types.Participant>}
   */
  async getParticipantByUserKey (req, res) {
    let participantUserKey = req.params.participantUserKey
    if (!participantUserKey) return res.sendStatus(400)
    if (req.user.role === 'participant' &&
      req.params.participantUserKey !== req.user._key) {
      return res.sendStatus(403)
    }
    if (req.user.role === 'researcher') {
      const areLInked = await DAL.hasResearcherParticipant(req.user._key, participantUserKey)
      if (!areLInked) {
        applogger.warn('Researcher ' + req.user._key + ' trying to get details of participant with userkey ' + participantUserKey + ' but has no studies with such person')
        return res.sendStatus(403)
      }
    }
    try {
      const participant = await DAL.getParticipantByUserKey(participantUserKey)
      if (!participant) return res.sendStatus(404)
      res.send(participant)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve participant with userKey ' + participantUserKey)
      res.sendStatus(500)
    }
  },

  /**
   * Gets all participants, depending on user and params
   * @param {Object} req - express request, user must be logged in
   * query params: teamKey, studyKey or currentStatus (in case the user is a researcher)
   * @param {Object} res - express response
   * @returns {Promise<Array<Types.Participant>>} promise providing an array of participants
   */
  async getAll (req, res) {
    try {
      let participants = []
      if (req.user.role === 'participant') {
        // participants can retrieve only themselves
        participants = await DAL.getParticipantByUserKey(req.user._key)
      } else if (req.user.role === 'researcher') {
        let studyKey = null
        let teamKey = null
        let status = null
        // extra checks
        if (req.query.currentStatus) {
          status = req.query.currentStatus
        }
        if (req.query.teamKey) {
          teamKey = req.query.teamKey
          const team = await DAL.getOneTeam(req.query.teamKey)
          if (!team.researchers.find((r) => r.userKey == req.user._key)) {
            return res.sendStatus(403)
          }
        }
        if (req.query.studyKey) {
          studyKey = req.query.studyKey
          const team = await DAL.getAllTeams(req.user._key, req.query.studyKey)
          if (team.length === 0) return res.sendStatus(403)
        }

        participants = await DAL.getParticipantsByResearcher(req.user._key, status, false, teamKey)
      } else if (req.user.role === 'admin') {
        // admin
        let status = null
        let studyKey = null
        if (req.query.currentStatus) {
          status = req.query.currentStatus
        }
        if (req.query.studyKey) {
          studyKey = req.query.studyKey
        }

        if (req.query.teamKey) {
          let teamKey = req.query.teamKey
          participants = await DAL.getParticipantsByTeam(teamKey, studyKey, status)
        } else {
          participants = await DAL.getAllParticipants(status, studyKey)
        }
      } else {
        return res.sendStatus(403)
      }
      res.send(participants)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve participants')
      res.sendStatus(500)
    }
  },

  /**
   * Removes a participant using its key or userKey
   * @param {Object} req - express request,
   * must contain one of these two params: participantKey or participantUserKey
   * @param {Object} res - express response
   * @returns {Promise}
   */
  async deleteParticipant (req, res) {
    let trans = null
    try {
      // researchers cannot remove participants
      if (req.user.role === 'researcher') return res.sendStatus(403)

      let participant
      let partKey = req.params.participantKey
      if (partKey) {
        participant = await DAL.getOneParticipant(partKey)
        // participant can remove only himself
        if (req.user.role === 'participant' && participant && participant.userKey !== req.user._key) {
          return res.sendStatus(403)
        }
      }

      let partUserKey = req.params.participantUserKey
      if (partUserKey) {
        participant = await DAL.getParticipantByUserKey(partUserKey)
        // participant can remove only himself
        if (req.user.role === 'participant' && partUserKey !== req.user._key) {
          return res.sendStatus(403)
        }
      }
      if (!participant) return res.sendStatus(404)

      if (!partKey) {
        // get also the user key
        partKey = participant._key
      }
      if (!partUserKey) {
        // get also the participant key
        partUserKey = participant.userKey
      }

      trans = await DAL.startTransaction([
        DAL.tasksResultsTransaction(),
        DAL.auditLogsTransaction(),
        DAL.notesTransaction(),
        DAL.participantsTransaction(),
        DAL.usersTransaction(),
      ])
      // Remove Tasks results
      await DAL.deleteTasksResultsByUserKey(partUserKey, trans)

      // Remove Audit logs?
      await DAL.deleteLogsByUserKey(partUserKey, trans)

      // Remove notes about the participant
      await DAL.deleteNotesByParticipant(partUserKey, trans)

      // Remove participant
      await DAL.removeParticipant(partKey, trans)

      // Remove user
      await DAL.removeUser(partUserKey, trans)

      // Remove attachments
      // this must be the last in the sequence because it cannot be rolled back
      await deleteAttachmentsByUserKey(partUserKey)

      DAL.endTransaction(trans)

      res.sendStatus(200)
      applogger.info(
        { participantUserKey: partUserKey, participantKey: partKey },
        'Participant profile deleted'
      )
      auditLogger.log(
        'participantDeleted',
        req.user._key,
        undefined,
        undefined,
        'Participant deleted',
        'participants',
        partKey
      )
    } catch (err) {
      console.error(err)
      if (trans) DAL.abortTransaction(trans)
      // respond to request with error
      applogger.error({ error: err }, 'Cannot delete participant')
      res.sendStatus(500)
    }
  },

  /**
   * This is meant to be used to update the info not related to the studies
   * @param {Object} req - express request,
   * must contain one of these two params: participantKey or participantUserKey
   * must include a body with profile, studies will be ignored here
   * @param {Object} res - express response
   * @returns {Promise<Types.Participant>}
   */
  async updateParticipantProfile (req, res) {
    if (!req.body) return res.sendStatus(400)
    let newparticipant = req.body
    // ignore the created TS (use existing)
    delete newparticipant.createdTS
    // timestamp the update
    if (!newparticipant.updatedTS) newparticipant.updatedTS = new Date()
    // ignore the studies property
    delete newparticipant.studies
    // ignore keys
    delete newparticipant.userKey
    delete newparticipant._key

    if (req.user.role === 'researcher') return res.sendStatus(403)
    try {
      let participant
      let partKey = req.params.participantKey
      if (partKey) {
        participant = await DAL.getOneParticipant(partKey)
        // participant can update only himself
        if (req.user.role === 'participant' && participant && participant.userKey !== req.user._key) {
          return res.sendStatus(403)
        }
      }

      let partUserKey = req.params.participantUserKey
      if (partUserKey) {
        // participant can update only himself
        if (req.user.role === 'participant' && partUserKey !== req.user._key) {
          return res.sendStatus(403)
        }
        participant = await DAL.getParticipantByUserKey(partUserKey)
      }
      if (!participant) return res.sendStatus(404)

      if (!partKey) {
        // get also the user key
        partKey = participant._key
      }
      if (!partUserKey) {
        // get also the participant key
        partUserKey = participant.userKey
      }
      // copy back the studies property
      newparticipant.studies = participant.studies

      newparticipant = await DAL.updateParticipant(
        participant._key,
        newparticipant
      )
      res.send(newparticipant)
      applogger.info(
        { participantKey: participant._key },
        'Participant profile updated'
      )
      auditLogger.log(
        'participantUpdated',
        req.user._key,
        undefined,
        undefined,
        'Participant updated',
        'participants',
        participant._key
      )
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot update participant with _key ' + req.params.participant_key)
      res.sendStatus(500)
    }
  },

  /**
   * This endpoint is for the app to update the status of the participant regarding a study.
   * Send emails on change of status: active, completed, withdrawn
   * @param {Object} req - express request. Must contain params: participantUserKey and studyKey
   * body must contain the current status related to the study (currentStatus) and the timestamp (like acceptedTS)
   * example: { currentStatus: 'withdrawn', withdrawalTS: 'ISO string', withdrawalReason: 'quit' }
   * withdrawalReason must be added in the case of a withdrawal
   * criteriaAnswers must be added in case of acceptance of not eligible
   * taskItemsConsent and extraItemsConsent can be added, but are not mandatory
   * @param {Object} res - express response
   * @returns {Promise}
   */
  async updateParticipantStudyStatus (req, res) {
    const userKey = req.params.participantUserKey
    const studyKey = req.params.studyKey
    const payload = req.body
    let currentStatus
    try {
      if (
        req.user.role === 'participant' &&
        userKey !== req.user._key
      ) {
        return res.sendStatus(403)
      }
      if (req.user.role === 'researcher') return res.sendStatus(403)

      if (!userKey || !studyKey) return res.sendStatus(400)
      if (!payload.currentStatus) return res.sendStatus(400)
      const updatedCurrentStatus = payload.currentStatus

      const user = await DAL.getOneUser(userKey)
      if (!user) return res.sendStatus(404)
      const participant = await DAL.getParticipantByUserKey(userKey)
      if (!participant) return res.sendStatus(404)

      // Updated Time Stamp
      participant.updatedTS = new Date()

      // Create studies array if none exist, else find existing one
      let studyIndex = -1
      if (!participant.studies) {
        participant.studies = []
      } else {
        studyIndex = participant.studies.findIndex((s) => {
          return s.studyKey === studyKey
        })
      }

      if (studyIndex === -1) {
        // study needs to be added
        participant.studies.push({
          studyKey: studyKey
        })
        studyIndex = participant.studies.length - 1
      }
      // study must be updated:

      // get study status before patch update
      currentStatus = participant.studies[studyIndex].currentStatus

      // update the study in array
      participant.studies[studyIndex] = merge(participant.studies[studyIndex], payload)
      // Update the participant on DB
      await DAL.updateParticipant(participant._key, participant)

      res.sendStatus(200)

      applogger.info(
        { participantKey: participant._key, study: payload },
        'Participant has changed studies status'
      )
      auditLogger.log(
        'participantStudyUpdate',
        req.user._key,
        payload.studyKey,
        undefined,
        'Participant with key ' +
        participant._key +
        ' has changed studies status',
        'participants',
        participant._key
      )

      // if there is a change in status, then send email reflecting updated status change
      // this should fail gracefully
      try {
        if (updatedCurrentStatus !== currentStatus) {
          const em = await studyStatusUpdateCompose(studyKey, participant)
          await mailSender.sendEmail(req.user.email, em.title, em.content)
        }
      } catch (err) {
        applogger.error(
          { error: err },
          'Cannot send study update email to user key ' + userKey
        )
      }
    } catch (err) {
      applogger.error(
        { error: err },
        'Cannot update participant with user key ' + userKey
      )
      res.sendStatus(500)
    }
  },

  /**
   * This endpoint is for the app to update the status of the participant regarding a study and a task
   * @param {Object} req - express request. Params must contain participantUserKey, studyKey and taskId.
   * Body contains the task information, example:
   * { taskId: 3, consented: true, lastExecuted: "2019-02-27T12:46:07.294Z", lastMiband3SampleTS: "2019-03-05T12:46:07.294Z" }
   * @param {Object} res - express response
   * @returns {Promise}
   */
  async updateParticipantStudyTaskStatus (req, res) {
    const userKey = req.params.participantUserKey
    const studyKey = req.params.studyKey
    const taskId = parseInt(req.params.taskId)
    const payload = req.body

    try {
      if (req.user.role == 'researcher') return res.sendStatus(403)
      if (!userKey || !studyKey || !taskId) return res.sendStatus(400)
      if (Number.isNaN(taskId)) return res.sendStatus(400)

      const participant = await DAL.getParticipantByUserKey(userKey)
      if (!participant) return res.sendStatus(404)
      if (!participant.studies) return res.sendStatus(404)

      // find the study
      let studyIndex = -1
      studyIndex = participant.studies.findIndex((s) => {
        return s.studyKey === studyKey
      })
      if (studyIndex === -1) return res.sendStatus(404)

      if (!participant.studies[studyIndex].taskItemsConsent) return res.sendStatus(404)

      let taskItemsConsent = participant.studies[studyIndex].taskItemsConsent
      let taskIndex = -1
      taskIndex = taskItemsConsent.findIndex(
        (t) => {
          return t.taskId == taskId
        }
      )
      if (taskIndex === -1) return res.sendStatus(404)

      // coerce taskId to the one in params (just in case)
      payload.taskId = taskId

      taskItemsConsent[taskIndex] = merge(taskItemsConsent[taskIndex], payload)

      // Update the DB
      await DAL.updateParticipant(participant._key, participant)

      res.sendStatus(200)
      applogger.info(
        { participantKey: participant._key, taskItemConsent: payload },
        'Participant has changed task item consent status'
      )
      auditLogger.log(
        'participantStudyUpdate',
        req.user._key,
        payload.studyKey,
        undefined,
        'Participant with key ' +
        participant._key +
        ' has changed task item consent status',
        'participants',
        participant._key
      )
    } catch (err) {
      applogger.error(
        { error: err },
        'Cannot update participant with user key ' + userKey
      )
      res.sendStatus(500)
    }
  }

}
