let _last = null

class XMLHttpRequestMock {
  constructor (options) {
    options = options || {}

    spyOn(this, 'setRequestHeader')
    spyOn(this, 'open')
    spyOn(this, 'send')
    _last = this
  }

  setRequestHeader () {}
  open () {}
  send () {}

  static last () {
    return _last
  }
}

module.exports = XMLHttpRequestMock
