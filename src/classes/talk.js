// https://developers.google.com/youtube/v3/docs/search/list

module.exports = class Talk {
    constructor(obj) {
        this.id = 0;
        this.source = obj.channelTitle;
        this.external_id = obj.id;
        this.category = null;
        this.type = obj.kind;
        this._info = obj.title.split(' | ');
        this.url = obj.link;
        this.thumbnail_url = obj.thumbnails.high.url;
        this.published_at = obj.publishedAt;
    }

    get title() {
        return this._info[0];
    }

    get author() {
        return this._info[1];
    }

    get event() {
        return this._info[2];
    }
}