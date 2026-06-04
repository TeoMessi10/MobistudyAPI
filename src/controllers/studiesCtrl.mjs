/**
 * This provides the API endpoints for the studies.
 */
import { DAL } from '../DAL/DAL.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { readFile } from 'fs/promises'
import Ajv from 'ajv'
import { deleteAttachmentsByStudy } from '../services/attachments.mjs'


export default {
  /**
   * Json schema validate function
   */
  validate: null,

  /**
   * Initialises the controller.
   */
  async init () {
    if (process.env.VALIDATE_SCHEMA === 'true') {
      const studySchema = JSON.parse(
        await readFile('./models/studyDescription.json')
      )
      const ajv = new Ajv({
        schemas: [studySchema]
      })
      this.validate = ajv.getSchema('https://mobistudy.org/models/studyDescription.json')
    } else {
      this.validate = () => true
    }

  },

  /**
   * Creates a new study
   * @param {object} req - express request object
   * @param {object} res - express response object
   * @returns {Promise} a promise
   */
  async createStudy (req, res) {
    if (req.user.role === 'researcher') {
      let newstudy = req.body

      const valid = this.validate(newstudy)
      if (!valid) {
        applogger.error({ errors: this.validate.errors, input: newstudy }, 'Study does not validate against schema')
        return res.status(400).send('Study does not validate against schema')
      }

      newstudy.createdTS = new Date()
      try {
        // verify researcher belongs to the team
        const teams = await DAL.getAllTeams(req.user._key)
        if (teams.find(({ _key }) => _key === newstudy.teamKey)) {
          newstudy = await DAL.createStudy(newstudy)
          res.send(newstudy)

          applogger.info(newstudy, 'New study description added')
          auditLogger.log(
            'studyDescriptionAdded',
            req.user._key,
            newstudy._key,
            undefined,
            'New study description added',
            'studies',
            newstudy._key
          )
        }
        else res.sendStatus(403)

      } catch (err) {
        applogger.error({ error: err }, 'Cannot store new study')
        res.sendStatus(500)
      }

    } else {
      return res.status(403).send('Only researchers create studies')
    }
  },

  /**
   * Replace an existing study
   * @param {object} req - express request object
   * params: study_key
   * @param {object} res - express response object
   * @returns {Promise} a promise
  */
  async replaceStudy (req, res) {
    if (req.user.role === 'participant') {
      return res.status(403).send('Participants cannot modify study descriptions')
    }

    if (!req.params.study_key) {
      return res.status(400).send('No study key specified')
    }

    let newstudy = req.body

    const valid = this.validate(newstudy)
    if (!valid) {
      applogger.error({ errors: this.validate.errors, input: newstudy }, 'Study does not validate against schema')
      return res.status(400).send('Study does not validate against schema')
    }

    if (req.user.role === 'researcher') {
      // verify researcher belongs to the team
      const teams = await DAL.getAllTeams(req.user._key)
      if (!teams.find(({ _key }) => _key === newstudy.teamKey)) {
        return res.status(403).send('Researcher does not have access to this team ' + newstudy.teamKey)
      }
    }

    newstudy.updatedTS = new Date()
    try {
      newstudy = await DAL.replaceStudy(req.params.study_key, newstudy)
      res.send(newstudy)
      applogger.info(newstudy, 'Study replaced')
      auditLogger.log(
        'studyDescriptionReplaced',
        req.user._key,
        newstudy._key,
        undefined,
        'Study description replaced',
        'studies',
        newstudy._key
      )
    } catch (err) {
      applogger.error(
        { error: err },
        'Cannot replace study with _key ' + req.params.study_key
      )
      res.sendStatus(500)
    }
  },

  /**
   * Updates an existing study
   * @param {object} req - express request object
   * params: study_key, body: contains the new study
   * @param {object} res - express response object
   * @returns {Promise} a promise
  */
  async updateStudy (req, res) {
    if (req.user.role === 'participant') {
      return res.status(403).send('Participants cannot modify study descriptions')
    }

    if (!req.params.study_key) {
      return res.status(400).send('No study key specified')
    }

    let newstudy = req.body
    const valid = this.validate(newstudy)
    if (!valid) {
      applogger.error({ errors: this.validate.errors, input: newstudy }, 'Study does not validate against schema')
      return res.status(400).send('Study does not validate against schema')
    }

    if (req.user.role === 'researcher') {
      // verify researcher belongs to the team
      const teams = await DAL.getAllTeams(req.user._key)
      if (!teams.find(({ _key }) => _key === newstudy.teamKey)) {
        return res.status(403).send('Researcher does not have access to this team ' + newstudy.teamKey)
      }
    }

    newstudy.updatedTS = new Date()
    try {
      // TODO: do some access control
      newstudy = await DAL.updateStudy(req.params.study_key, newstudy)
      res.send(newstudy)
      applogger.info(newstudy, 'Study updated')
      auditLogger.log(
        'studyDescriptionUpdated',
        req.user._key,
        newstudy._key,
        undefined,
        'Study description updated',
        'studies',
        newstudy._key
      )
    } catch (err) {
      applogger.error(
        { error: err },
        'Cannot update study with _key ' + req.params.study_key
      )
      res.sendStatus(500)
    }
  },

  /**
   * Query existing studies
   * @param {object} req - express request object, query parameters:
   * after, before, studyTitle, participantKey, teamKey, summary, sortDirection, offset, count
   * @param {object} res - express response object
   * @returns {Promise} a promise
   */
  async getStudies (req, res) {
    let participantKey = null
    if (req.query.participantKey) {
      // only participants can filter by their participant key
      if (req.user.role == 'researcher') {
        return res.status(403).send('Researcher cannot filter by participant Key ')
      } else if (req.user.role == 'participant') {
        // check that the participant key is associated to that user
        const userKey = req.user._key
        let part = await DAL.getParticipantByUserKey(userKey)
        if (part._key != req.query.participantKey) {
          return res.status(403).send('Participant can only query about self')
        }
      }
      participantKey = req.query.participantKey
    }

    let teamsKeys = []
    if (req.query.teamKey) teamsKeys.push(req.query.teamKey)
    if (req.user.role == 'researcher') {
      const researcherTeams = await DAL.getAllTeams(req.user._key)
      let researcherTeamsKeys = researcherTeams.map(({ _key }) => _key)
      if (req.query.teamKey && researcherTeamsKeys && !researcherTeamsKeys.includes(req.query.teamKey)) {
        return res.status(403).send('Researcher is not part of team ' + req.query.teamKey)
      }
      // we can add the researcher's teams to the list of allowed teams
      teamsKeys = researcherTeamsKeys
    }

    let summary = req.query.summary ? true : false

    try {
      // after, before, studyTitle, teamsKeys, participantKey, sortDirection, offset, count, dataCallback
      const result = await DAL.getStudies(
        req.query.after,
        req.query.before,
        req.query.studyTitle,
        teamsKeys,
        participantKey,
        summary,
        req.query.sortDirection,
        req.query.offset,
        req.query.count
      )
      res.send(result)
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot retrieve studies')
      res.sendStatus(500)
    }
  },

  /**
   * Query one existing study
   * @param {object} req - express request object
   * params: study_key
   * @param {object} res - express response object
   * @returns {Promise} a promise
   */
  async getStudyByKey (req, res) {
    if (!req.params.study_key) {
      return res.status(400).send('No study key specified')
    }
    const study = await DAL.getStudyByKey(req.params.study_key)
    if (!study) {
      return res.status(404).send('Study not found')
    }
    res.send(study)
  },

  /**
   * Gets the new studies suitable for this user
   * @param {*} req - express request object
   * @param {*} res - express response object
   * @returns {Promise}
   */
  async getNewStudies (req, res) {
    try {
      if (req.user.role !== 'participant') return res.sendStatus(403)
      const studies = await DAL.getMatchedNewStudies(req.user._key)
      res.send(studies)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve studies')
      res.sendStatus(500)
    }
  },

  /**
   * Gets a new, unused invitation code
   * @param {object} req - express request object
   * @param {*} res - express response object
   * @returns {Promise}
   */
  async getNewInvitationCode (req, res) {
    try {
      if (req.user.role !== 'researcher') return res.sendStatus(403)
      const studyCode = await DAL.getNewInvitationCode()
      applogger.info(
        { studyCode: studyCode },
        'Study code sending back from server'
      )
      if (!studyCode) {
        throw new Error('Cannot retrieve study code', studyCode)
      }
      res.json(studyCode)
    } catch (err) {
      applogger.error({ error: err }, 'Cannot retrieve study code')
      res.sendStatus(500)
    }
  },

  /**
   * Gets a study description given the invitation code
   * @param {object} req - express request object
   * params: invitationalCode
   * @param {*} res - express response object
   * @returns {Promise}
   */
  async getStudyByInvitationCode (req, res) {
    if (!req.params.invitationalCode) return res.status(404).send('Invitation code must be specified')
    try {
      const invitationalCode = req.params.invitationalCode
      const study = await DAL.getInvitationalStudy(invitationalCode)
      if (!study) {
        res.status(404).send('No study exists with code ' + invitationalCode)
        return
      }
      res.send(study)
    } catch (err) {
      applogger.error({ error: err }, err.message)
      res.sendStatus(500)
    }
  },

  /**
   * Deletes a study
   * @param {object} req - express request object
   * params: study_key
   * @param {*} res - express response object
   * @returns {Promise}
   */
  async deleteStudy (req, res) {
    const studykey = req.params.study_key
    if (!studykey) return res.sendStatus(400)

    if (req.user.role !== 'admin') {
      return res.status(403).send('Only an admin can delete study')
    }

    try {
      let trans = await DAL.startTransaction([
        DAL.participantsTransaction(),
        DAL.tasksResultsTransaction(),
        DAL.notesTransaction(),
        DAL.studiesTransaction()
      ])

      // update all participants of study
      const parts = await DAL.getParticipantsByStudy(studykey)
      if (parts) {
        for (let i = 0; i < parts.length; i++) {
          // For Each participant, delete the study key from accepted studies
          const participant = parts[i]
          let studyArray = participant.studies
          studyArray = studyArray.filter(
            (study) => study.studyKey !== studykey
          )
          participant.studies = studyArray
          await DAL.replaceParticipant(parts[i]._key, participant)
        }
      }

      // Data needs to be deleted before the study
      await DAL.deleteTasksResultsByStudy(studykey, trans)

      // Remove notes attached to the study
      await DAL.deleteNotesByStudy(studykey, trans)

      // Deleting the study
      await DAL.deleteStudy(studykey, trans)

      // Remove attachments
      // this must be the last in the sequence because it cannot be rolled back
      await await deleteAttachmentsByStudy(studykey)

      DAL.endTransaction(trans)

      res.sendStatus(200)
      applogger.info({ studyKey: studykey }, 'Study deleted')
      auditLogger.log(
        'studyDescriptionDeleted',
        req.user._key,
        studykey,
        undefined,
        'Study description with key ' + studykey + ' deleted',
        'studies',
        studykey
      )
    } catch (err) {
      console.error(err)
      applogger.error(
        { error: err },
        'Cannot delete study with _key ' + req.params.study_key
      )
      res.sendStatus(500)
    }
  }
}
