// Returns the visitor's country code from Vercel's edge (IP based). Nothing is stored.
module.exports = function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  var c = req.headers['x-vercel-ip-country'] || '';
  res.status(200).send(JSON.stringify({ country: c }));
};
