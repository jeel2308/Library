const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const LinkSchema = new Schema({
  url: {
    type: String,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    required: true,
  },
  folderId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
  },
  description: {
    type: String,
  },
  thumbnail: {
    type: String,
  },
});

const Link = mongoose.model('link', LinkSchema);

module.exports = Link;
