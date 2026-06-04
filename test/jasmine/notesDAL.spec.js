import {
  connectToDatabase, dropDatabase,
  addDataToCollection, removeFromCollection
} from '../arangoTools.mjs'
import * as notesDAL from '../../src/DAL/notesDAL.mjs'
import { applogger } from '../../src/services/logger.mjs'

describe('Testing notes DAL,', () => {

  const DBNAME = 'test_notes'
  let testDAL = notesDAL.DAL

  beforeAll(async () => {
    // mock app logger
    spyOnAllFunctions(applogger)

    let db = await connectToDatabase(DBNAME)
    await notesDAL.init(db)
  }, 60000)

  afterAll(async () => {
    await dropDatabase(DBNAME)
  })

  describe('When adding a note', () => {
    let note_key

    beforeAll(async () => {
      note_key = await addDataToCollection('notes', {
        studyKey: 'abc',
        participantUserKey: '1234',
        authorUserKey: '5678',
        authorEmail: 'clinician@test.test',
        text: 'Patient is doing well',
        createdTS: new Date()
      })
    }, 1000)

    afterAll(async () => {
      await removeFromCollection('notes', note_key)
    })

    it('the note can be retrieved by key', async () => {
      let note = await testDAL.getOneNote(note_key)

      expect(note).not.toBeNull()
      expect(note).toBeDefined()
      expect(note.studyKey).toBe('abc')
      expect(note.participantUserKey).toBe('1234')
      expect(note.text).toBe('Patient is doing well')
    })

    it('notes can be retrieved by participant', async () => {
      let notes = await testDAL.getNotes('1234')

      expect(notes).not.toBeNull()
      expect(notes.length).toBe(1)
      expect(notes[0]._key).toBe(note_key)
      expect(notes[0].studyKey).toBe('abc')
    })

    it('notes can be retrieved by participant and study', async () => {
      let notes = await testDAL.getNotes('1234', 'abc')

      expect(notes).not.toBeNull()
      expect(notes.length).toBe(1)
      expect(notes[0]._key).toBe(note_key)
      expect(notes[0].authorUserKey).toBe('5678')
    })
  })

  describe('When adding several notes', () => {
    let n1_key, n2_key, n3_key

    beforeAll(async () => {
      n1_key = await addDataToCollection('notes', {
        studyKey: 'abc',
        participantUserKey: '1234',
        authorUserKey: '5678',
        text: 'first note',
        createdTS: new Date(Date.now() - 2000)
      })

      n2_key = await addDataToCollection('notes', {
        studyKey: 'abc',
        participantUserKey: '1234',
        authorUserKey: '5678',
        text: 'second note',
        createdTS: new Date(Date.now() - 1000)
      })

      n3_key = await addDataToCollection('notes', {
        studyKey: 'def', // another study
        participantUserKey: '1234',
        authorUserKey: '5678',
        text: 'third note',
        createdTS: new Date()
      })
    }, 1000)

    afterAll(async () => {
      await removeFromCollection('notes', n1_key)
      await removeFromCollection('notes', n2_key)
      await removeFromCollection('notes', n3_key)
    })

    it('notes can be retrieved one by one by participant', async () => {
      let res = []
      await testDAL.getNotes('1234', null, null, null, (d) => {
        res.push(d)
      })

      expect(res.length).toBe(3)
    })

    it('notes can be filtered by study', async () => {
      let notes = await testDAL.getNotes('1234', 'abc')

      expect(notes.length).toBe(2)
    })

    it('notes can be paged', async () => {
      let res = await testDAL.getNotes('1234', null, 0, 2)

      expect(res.totalCount).toBe(3)
      expect(res.subset.length).toBe(2)
    })
  })

  describe('When updating and removing notes', () => {
    let note_key

    beforeAll(async () => {
      note_key = await addDataToCollection('notes', {
        studyKey: 'abc',
        participantUserKey: '1234',
        authorUserKey: '5678',
        text: 'to be changed',
        createdTS: new Date()
      })
    }, 1000)

    it('a note can be replaced', async () => {
      let note = await testDAL.getOneNote(note_key)
      note.text = 'changed'
      await testDAL.replaceNote(note_key, note)

      let updated = await testDAL.getOneNote(note_key)
      expect(updated.text).toBe('changed')
    })

    it('a note can be removed by key', async () => {
      await testDAL.deleteNote(note_key)

      let note = await testDAL.getOneNote(note_key)
      expect(note).toBeNull()
    })
  })

  describe('When removing notes by study and participant', () => {
    let n1_key, n2_key

    beforeAll(async () => {
      n1_key = await addDataToCollection('notes', {
        studyKey: 'studyToDelete',
        participantUserKey: 'partToDelete',
        authorUserKey: '5678',
        text: 'note one',
        createdTS: new Date()
      })
      n2_key = await addDataToCollection('notes', {
        studyKey: 'studyToDelete',
        participantUserKey: 'partToDelete',
        authorUserKey: '5678',
        text: 'note two',
        createdTS: new Date()
      })
    }, 1000)

    it('notes can be removed by study', async () => {
      await testDAL.deleteNotesByStudy('studyToDelete')

      let notes = await testDAL.getNotes(null, 'studyToDelete')
      expect(notes.length).toBe(0)
    })

    it('notes can be removed by participant', async () => {
      // re-add since the previous test removed them
      n1_key = await addDataToCollection('notes', {
        studyKey: 'anotherStudy',
        participantUserKey: 'partToDelete',
        authorUserKey: '5678',
        text: 'note one',
        createdTS: new Date()
      })

      await testDAL.deleteNotesByParticipant('partToDelete')

      let notes = await testDAL.getNotes('partToDelete')
      expect(notes.length).toBe(0)
    })
  })

})
