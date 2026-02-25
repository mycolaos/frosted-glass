const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host, frosted-glass-inner {
    /** Take the shape of the parent element */
    border-radius: inherit;
  }

  frosted-glass-inner {
    --top-border-offset: 0;
    --right-border-offset: 0;
    --bottom-border-offset: 0;
    --left-border-offset: 0;
    --ice-color: 255, 255, 255;
    --on-light-ice-color: 0, 187, 255;
    --ice-opacity: 1;

    /** The effect shouldn't interfere with the pointer events of the underlying content. */
    /** Use events on parent element instead of the glass element */
    pointer-events: none;

    display: block;
    position: absolute;

    inset: var(--top-border-offset) var(--right-border-offset)
      var(--bottom-border-offset) var(--left-border-offset);

    /** Glass */
    background-color: rgba(var(--ice-color), calc(var(--ice-opacity) * 0.15));
    border: 2px solid rgba(var(--ice-color), calc(var(--ice-opacity) * 0.5));
    box-shadow: 0 0 5px rgba(var(--ice-color), calc(var(--ice-opacity) * 0.5)),
      inset 0 0 5px 2px rgba(var(--ice-color), calc(var(--ice-opacity) * 0.5));
    transition: all 0.5s ease;
    filter: blur(0.5px);

    /** Lucidity pattern */
    background-image: repeating-linear-gradient(
      -45deg,
      rgba(var(--ice-color),  calc(var(--ice-opacity) * 0.25)),
      rgba(var(--ice-color), calc(var(--ice-opacity) * 0.15)) 1px,
      transparent 1px,
      transparent 6px,

      rgba(var(--ice-color), calc(var(--ice-opacity) * 0.25)) 9px,
      transparent 11px,
      transparent 17px,

      rgba(var(--ice-color), calc(var(--ice-opacity) * 0.25)) 19px,
      transparent 20px,
      transparent 23px
    );
    background-size: 100% 100%;
  }

  :host([on-light]) frosted-glass-inner {
    filter: blur(1px);
    --ice-color: var(--on-light-ice-color);
  }
  :host(:state(melted)) frosted-glass-inner {
    box-shadow: 0 0 8px rgba(var(--ice-color), 0.5),
      inset 0 0 3px 0 rgba(var(--ice-color), 0.5);
  }
