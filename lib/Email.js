const async = require('async')
const path = require('path')
const fs = require('fs')
const handlebars = require('handlebars')
const moment = require('moment')
const _ = require('underscore.string')
const Currency = require('./Currency')

const Logger = require('./Logger')
const ScopedLogger = require('./ScopedLogger')

const attachmentDir = path.join(__dirname,'../server/attachments/')

handlebars.registerHelper('localDateTime', function (datetime, tzName) {
	datetime = moment(datetime).utc()
	if(tzName) datetime=datetime.tz(tzName)
    return datetime.format('dddd MMMM Do YYYY HH:mm')
})

handlebars.registerHelper('localDate', function (datetime, tzName) {
	datetime = moment(datetime).utc()
	if(tzName) datetime=datetime.tz(tzName)
    return datetime.format('dddd MMMM Do YYYY')
})

handlebars.registerHelper('capitalize', function (str) {
    return _.capitalize(str)
})

handlebars.registerHelper('currency', function (amount, currency) {
    return Currency.formatShort(amount, currency)
})

handlebars.registerHelper('join', function (seperator, ...list) {
	return list
		.filter(a => a!==null && (typeof a === 'string' || a instanceof String))
		.map(a => a.trim())
		.filter(a => a.length!==0)
		.join(seperator)
})

handlebars.registerHelper('eq', function (a, b, options) {
	if (a==b) {
		return options.fn(this)
	} else {
		return options.inverse(this)
	}
})

class Email {
	constructor({ mailer, logger, from, template }) {
		this.logger = new ScopedLogger('Email', logger || new Logger())
		this.mailer = mailer
		this.logger = logger

		this.template = template

		this.from = from || 'cloud98 <caroline@cloud98.blackraven.co.nz>'
		this.domain = 'https://cloud98.blackraven.co.nz'
	}

	inviteWorker(firstName, lastName, email, cb) {
		var options = { firstName: firstName, lastName: lastName, email: email }
		const data = {
			from: this.from,
			to: (firstName + ' ' + lastName).trim() + ' <' + email + '>',
			subject: 'Welcome to cloud98',
			text: this.template.process('invite_worker_txt', options),
			html: this.template.process('invite_worker_html', options),
			attachment: [
				// this.mailer.fileAttachment(attachmentDir+'/invite_worker/cloud98- Employment Agreement.pdf'),
				// this.mailer.fileAttachment(attachmentDir+'/invite_worker/cloud98- User Privacy Policy.pdf'),
				// this.mailer.fileAttachment(attachmentDir+'/invite_worker/cloud98- Worker Declaration.pdf'),
				// this.mailer.fileAttachment(attachmentDir+'/invite_worker/IR330 2019.pdf'),
				// this.mailer.fileAttachment(attachmentDir+'/invite_worker/KS2 09 2020.pdf'),
			],
			'h:Reply-To': 'employees@cloud98.blackraven.co.nz',
		}
		this.mailer.sendAsyncMail(data, cb)
	}

	inviteEmployer(name, email, cb) {
		var options = { name: name, email: email }
		const data = {
			from: this.from,
			to: name.trim() + ' <' + email + '>',
			subject: 'Welcome to cloud98',
			text: this.template.process('invite_employer_txt', options),
			html: this.template.process('invite_employer_html', options),
			attachment: [
				// this.mailer.fileAttachment(attachmentDir+'/invite_employer/cloud98- Customer Agreement.pdf'),
				this.mailer.fileAttachment(attachmentDir+'/invite_employer/cloud98- User Privacy Policy.pdf'),
			],
			'h:Reply-To': 'customers@cloud98.blackraven.co.nz',
			}
		this.mailer.sendAsyncMail(data, cb)
	}

	forgotPassword(user, cb) {
		const data = {
			from: this.from,
			to: (user.first_name + ' ' + user.last_name + ' ').trim() + ' <' + user.email + '>',
			subject: 'cloud98- Forgot Password',
			text: this.template.process('forgot_password_txt', user),
			html: this.template.process('forgot_password_html', user),
			'h:Reply-To': 'info@cloud98.blackraven.co.nz',
		}
		this.mailer.sendAsyncMail(data, cb)
	}

	loginDetails(firstName, lastName, email, body, user, cb) {
		const data = {
			from: this.from,
			to: (firstName + ' ' + lastName + ' ').trim() + ' <' + email + '>',
			subject: 'cloud98- Login Details',
			text: this.template.process('login_details_txt', { body: body, user: user }),
			html: this.template.process('login_details_html', { body: body, user: user }),
			'h:Reply-To': 'info@cloud98.blackraven.co.nz',
		}
		this.mailer.sendAsyncMail(data, cb)
	}

	shiftRatedByUser(shift, email, userRating, cb) {
		const data = {
			from: this.from,
			to: 'cloud98 Operations <operations@cloud98.blackraven.co.nz>',
			subject: 'Shift Rated By User '+email+' - '+shift.premises_name,
			text: 'User: '+email
				+'\nPremises: '+shift.premises_name
				+'\nShift: '+shift.id+' '+shift.start_utc.toISOString()+' '+shift.end_utc.toISOString()
				+'\nRating: '+userRating,
		}
		this.mailer.sendAsyncMail(data, cb)
	}

