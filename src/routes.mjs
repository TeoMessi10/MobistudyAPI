import passport from 'passport'

import usersCtrl from './controllers/usersCtrl.mjs'
import participantsCtrl from './controllers/participantsCtrl.mjs'
import auditLogCtrl from './controllers/auditLogCtrl.mjs'
import studiesCtrl from './controllers/studiesCtrl.mjs'
import teamsCtrl from './controllers/teamsCtrl.mjs'
import tasksResultsCtrl from './controllers/tasksResultsCtrl.mjs'
import notesCtrl from './controllers/notesCtrl.mjs'
import attachmentsCtrl from './controllers/attachmentsCtrl.mjs'
import studyStatsCtrl from './controllers/studyStatsCtrl.mjs'
import vocabularyCtrl from './controllers/vocabularyCtrl.mjs'
import techadminCtrl from './controllers/techadminCtrl.mjs'
import environmentCtrl from './controllers/environmentCtrl.mjs'
import taskResultsIndicatorsCtrl from './controllers/taskResultsIndicatorsCtrl.mjs'
import express from 'express'

export default async function () {
  // sets up the routes
  const router = express.Router()

  router.get('/', async function (req, res) {
    res.send('<p>Working</p>')
  })

  let mustBeLoggedIn = passport.authenticate('jwt', { session: false })

  await usersCtrl.init()
  router.post('/login', passport.authenticate('local', { session: false }), usersCtrl.login.bind(usersCtrl))
  router.post('/sendResetPasswordEmail', usersCtrl.sendPasswordResetEmail.bind(usersCtrl))
  router.post('/resetPassword', usersCtrl.resetPassword.bind(usersCtrl))
  router.get('/users/renewToken', mustBeLoggedIn, usersCtrl.renewToken.bind(usersCtrl))
  router.post('/users', usersCtrl.createUser.bind(usersCtrl))
  router.get('/users', mustBeLoggedIn, usersCtrl.getUsers.bind(usersCtrl))
  router.get('/users/:user_key', mustBeLoggedIn, usersCtrl.getUserByKey.bind(usersCtrl))
  router.patch('/users/:userKey', mustBeLoggedIn, usersCtrl.updateUser.bind(usersCtrl))
  router.delete('/users/:user_key', mustBeLoggedIn, usersCtrl.removeUser.bind(usersCtrl))

  await participantsCtrl.init()
  router.post('/participants', mustBeLoggedIn, participantsCtrl.createParticipant.bind(participantsCtrl))
  router.get('/participants', mustBeLoggedIn, participantsCtrl.getAll.bind(participantsCtrl))
  router.get('/participants/:participantKey', mustBeLoggedIn, participantsCtrl.getParticipantByKey.bind(participantsCtrl))
  router.get('/participants/byuserkey/:participantUserKey', mustBeLoggedIn, participantsCtrl.getParticipantByUserKey.bind(participantsCtrl))
  router.delete('/participants/:participantKey', mustBeLoggedIn, participantsCtrl.deleteParticipant.bind(participantsCtrl))
  router.delete('/participants/byuserkey/:participantUserKey', mustBeLoggedIn, participantsCtrl.deleteParticipant.bind(participantsCtrl))
  router.patch('/participants/:participantKey', mustBeLoggedIn, participantsCtrl.updateParticipantProfile.bind(participantsCtrl))
  router.patch('/participants/byuserkey/:participantUserKey', mustBeLoggedIn, participantsCtrl.updateParticipantProfile.bind(participantsCtrl))
  router.patch('/participants/byuserkey/:participantUserKey/studies/:studyKey', mustBeLoggedIn, participantsCtrl.updateParticipantStudyStatus.bind(participantsCtrl))
  router.patch('/participants/byuserkey/:participantUserKey/studies/:studyKey/taskItemsConsent/:taskId', mustBeLoggedIn, participantsCtrl.updateParticipantStudyTaskStatus.bind(participantsCtrl))

  await teamsCtrl.init()
  router.post('/teams', mustBeLoggedIn, teamsCtrl.createTeam.bind(teamsCtrl))
  router.get('/teams', mustBeLoggedIn, teamsCtrl.getAll.bind(teamsCtrl))
  router.get('/teams/:teamKey', mustBeLoggedIn, teamsCtrl.getTeamByKey.bind(teamsCtrl))
  router.get('/teams/invitationCode/:teamKey', mustBeLoggedIn, teamsCtrl.generateInvitationCode.bind(teamsCtrl))
  router.post('/teams/researchers/add', mustBeLoggedIn, teamsCtrl.addResearcherToTeam.bind(teamsCtrl))
  router.post('/teams/researchers/remove', mustBeLoggedIn, teamsCtrl.removeResearcherFromTeam.bind(teamsCtrl))
  router.patch('/teams/:teamKey/researchers/studiesOptions/:studyKey', mustBeLoggedIn, teamsCtrl.updateResearcherStudyOptionsInTeam.bind(teamsCtrl))
  router.patch('/teams/researchers/studiesOptions/:studyKey/preferredParticipantsKey/:participantUserKey', mustBeLoggedIn, teamsCtrl.updateResearcherPreferredParticipantInTeam.bind(teamsCtrl))
  router.delete('/teams/:teamKey', mustBeLoggedIn, teamsCtrl.deleteTeam.bind(teamsCtrl))

  await auditLogCtrl.init()
  router.get('/auditlog/eventTypes', mustBeLoggedIn, auditLogCtrl.getEventTypes.bind(auditLogCtrl))
  router.get('/auditlog', mustBeLoggedIn, auditLogCtrl.getAuditLogs.bind(auditLogCtrl))

  await studiesCtrl.init()
  router.post('/studies', mustBeLoggedIn, studiesCtrl.createStudy.bind(studiesCtrl))
  router.get('/studies', mustBeLoggedIn, studiesCtrl.getStudies.bind(studiesCtrl))
  router.get('/studies/newStudies', mustBeLoggedIn, studiesCtrl.getNewStudies.bind(studiesCtrl))
  router.get('/studies/newInvitationCode', mustBeLoggedIn, studiesCtrl.getNewInvitationCode.bind(studiesCtrl))
  router.get('/studies/invitational/:invitationalCode', mustBeLoggedIn, studiesCtrl.getStudyByInvitationCode.bind(studiesCtrl))
  router.get('/studies/:study_key', mustBeLoggedIn, studiesCtrl.getStudyByKey.bind(studiesCtrl))
  router.put('/studies/:study_key', mustBeLoggedIn, studiesCtrl.replaceStudy.bind(studiesCtrl))
  router.patch('/studies/:study_key', mustBeLoggedIn, studiesCtrl.updateStudy.bind(studiesCtrl))
  router.delete('/studies/:study_key', mustBeLoggedIn, studiesCtrl.deleteStudy.bind(studiesCtrl))

  await tasksResultsCtrl.init()
  router.get('/tasksResults', mustBeLoggedIn, tasksResultsCtrl.getAll.bind(tasksResultsCtrl))
  router.post('/tasksResults', mustBeLoggedIn, tasksResultsCtrl.createNew.bind(tasksResultsCtrl))

  await notesCtrl.init()
  router.get('/notes/:studyKey/:participantUserKey', mustBeLoggedIn, notesCtrl.getByParticipant.bind(notesCtrl))
  router.post('/notes', mustBeLoggedIn, notesCtrl.createNew.bind(notesCtrl))
  router.patch('/notes/:noteKey', mustBeLoggedIn, notesCtrl.update.bind(notesCtrl))
  router.delete('/notes/:noteKey', mustBeLoggedIn, notesCtrl.delete.bind(notesCtrl))

  await attachmentsCtrl.init()
  router.get('/tasksResults/attachments/:studyKey/:userKey/:taskId/:fileName', mustBeLoggedIn, attachmentsCtrl.getAttachment.bind(attachmentsCtrl))

  await taskResultsIndicatorsCtrl.init()
  router.get('/taskResultsIndicators/producers', mustBeLoggedIn, taskResultsIndicatorsCtrl.getTaskResultsIndicatorsProducers.bind(taskResultsIndicatorsCtrl))
  router.get('/taskResultsIndicators/studiesWithProducer/:producer', mustBeLoggedIn, taskResultsIndicatorsCtrl.getStudiesWithTaskResultsIndicatorsProducer.bind(taskResultsIndicatorsCtrl))
  router.get('/taskResultsIndicators/:studyKey/:userKey', mustBeLoggedIn, taskResultsIndicatorsCtrl.getTaskResultsIndicators.bind(taskResultsIndicatorsCtrl))
  router.post('/taskResultsIndicators/runProducer/:producer/:studyKey/:taskId/', mustBeLoggedIn, taskResultsIndicatorsCtrl.runTaskResultsIndicatorsProducer.bind(taskResultsIndicatorsCtrl))

  await studyStatsCtrl.init()
  router.get('/studyStats/:studyKey/participantsStatusStats', mustBeLoggedIn, studyStatsCtrl.getParticipantsStatusCounts.bind(studyStatsCtrl))
  router.get('/studyStats/:studyKey/lastTasksSummary', mustBeLoggedIn, studyStatsCtrl.getLastTasksSummary.bind(studyStatsCtrl))

  await vocabularyCtrl.init()
  router.get('/vocabulary/:lang/:type/search', vocabularyCtrl.getTerm.bind(vocabularyCtrl))

  await techadminCtrl.init()
  router.post('/techadmin/sendemail/', mustBeLoggedIn, techadminCtrl.sendOneEmail.bind(techadminCtrl))

  if (process.env.ENVAPIS_DISABLED !== 'true') {
    await environmentCtrl.init()
    router.get('environment', mustBeLoggedIn, environmentCtrl.getEnvironment.bind(environmentCtrl))
  }

  return router
}
