# <frosted-glass></frosted-glass> Web Component
This effect creates a frosted glass appearance over any element, simulating the look of ice crystals forming on a cold window. It uses a combination of blur, subtle noise, and crystalline patterns to achieve a realistic icy overlay.

## Features

- Realistic frosted glass effect using blur and crystalline patterns
- Subtle melting animation on hover
- Lightweight and easy to integrate
- No external dependencies

## Component API

### Attributes

- `color`: Sets the color of the frosted glass effect. Accepts `r,g,b` value. For example, `color="255,0,0"` for red. Default is `255, 255, 255` (white).
- `on-light`: Convenience attribute, sets the color to `0, 187, 255` (light blue) for a bright, icy look, convenient for elements with white or very light backgrounds.
- `opacity-coefficient`: Adjusts the opacity of the frosted effect. Accepts a numeric greater or equal to 0.
- `z-index`: Sets the z-index of the frosted glass layer. Accepts any valid CSS z-index value (number or 'auto').

## Usage
1. Include the `frosted-glass.js` script in your HTML file:
```html
<script src="frosted-glass.js"></script>
```
2. Use the `<frosted-glass>` tag inside elements you want to apply the frosted glass effect to:
```html
<button class="frosty-button">
  <!-- Your content here -->
  <frosted-glass></frosted-glass>
</button>

<button class="button-with-white-background">
  <!-- Your content here -->
  <frosted-glass on-light></frosted-glass>
</button>

<p>
  Some text with a frosted glass effect.
  <frosted-glass color="0, 200, 255" opacity-coefficient="0.5"></frosted-glass>
</p>
```