	shiftUpdated(shift, status, email, cb) {
		const data = {
			from: this.from,
			to: 'cloud98 Operations <operations@cloud98.blackraven.co.nz>',
			subject: 'Shift Updated - '+shift.premises_name+' '+shift.start_utc.toISOString()+' '+shift.end_utc.toISOString()+' - '+status,
			text: 'Status: '+status
				+'\nUser: '+email
				+'\nPremises: '+shift.premises_id+' '+shift.premises_name
				+'\nShift: '+shift.start_utc.toISOString()+' '+shift.end_utc.toISOString()+' ('+shift.id+')'
				+'\nStatus Update: '+shift.status+' -> '+status
		}
		this.mailer.sendAsyncMail(data, cb)
	}

	shiftRequest(shift, status, email, requestId, cb) {
		const data = {
			from: this.from,
			to: 'cloud98 Operations <operations@cloud98.blackraven.co.nz>',
			subject: 'Request '+status+' - '+shift.premises_name+' '+shift.start_utc.toISOString()+' '+shift.end_utc.toISOString(),
			text: 'Request '+status
				+'\nUser: '+email
				+'\nPremises: '+shift.premises_name+' ('+shift.premises_id+')'
				+'\nShift: '+shift.start_utc.toISOString()+' '+shift.end_utc.toISOString()+' ('+shift.id+') '+shift.shift_type
				+'\nRequest: '+requestId,
		}
		this.mailer.sendAsyncMail(data, cb)
	}

	notifyAdminSignupWorker(firstName, lastName, email, industry, phone, cb) {
		const data = {
			from: this.from,
			to: 'cloud98 Worker Signup <worker-signup@cloud98.blackraven.co.nz>',
			subject: 'Worker Signup - '+firstName+' '+lastName,
			text: ''
			+'\nFirst Name: '+firstName
			+'\nLast Name: '+lastName
			+'\nEmail: '+email
			+'\nIndustry: '+industry
			+'\nPhone: '+phone
		}
		this.mailer.sendAsyncMail(data, cb)
	}

	notifyAdminSignupEmployer(firstName, lastName, businessName, email, industry, phone, cb) {
		const data = {
			from: this.from,
			to: 'cloud98 Customer Signup <employer-signup@cloud98.blackraven.co.nz>',
			subject: 'Customer Signup - '+businessName,
			text: ''
			+'\nFirst Name: '+firstName
			+'\nLast Name: '+lastName
			+'\nBusiness Name: '+businessName
			+'\nEmail: '+email
			+'\nIndustry: '+industry
			+'\nPhone: '+phone
		}
		this.mailer.sendAsyncMail(data, cb)
	}

	notifyEmployerPermanentRequest(organisation, shift, currency, premises, job, user, cb) {
		this.mailer.sendAsyncMail({
			from: this.from,
			to: premises.name + ' Manager <' + organisation.invoicing_email + '>',
			subject: premises.name+': '+job.name+' (Permanent Position) Candidate: '+user.first_name+' '+user.last_name,
			text: this.template.process('permanent_position_request_txt', {organisation, shift, currency, premises, job, user}),
			html: this.template.process('permanent_position_request_html', {organisation, shift, currency, premises, job, user}),
			'h:Reply-To': user.first_name+' '+user.last_name+' <'+user.email+'>',
		}, cb)
	}

	notifyEmployerOneOffRequest(organisation, shift, currency, premises, job, user, cb) {
		this.mailer.sendAsyncMail({
			from: this.from,
			to: premises.name + ' Manager <' + organisation.invoicing_email + '>',
			subject: premises.name+': '+job.name+' (Shift) Request: '+user.first_name+' '+user.last_name,
			text: this.template.process('oneoff_shift_request_txt', {organisation, shift, currency, premises, job, user}),
			html: this.template.process('oneoff_shift_request_html', {organisation, shift, currency, premises, job, user}),
			'h:Reply-To': user.first_name+' '+user.last_name+' <'+user.email+'>',
		}, cb)
	}

	notifyEmployerShiftUpdated(organisation, shift, currency, premises, job, user, cb) {
		let permanent = shift.shift_type === 'permanent'
		let sName = permanent ? 'Permanent Position' : 'Shift'
		let sStarts = moment(shift.start_utc).utc(), sEnds = moment(shift.end_utc).utc()
		if(premises.timezone_id) {
			sStarts=sStarts.tz(premises.timezone_id)
			sEnds=sEnds.tz(premises.timezone_id)
		}
		let sDateTime = permanent ? 'Starts '+sStarts.format('dddd MMMM Do YYYY') : sStarts.format('dddd MMMM Do YYYY HH:mm')+' - '+sEnds.format('dddd MMMM Do YYYY HH:mm')
		this.mailer.sendAsyncMail({
			from: this.from,
			to: premises.name + ' Manager <' + organisation.invoicing_email + '>',
			subject: premises?.name+': '+job?.name+' ('+sName+', '+sDateTime+') '+shift.status+' by '+user.first_name+' '+user.last_name,
			text: this.template.process('shift_updated_txt', {organisation, shift, currency, premises, job, user, sName, permanent, now: moment() }),
			html: this.template.process('shift_updated_html', {organisation, shift, currency, premises, job, user, sName, permanent, now: moment() }),
		}, cb)
	}

}

module.exports = Email