/**
 * Author: Mycolaos - mycolaos.com
 * 
 * Please, keep this small credit in the code, thank you! 🤝
 */

const defaultCssVars = {
  '--base-ice-color': '255, 255, 255',
  '--base-ice-opacity': '.15',
  '--base-z-index': 'auto',
};

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
    
    /* Base state variables. It allows us to use it as default for both current
     * and melted states. E.g. creating a direct dependency between --ice-color
     * and --melted-ice-color (or other vars) would short circuit the value and
     * not work, thus we use base variables as intermediaries. */
    --base-ice-color: ${defaultCssVars['--base-ice-color']};
    --base-ice-opacity: ${defaultCssVars['--base-ice-opacity']};
    --base-z-index: ${defaultCssVars['--base-z-index']};

    /* Current state variables. This changes based on the element's state. */
    --ice-color: var(--base-ice-color);
    --ice-opacity: var(--base-ice-opacity);
    --z-index: var(--base-z-index);

    /* Melted state variables. This can be set as desired, but don't depend on
     *--ice-color, --ice-opacity, or --z-index etc, because it would create a
     * circular dependency. */
    --melted-ice-color: var(--base-ice-color);
    --melted-ice-opacity: var(--base-ice-opacity);
    --melted-z-index: var(--base-z-index);

    /** The effect shouldn't interfere with the pointer events of the underlying content. */
    /** Use events on parent element instead of the glass element */
    pointer-events: none;

    z-index: var(--z-index);
    display: block;
    position: absolute;

    inset: var(--top-border-offset) var(--right-border-offset)
      var(--bottom-border-offset) var(--left-border-offset);

    /** Glass */
    background-color: rgba(var(--ice-color), var(--ice-opacity));
    border: 2px solid rgba(var(--ice-color), calc(var(--ice-opacity) * 3.33));
    box-shadow: 0 0 5px rgba(var(--ice-color), calc(var(--ice-opacity) * 3.33)),
      inset 0 0 5px 2px rgba(var(--ice-color), calc(var(--ice-opacity) * 3.33));
    transition: all 0.5s ease;
    filter: blur(0.5px);

    /** Lucidity pattern */
    background-image: repeating-linear-gradient(
      -45deg,
      rgba(var(--ice-color),  calc(var(--ice-opacity) * 1.66)),
      rgba(var(--ice-color), var(--ice-opacity)) 1px,
      transparent 1px,
      transparent 6px,

      rgba(var(--ice-color), calc(var(--ice-opacity) * 1.66)) 9px,
      transparent 11px,
      transparent 17px,

      rgba(var(--ice-color), calc(var(--ice-opacity) * 1.66)) 19px,
      transparent 20px,
      transparent 23px
    );
    background-size: 100% 100%;
  }

  :host(:state(melted)) frosted-glass-inner {
    --ice-color: var(--melted-ice-color, var(--base-ice-color));
    --ice-opacity: var(--melted-ice-opacity, var(--base-ice-opacity));
    --z-index: var(--melted-z-index, var(--base-z-index));

    box-shadow: 0 0 8px rgba(var(--ice-color), calc(var(--ice-opacity) * 3.33)),
      inset 0 0 3px 0 rgba(var(--ice-color), calc(var(--ice-opacity) * 3.33));
  }
`);

class FrostedGlass extends HTMLElement {
  initialParentPosition = null;
  parentPositionSetByUs = 'relative';

  // Observe the 'color-rgb', 'opacity', and 'z-index' attributes for changes
  static get observedAttributes() {
    // Add melted-* attributes for each existing attribute
    const attrs = ['color-rgb', 'opacity', 'z-index'];
    return [
      ...attrs,
      ...attrs.map(attr => `melted-${attr}`)
    ];
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

    this.applyAttributes();
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
    this.applyAttributes();
  }

  applyAttributes() {
    for (const attr of this.constructor.observedAttributes) {
      const value = this.getAttribute(attr);
      const isMeltedAttr = attr.startsWith('melted-');
      const attrName = isMeltedAttr ? attr.replace('melted-', '') : attr;

      switch (attrName) {
        case 'color-rgb':
          if (value === null || value === undefined || value === '') {
            if (isMeltedAttr) {
              this._inner.style.removeProperty('--melted-ice-color');
            } else {
              this._inner.style.setProperty('--base-ice-color', defaultCssVars['--base-ice-color']);
            }
            continue;
          }

          // Validate the format: "r,g,b" where r,g,b are 0-255
          const rgbPattern = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/;
          const match = value.match(rgbPattern);
          if (!match) {
            console.error(`${attr} attribute must be in the format "r,g,b" with values between 0 and 255`);
            continue;
          }

          const [r, g, b] = match.slice(1, 4);
          const cssVar = isMeltedAttr ? '--melted-ice-color' : '--base-ice-color';
          this._inner.style.setProperty(cssVar, `${r}, ${g}, ${b}`);
          continue;

        case 'opacity':
          if (value === null || value === undefined || value === '') {
            if (isMeltedAttr) {
              this._inner.style.removeProperty('--melted-ice-opacity');
            } else {
              this._inner.style.setProperty('--base-ice-opacity', defaultCssVars['--base-ice-opacity']);
            }
            continue;
          }

          const num = parseFloat(value);
          if (isNaN(num)) {
            console.error(`${attr} attribute must be a number.`);
            continue;
          }

          const opacityVar = isMeltedAttr ? '--melted-ice-opacity' : '--base-ice-opacity';
          this._inner.style.setProperty(opacityVar, num);
          continue;

        case 'z-index':
          if (value === null || value === undefined || value === '') {
            if (isMeltedAttr) {
              this._inner.style.removeProperty('--melted-z-index');
            } else {
              this._inner.style.setProperty('--base-z-index', defaultCssVars['--base-z-index']);
            }
            continue;
          }

          const zIndexVar = isMeltedAttr ? '--melted-z-index' : '--base-z-index';
          this._inner.style.setProperty(zIndexVar, value);
          continue;
      }
    }
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