`);

class FrostedGlass extends HTMLElement {
  initialParentPosition = null;
  parentPositionSetByUs = 'relative';

  // Observe the 'colorRGB', 'opacity-coefficient', and 'z-index' attributes for changes
  static get observedAttributes() {
    return ['colorRGB', 'opacity-coefficient', 'z-index'];
  }
  /**
   * Gets the z-index attribute value.
   */
  get zIndex() {
    return this.getAttribute('z-index');
  }

  /**
   * Sets the z-index attribute value.
   */
  set zIndex(value) {
    if (value !== null && value !== undefined) {
      this.setAttribute('z-index', value);
    } else {
      this.removeAttribute('z-index');
    }
  }

  get melted() {
    return this._internals.states.has("melted");
  }

  set melted(value) {
    if (value) {
      this._internals.states.add("melted");
    } else {
      this._internals.states.delete("melted");
    }
  }

  /**
   * Gets the colorRGB attribute value.
   */
  get colorRGB() {
    return this.getAttribute('colorRGB');
  }

  /**
   * Sets the colorRGB attribute value.
   */
  set colorRGB(value) {
    if (value) {
      this.setAttribute('colorRGB', value);
    } else {
      this.removeAttribute('colorRGB');
    }
  }

  /**
   * Gets the opacity-coefficient attribute value.
   */
  get opacityCoefficient() {
    return this.getAttribute('opacity-coefficient');
  }

  /**
   * Sets the opacity-coefficient attribute value.
   */
  set opacityCoefficient(value) {
    if (value !== null && value !== undefined) {
      this.setAttribute('opacity-coefficient', value);
    } else {
      this.removeAttribute('opacity-coefficient');
    }
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.adoptedStyleSheets = [sheet];
    // Create the inner div for the frosted glass effect
    this._inner = document.createElement('frosted-glass-inner');
    shadow.appendChild(this._inner);
    this._internals = this.attachInternals();
  }

  connectedCallback() {
    // * Because we disabled `pointer-events` on our element, we listen to the
    // * events on the parent element. It's useful for hover effects.
    this.parentElement.addEventListener('pointerenter', this.onPointerEnter);
    this.parentElement.addEventListener('pointerleave', this.onPointerLeave);
    // Register the initial position of the parent element, so we can revert it
    // back.
    this.initialParentPosition = this.parentElement.style.position;
    // If the element is not positioned, set it to relative. We need this to
    // position the glass element properly.
    if (getComputedStyle(this.parentElement).position === 'static') {
      this.parentElement.style.position = this.parentPositionSetByUs;
    }

    // Set the parent element border offsets to the glass element. Normally,
    // the `inset` values that used for absolute positioning are relative to
    // the parents content box which doesn't include borders. We want the
    // effect to overlay the border too, so we calculate an offset.
    const borderSize = FrostedGlass.getSizeOfBorders(this.parentElement);
    // Set CSS variables on the inner div instead of the host
    this._inner.style.position = 'absolute';
    this._inner.style.setProperty('--top-border-offset', '-' + borderSize.top);
    this._inner.style.setProperty('--right-border-offset', '-' + borderSize.right);
    this._inner.style.setProperty('--bottom-border-offset', '-' + borderSize.bottom);
    this._inner.style.setProperty('--left-border-offset', '-' + borderSize.left);

    // If colorRGB attribute is present, set the --ice-color CSS variable
    if (this.colorRGB) {
      this.setIceColorFromAttribute(this.colorRGB);
    }

    // If opacity-coefficient attribute is present, set the --ice-opacity CSS
    // variable
    if (this.opacityCoefficient) {
      this.setIceOpacityFromAttribute(this.opacityCoefficient);
    }

    // If z-index attribute is present, set the z-index style
    if (this.zIndex) {
      this.setZIndexFromAttribute(this.zIndex);
    }
  }

  disconnectedCallback() {
    this.parentElement.removeEventListener('pointerenter', this.onPointerEnter);
    this.parentElement.removeEventListener('pointerleave', this.onPointerLeave);
    // us or wasn't modified to something else by other means.
    if (this.parentElement && this.parentElement.style.position === this.parentPositionSetByUs) {
      this.parentElement.style.position = this.initialParentPosition;
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'colorRGB') {
      this.setIceColorFromAttribute(newValue);
    } else if (name === 'opacity-coefficient') {
      this.setIceOpacityFromAttribute(newValue);
    } else if (name === 'z-index') {
      this.setZIndexFromAttribute(newValue);
    }
  }
  /**
   * Sets the z-index style property on the inner element from the z-index attribute.
   * Accepts any valid CSS z-index value (number or 'auto').
   */
  setZIndexFromAttribute(value) {
    if (value === null || value === undefined || value === '') {
      this._inner.style.removeProperty('z-index');
      return;
    }
    this._inner.style.zIndex = value;
  }
  /**
   * Sets the --ice-opacity CSS variable from the opacity-coefficient attribute.
   * Accepts a number greater or equal to 0.
   */
  setIceOpacityFromAttribute(value) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      console.error('opacity-coefficient attribute must be a number greater or equal to 0.');
      return;
    }
    this._inner.style.setProperty('--ice-opacity', num);
  }

  /**
   * Sets the --ice-color CSS variable on the inner element if the value is a valid RGB string.
   * Only accepts the format "r,g,b" where r, g, b are integers 0-255.
   */
  setIceColorFromAttribute(value) {
    if (typeof value !== 'string') {
      console.error('colorRGB attribute must be a string in the format "r,g,b"');
      return;
    };
    // Validate the format: "r,g,b" where r,g,b are 0-255
    const rgbPattern = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/;
    const match = value.match(rgbPattern);
    if (!match) {
      console.error('colorRGB attribute must be in the format "r,g,b" with values between 0 and 255');
      return;
    }

    const [r, g, b] = match.slice(1, 4);
    this._inner.style.setProperty('--ice-color', `${r}, ${g}, ${b}`);
  }

  static getSizeOfBorders(el) {
    if (!el) {
      return {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
      };
    }

    return {
      top: getComputedStyle(el).borderTopWidth,
      right: getComputedStyle(el).borderRightWidth,
      bottom: getComputedStyle(el).borderBottomWidth,
      left: getComputedStyle(el).borderLeftWidth,
    };
  }

  onPointerEnter = () => {
    // Set component state to `melted`.
    this.melted = true;
  }

  onPointerLeave = () => {
    // Remove the `melted` state.
    this.melted = false;
  }
}

customElements.define("frosted-glass", FrostedGlass);