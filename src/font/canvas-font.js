import { string } from '../core/string.js';
import { EventHandler } from '../core/event-handler.js';

import { Color } from '../math/color.js';

import {
    ADDRESS_CLAMP_TO_EDGE,
    FILTER_LINEAR, FILTER_LINEAR_MIPMAP_LINEAR,
    PIXELFORMAT_R8_G8_B8_A8
} from '../graphics/constants.js';
import { Texture } from '../graphics/texture.js';

/** @typedef {import('../application.js').Application} Application */

const MAX_TEXTURE_SIZE = 4096;
const DEFAULT_TEXTURE_SIZE = 512;

/**
 * Represents the resource of a canvas font asset.
 *
 * @augments EventHandler
 * @private
 */
class CanvasFont extends EventHandler {
    /**
     * Create a new CanvasFont instance.
     *
     * @param {Application} app - The application.
     * @param {object} options - The font options.
     * @param {string} [options.fontName] - The name of the font, use in the same manner as a CSS font.
     * @param {string} [options.fontWeight] - The weight of the font, e.g. 'normal', 'bold', defaults to "normal".
     * @param {number} [options.fontSize] - The size the font will be rendered into to the texture atlas at, defaults to 32.
     * @param {Color} [options.color] - The color the font will be rendered into the texture atlas as, defaults to white.
     * @param {number} [options.width] - The width of each texture atlas, defaults to 512.
     * @param {number} [options.height] - The height of each texture atlas, defaults to 512.
     * @param {number} [options.padding] - Amount of glyph padding added to each glyph in the atlas.
     * @private
     */
    constructor(app, options = {}) {
        super();

        this.type = "bitmap";

        this.app = app;

        this.intensity = 0;

        this.fontWeight = options.fontWeight || 'normal';
        this.fontSize = parseInt(options.fontSize, 10);
        this.glyphSize = this.fontSize;
        this.fontName = options.fontName || 'Arial';
        this.color = options.color || new Color(1, 1, 1);
        this.padding = options.padding || 0;

        const w = options.width > MAX_TEXTURE_SIZE ? MAX_TEXTURE_SIZE : (options.width || DEFAULT_TEXTURE_SIZE);
        const h = options.height > MAX_TEXTURE_SIZE ? MAX_TEXTURE_SIZE : (options.height || DEFAULT_TEXTURE_SIZE);

        // Create a canvas to do the text rendering
        const canvas = document.createElement('canvas');
        canvas.height = h;
        canvas.width = w;

        const texture = new Texture(this.app.graphicsDevice, {
            format: PIXELFORMAT_R8_G8_B8_A8,
            mipmaps: true
        });

        texture.name = 'font';
        texture.setSource(canvas);
        texture.minFilter = FILTER_LINEAR_MIPMAP_LINEAR;
        texture.magFilter = FILTER_LINEAR;
        texture.addressU = ADDRESS_CLAMP_TO_EDGE;
        texture.addressV = ADDRESS_CLAMP_TO_EDGE;

        this.textures = [texture];

        this.chars = "";
        this.data = {};
    }

    /**
     * Render the necessary textures for all characters in a string to be used for the canvas font.
     *
     * @param {string} text - The list of characters to render into the texture atlas.
     * @private
     */
    createTextures(text) {
        const _chars = this._normalizeCharsSet(text);

        // different length so definitely update
        if (_chars.length !== this.chars.length) {
            this._renderAtlas(_chars);
            return;
        }

        // compare sorted characters for difference
        for (let i = 0; i < _chars.length; i++) {
            if (_chars[i] !== this.chars[i]) {
                this._renderAtlas(_chars);
                return;
            }
        }
    }

    /**
     * Update the list of characters to include in the atlas to include those provided and
     * re-render the texture atlas to include all the characters that have been supplied so far.
     *
     * @param {string} text - The list of characters to add to the texture atlas.
     * @private
     */
    updateTextures(text) {
        const _chars = this._normalizeCharsSet(text);
        const newCharsSet = [];

        for (let i = 0; i < _chars.length; i++) {
            const char = _chars[i];
            if (!this.data.chars[char]) {
                newCharsSet.push(char);
            }
        }

        if (newCharsSet.length > 0) {
            this._renderAtlas(this.chars.concat(newCharsSet));
        }
    }

