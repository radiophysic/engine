import { Component } from '../component.js';

/** @typedef {import('../../entity.js').Entity} Entity */
/** @typedef {import('./system.js').LayoutChildComponentSystem} LayoutChildComponentSystem */

/**
 * A LayoutChildComponent enables the Entity to control the sizing applied to it by its parent
 * {@link LayoutGroupComponent}.
 *
 * @property {number} minWidth The minimum width the element should be rendered at.
 * @property {number} minHeight The minimum height the element should be rendered at.
 * @property {number} maxWidth The maximum width the element should be rendered at.
 * @property {number} maxHeight The maximum height the element should be rendered at.
 * @property {number} fitWidthProportion The amount of additional horizontal space that the element
 * should take up, if necessary to satisfy a Stretch/Shrink fitting calculation. This is specified
 * as a proportion, taking into account the proportion values of other siblings.
 * @property {number} fitHeightProportion The amount of additional vertical space that the element
 * should take up, if necessary to satisfy a Stretch/Shrink fitting calculation. This is specified
 * as a proportion, taking into account the proportion values of other siblings.
 * @property {boolean} excludeFromLayout If set to true, the child will be excluded from all layout
 * calculations.
 * @augments Component
 */
class LayoutChildComponent extends Component {
    /**
     * Create a new LayoutChildComponent.
     *
     * @param {LayoutChildComponentSystem} system - The ComponentSystem that created this
     * Component.
     * @param {Entity} entity - The Entity that this Component is attached to.
     */
    constructor(system, entity) {
        super(system, entity);

        this._minWidth = 0;
        this._minHeight = 0;
        this._maxWidth = null;
        this._maxHeight = null;
        this._fitWidthProportion = 0;
        this._fitHeightProportion = 0;
        this._excludeFromLayout = false;
    }
}

function defineResizeProperty(name) {
    const _name = '_' + name;

    Object.defineProperty(LayoutChildComponent.prototype, name, {
        get: function () {
            return this[_name];
        },

        set: function (value) {
            if (this[_name] !== value) {
                this[_name] = value;
                this.fire('resize');
            }
        }
    });
}

defineResizeProperty('minWidth');
defineResizeProperty('minHeight');
defineResizeProperty('maxWidth');
defineResizeProperty('maxHeight');
defineResizeProperty('fitWidthProportion');
defineResizeProperty('fitHeightProportion');
defineResizeProperty('excludeFromLayout');

export { LayoutChildComponent };
