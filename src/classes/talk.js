// https://developers.google.com/youtube/v3/docs/search/list

module.exports = class Talk {

    constructor(obj) {
        if (obj.title !== undefined) {
            this.id = 0;
            this.source = obj.channelTitle;
            this.external_id = obj.id;
            this.category = null;
            this.type = obj.kind;
            this.full_title = obj.title;
            this.url = obj.link;
            this.thumbnail_url = obj.thumbnails.high.url;
            this.published_at = obj.publishedAt;
            this._parsed = obj.title.split(' | ');
        } else {
            this.id = obj.id;
            this.source = obj.source;
            this.external_id = obj.external_id;
            this.category = obj.category;
            this.type = obj.type;
            this.full_title = obj.full_title;
            this.url = obj.url;
            this.thumbnail_url = obj.thumbnail_url;
            this.published_at = obj.published_at;
            this._parsed = obj._parsed;
        }
    }   

    get title() {
        return this._parsed[0];
    }

    get author() {
        if (this._parsed.length > 1) {
            return this._parsed[1];             
        }
        return null;
    }

    get event() {
        if (this._parsed.length > 2) {
            return this._parsed[2];
        }
        return null;
    }

    get subtitle() {
        switch (this._parsed.length) {
            case 2:
                return this._parsed[1];
            case 3:
                return this._parsed[1] + ", " + this._parsed[2];
            default:
                return null;
        }
    }
}