    /**
     * Tears down all resources used by the font.
     *
     * @private
     */
    destroy() {
        // call texture.destroy on any created textures
        for (let i = 0; i < this.textures.length; i++) {
            this.textures[i].destroy();
        }
        // null instance variables to make it obvious this font is no longer valid
        this.chars = null;
        this.color = null;
        this.data = null;
        this.fontName = null;
        this.fontSize = null;
        this.glyphSize = null;
        this.intensity = null;
        this.textures = null;
        this.type = null;
        this.fontWeight = null;
    }

    _getAndClearContext(canvas, clearColor) {
        const w = canvas.width;
        const h = canvas.height;

        const ctx = canvas.getContext('2d', {
            alpha: true
        });

        ctx.clearRect(0, 0, w, h);  // clear to black first to remove everything as clear color is transparent
        ctx.fillStyle = clearColor;
        ctx.fillRect(0, 0, w, h);   // clear to color

        return ctx;
    }

    _colorToRgbString(color, alpha) {
        let str;
        const r = Math.round(255 * color.r);
        const g = Math.round(255 * color.g);
        const b = Math.round(255 * color.b);

        if (alpha) {
            str = `rgba(${r}, ${g}, ${b}, ${color.a})`;
        } else {
            str = `rgb(${r}, ${g}, ${b})`;
        }

        return str;
    }

    renderCharacter(context, char, x, y, color) {
        context.fillStyle = color;
        context.fillText(char, x, y);
    }

    _renderAtlas(charsArray) {
        this.chars = charsArray;

        let numTextures = 1;

        let canvas = this.textures[numTextures - 1].getSource();
        const w = canvas.width;
        const h = canvas.height;

        // fill color
        const color = this._colorToRgbString(this.color, false);

        // generate a "transparent" color for the background
        // browsers seem to optimize away all color data if alpha=0
        // so setting alpha to min value and hope this isn't noticeable
        const a = this.color.a;
        this.color.a = 1 / 255;
        const transparent = this._colorToRgbString(this.color, true);
        this.color.a = a;

        const TEXT_ALIGN = 'center';
        const TEXT_BASELINE = 'alphabetic';

        let ctx = this._getAndClearContext(canvas, transparent);

        ctx.font = this.fontWeight + ' ' + this.fontSize.toString() + 'px ' + this.fontName;
        ctx.textAlign = TEXT_ALIGN;
        ctx.textBaseline = TEXT_BASELINE;

        this.data = this._createJson(this.chars, this.fontName, w, h);

        const symbols = string.getSymbols(this.chars.join(''));
        const prevNumTextures = this.textures.length;

        let maxHeight = 0;
        let maxDescent = 0;
        const metrics = {};
        for (let i = 0; i < symbols.length; i++) {
            const ch = symbols[i];
            metrics[ch] = this._getTextMetrics(ch);
            maxHeight = Math.max(maxHeight, metrics[ch].height);
            maxDescent = Math.max(maxDescent, metrics[ch].descent);
        }

        this.glyphSize = Math.max(this.glyphSize, maxHeight);

        const sx = this.glyphSize + this.padding * 2;
        const sy = this.glyphSize + this.padding * 2;
        const _xOffset = this.glyphSize / 2 + this.padding;
        const _yOffset = sy - maxDescent - this.padding;
        let _x = 0;
        let _y = 0;

        for (let i = 0; i < symbols.length; i++) {
            const ch = symbols[i];
            const code = string.getCodePoint(symbols[i]);

            let fs = this.fontSize;
            ctx.font = this.fontWeight + ' ' + fs.toString() + 'px ' + this.fontName;
            ctx.textAlign = TEXT_ALIGN;
            ctx.textBaseline = TEXT_BASELINE;

            let width = ctx.measureText(ch).width;

            if (width > fs) {
                fs = this.fontSize * this.fontSize / width;
                ctx.font = this.fontWeight + ' ' + fs.toString() + 'px ' + this.fontName;
                width = this.fontSize;
            }

            this.renderCharacter(ctx, ch, _x + _xOffset, _y + _yOffset, color);

            const xoffset = this.padding + (this.glyphSize - width) / 2;
            const yoffset = -this.padding + metrics[ch].descent - maxDescent;
            const xadvance = width;

            this._addChar(this.data, ch, code, _x, _y, sx, sy, xoffset, yoffset, xadvance, numTextures - 1, w, h);

            _x += sx;
            if (_x + sx > w) {
                // Wrap to the next row of this canvas if the right edge of the next glyph would overflow
                _x = 0;
                _y += sy;
                if (_y + sy > h) {
                    // We ran out of space on this texture!
                    // Copy the canvas into the texture and upload it
                    this.textures[numTextures - 1].upload();
                    // Create a new texture (if needed) and continue on
                    numTextures++;
                    _y = 0;
                    if (numTextures > prevNumTextures) {
                        canvas = document.createElement('canvas');
                        canvas.height = h;
                        canvas.width = w;

                        ctx = this._getAndClearContext(canvas, transparent);

                        const texture = new Texture(this.app.graphicsDevice, {
                            format: PIXELFORMAT_R8_G8_B8_A8,
                            mipmaps: true
                        });
                        texture.name = 'font-atlas';
                        texture.setSource(canvas);
                        texture.minFilter = FILTER_LINEAR_MIPMAP_LINEAR;
                        texture.magFilter = FILTER_LINEAR;
                        texture.addressU = ADDRESS_CLAMP_TO_EDGE;
                        texture.addressV = ADDRESS_CLAMP_TO_EDGE;
                        this.textures.push(texture);
                    } else {
                        canvas = this.textures[numTextures - 1].getSource();
                        ctx = this._getAndClearContext(canvas, transparent);
                    }
                }
            }
        }
        // Copy any remaining characters in the canvas into the last texture and upload it
        this.textures[numTextures - 1].upload();

        // Cleanup any remaining (unused) textures
        if (numTextures < prevNumTextures) {
            for (let i = numTextures; i < prevNumTextures; i++) {
                this.textures[i].destroy();
            }
            this.textures.splice(numTextures);
        }

        // alert text-elements that the font has been re-rendered
        this.fire("render");
    }

