module.exports = class Term {
    constructor(text) {
        this.id = 0;
        this.text = text.trim().toLowerCase();
        this.weight = 1;
    }
}