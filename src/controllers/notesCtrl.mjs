/**
 * This provides the API endpoints for the clinical notes that researchers
 * write about participants. Notes are bound to a study and a participant, so
 * that all researchers involved in the study can see them on the single
 * participant view of the dashboard.
 */
import { DAL } from '../DAL/DAL.mjs'
import { applogger } from '../services/logger.mjs'
import auditLogger from '../services/auditLogger.mjs'
import { readFile } from 'fs/promises'
import Ajv from 'ajv'


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
      const noteSchema = JSON.parse(
        await readFile('./models/note.json')
      )
      const ajv = new Ajv({
        schemas: [noteSchema]
      })
      this.validate = ajv.getSchema('https://mobistudy.org/models/note.json')
    } else {
      this.validate = () => true
    }
  },

  /**
   * Gets the notes about a participant in a study.
   * Only researchers involved in the study (and admins) can read them.
   * @param {object} req - express request object
   * params: studyKey, participantUserKey. Optional query: offset, count for paging
   * @param {object} res - express response object
   * @returns {Promise}
   */
  async getByParticipant (req, res) {
    const studyKey = req.params.studyKey
    const participantUserKey = req.params.participantUserKey
    if (!studyKey || !participantUserKey) return res.sendStatus(400)

    if (req.user.role === 'participant') {
      return res.status(403).send('Participants cannot access notes')
    }

    try {
      if (req.user.role === 'researcher') {
        // check that the researcher is involved in the study
        const team = await DAL.getAllTeams(req.user._key, studyKey)
        if (team.length === 0) {
          const errmess = 'Researcher cannot request notes for a study (s)he is not involved in'
          applogger.warn(errmess)
          return res.status(403).send(errmess)
        }
      }

      const offset = req.query.offset ? parseInt(req.query.offset) : null
      const count = req.query.count ? parseInt(req.query.count) : null

      const notes = await DAL.getNotes(participantUserKey, studyKey, offset, count)
      res.send(notes)
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot retrieve notes')
      res.sendStatus(500)
    }
  },

  /**
   * Creates a new note about a participant. The new note is passed in the body.
   * Only researchers involved in the study (and admins) can create notes.
   * @param {object} req - express request object, the new note must be in the body
   * @param {object} res - express response object
   * @returns {Promise}
   */
  async createNew (req, res) {
    let newNote = req.body
    if (req.user.role === 'participant') {
      return res.status(403).send('Participants cannot create notes')
    }

    if (!newNote.studyKey || !newNote.participantUserKey || !newNote.text) {
      return res.sendStatus(400)
    }

    try {
      const valid = this.validate(newNote)
      if (!valid) {
        applogger.error({ errors: this.validate.errors, input: newNote }, 'Note does not validate against schema')
        return res.status(400).send('note does not validate against schema')
      }

      if (req.user.role === 'researcher') {
        // check that the researcher is involved in the study
        const team = await DAL.getAllTeams(req.user._key, newNote.studyKey)
        if (team.length === 0) {
          const errmess = 'Researcher cannot create notes for a study (s)he is not involved in'
          applogger.warn(errmess)
          return res.status(403).send(errmess)
        }
      }

      newNote.authorUserKey = req.user._key
      newNote.authorEmail = req.user.email
      newNote.createdTS = new Date()
      newNote.updatedTS = newNote.createdTS

      newNote = await DAL.createNote(newNote)

      res.send(newNote)
      applogger.info({ noteKey: newNote._key, studyKey: newNote.studyKey, participantUserKey: newNote.participantUserKey }, 'Researcher has created a note')
      auditLogger.log(
        'noteCreated',
        req.user._key,
        newNote.studyKey,
        undefined,
        'Note created about participant ' + newNote.participantUserKey + ' for study ' + newNote.studyKey,
        'notes',
        newNote._key
      )
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot store new note')
      res.sendStatus(500)
    }
  },

  /**
   * Updates the text of an existing note. Only the author (or an admin) can edit it.
   * @param {object} req - express request object
   * params: noteKey, body: contains the new text
   * @param {object} res - express response object
   * @returns {Promise}
   */
  async update (req, res) {
    const noteKey = req.params.noteKey
    if (!noteKey) return res.sendStatus(400)

    if (req.user.role === 'participant') {
      return res.status(403).send('Participants cannot modify notes')
    }

    const payload = req.body
    if (!payload || typeof payload.text !== 'string' || payload.text.length === 0) {
      return res.sendStatus(400)
    }

    try {
      const note = await DAL.getOneNote(noteKey)
      if (!note) return res.sendStatus(404)

      // only the author or an admin can edit a note
      if (req.user.role !== 'admin' && note.authorUserKey !== req.user._key) {
        return res.status(403).send('Only the author can modify this note')
      }

      const updatedNote = await DAL.updateNote(noteKey, {
        text: payload.text,
        updatedTS: new Date()
      })
      res.send(updatedNote)
      applogger.info({ noteKey }, 'Note updated')
      auditLogger.log(
        'noteUpdated',
        req.user._key,
        note.studyKey,
        undefined,
        'Note ' + noteKey + ' updated',
        'notes',
        noteKey
      )
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot update note with _key ' + noteKey)
      res.sendStatus(500)
    }
  },

  /**
   * Deletes a note. Only the author (or an admin) can delete it.
   * @param {object} req - express request object
   * params: noteKey
   * @param {object} res - express response object
   * @returns {Promise}
   */
  async delete (req, res) {
    const noteKey = req.params.noteKey
    if (!noteKey) return res.sendStatus(400)

    if (req.user.role === 'participant') {
      return res.status(403).send('Participants cannot delete notes')
    }

    try {
      const note = await DAL.getOneNote(noteKey)
      if (!note) return res.sendStatus(404)

      // only the author or an admin can delete a note
      if (req.user.role !== 'admin' && note.authorUserKey !== req.user._key) {
        return res.status(403).send('Only the author can delete this note')
      }

      await DAL.deleteNote(noteKey)
      res.sendStatus(200)
      applogger.info({ noteKey }, 'Note deleted')
      auditLogger.log(
        'noteDeleted',
        req.user._key,
        note.studyKey,
        undefined,
        'Note ' + noteKey + ' deleted',
        'notes',
        noteKey
      )
    } catch (err) {
      console.error(err)
      applogger.error({ error: err }, 'Cannot delete note with _key ' + noteKey)
      res.sendStatus(500)
    }
  }
}