    _createJson(chars, fontName, width, height) {
        const base = {
            "version": 3,
            "intensity": this.intensity,
            "info": {
                "face": fontName,
                "width": width,
                "height": height,
                "maps": [{
                    "width": width,
                    "height": height
                }]
            },
            "chars": {}
        };

        return base;
    }

    _addChar(json, char, charCode, x, y, w, h, xoffset, yoffset, xadvance, mapNum, mapW, mapH) {
        if (json.info.maps.length < mapNum + 1) {
            json.info.maps.push({ "width": mapW, "height": mapH });
        }

        const scale = this.fontSize / 32;

        json.chars[char] = {
            "id": charCode,
            "letter": char,
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "xadvance": xadvance / scale,
            "xoffset": xoffset / scale,
            "yoffset": (yoffset + this.padding) / scale,
            "scale": scale,
            "range": 1,
            "map": mapNum,
            "bounds": [0, 0, w / scale, h / scale]
        };
    }


    // take a unicode string and produce
    // the set of characters used to create that string
    // e.g. "abcabcabc" -> ['a', 'b', 'c']
    _normalizeCharsSet(text) {
        // normalize unicode if needed
        const unicodeConverterFunc = this.app.systems.element.getUnicodeConverter();
        if (unicodeConverterFunc) {
            text = unicodeConverterFunc(text);
        }
        // strip duplicates
        const set = {};
        const symbols = string.getSymbols(text);
        for (let i = 0; i < symbols.length; i++) {
            const ch = symbols[i];
            if (set[ch]) continue;
            set[ch] = ch;
        }
        const chars = Object.keys(set);
        // sort
        return chars.sort();
    }

    // Calculate some metrics that aren't available via the
    // browser API, notably character height and descent size
    _getTextMetrics(text) {
        const textSpan = document.createElement('span');
        textSpan.id = 'content-span';
        textSpan.innerHTML = text;

        const block = document.createElement("div");
        block.id = 'content-block';
        block.style.display = 'inline-block';
        block.style.width = '1px';
        block.style.height = '0px';

        const div = document.createElement('div');
        div.appendChild(textSpan);
        div.appendChild(block);
        div.style.font = this.fontSize + 'px ' + this.fontName;

        const body = document.body;
        body.appendChild(div);

        let ascent = -1;
        let descent = -1;
        let height = -1;

        try {
            block.style['vertical-align'] = 'baseline';
            ascent = block.offsetTop - textSpan.offsetTop;
            block.style['vertical-align'] = 'bottom';
            height = block.offsetTop - textSpan.offsetTop;
            descent = height - ascent;
        } finally {
            document.body.removeChild(div);
        }

        return {
            ascent: ascent,
            descent: descent,
            height: height
        };
    }
}

export { CanvasFont };
