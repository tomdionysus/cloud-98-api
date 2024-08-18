const handlebars = require('handlebars')
const path = require('path')
const fs = require('fs')

const Logger =  require('./Logger')
const ScopedLogger =  require('./ScopedLogger')


class Template {
	constructor({ logger, templateDir }) {
		this.logger = new ScopedLogger('Template', logger || new Logger())
		this.templateDir = templateDir || path.join(__dirname,'../server/templates')
		this._templates = {}
	}

	load() {
		this._load(this.templateDir, this._templates)
	}

  	_load (filePath, root) {
		const files = fs.readdirSync(filePath)
		for (const i in files) {
			const file = files[i]
			if(path.extname(file)!='.hbs') continue
			const fullPath = path.join(filePath, file)
			const basename = path.basename(file, '.hbs')
			const stats = fs.statSync(fullPath)
			if (stats.isDirectory()) {
				root[basename] = {}
				this._load(fullPath, root[basename])
			} else {
				this.logger.debug('Loading Template `%s`', basename)
				root[basename] = handlebars.compile(fs.readFileSync(fullPath).toString())
			}
		}
	}

	process (typePath, data) {
		const type = typePath.split('.')
		let cur = this._templates
		while (cur !== undefined && type.length > 0) {
			cur = cur[type.shift()]
		}
		if (!cur) throw new Error('The Template ' + typePath + ' is not registered')
		return cur(data)
	}
}

module.exports = Template