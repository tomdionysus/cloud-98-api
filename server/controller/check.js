module.exports = {
  get: function (req, res, next) {
    if (req.user) {
      res.json.user = {
        id: req.user.id,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        email: req.user.email
      }
    }
    if (req.device) {
      res.json.device = {
        id: req.device.id,
        name: req.device.name
      }
    }
    next()
  }
}
