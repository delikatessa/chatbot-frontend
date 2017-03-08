// https://developers.google.com/youtube/v3/docs/search/list

function Talk(obj) {
  this.id = 0;
  this.source = obj.channelTitle;
  this.external_id = obj.id;
  this.category = null;
  this.type = obj.kind;
  this.title = obj.title;
  this.author = null;
  this.url = obj.link;
  this.thumbnail_url = obj.thumbnails.high.url;
  this.published_at = obj.publishedAt;
}

module.exports = Talk;