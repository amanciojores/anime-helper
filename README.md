# AnimeHelper.js

#### Version: 4.8.6

A high-level utility class to simplify and streamline the creation of complex, modern animations using Anime.js. This helper abstracts common animation patterns like scroll-triggered reveals, text splitting, timeline orchestration, and element pinning into a declarative, easy-to-use API.

## Features

- Declarative API: Create complex animations with a single, readable configuration object.
- Universal Scroll Triggers: Add scroll-triggered "reveal" or "scrubbing" animations to any animation type.
- Advanced Text Splitting: Animate text by characters, words, or lines, including multi-layered timeline-based text effects.
- CSS-First Pinning: Easily create "sticky" scrolling sections where an animation scrubs its progress.
- Powerful Timeline Builder: Construct complex, multi-step timelines, including support for syncing reusable animation instances.
- Instance Management: Create reusable, controllable animation instances and manage them globally with static methods (.get(), .play(), .killAll(), etc.).
- Extensible Presets: A simple system to add your own reusable animation presets.

## Setup

The AnimeHelper class works in both modern module and traditional script environments.

#### Option 1: As a Module (Recommended)

This is the modern, recommended approach.

1. Include Files: Make sure you are properly importing the latest `anime.js` module via CDN or local file import and anime-helper.js are available to your project.

```html
<script type="module" src="anime.esm.js"></script>
```

- OR

```html
<script type="module">
  import { animate } from "https://cdn.jsdelivr.net/npm/animejs/+esm";
</script>
```

- OR via `npm install animejs`

2. Import and Initialize: In your main script, import both libraries and create a new helper instance.

```javascript
// In your-main-script.js
import anime from "./anime.esm.js";
import AnimeHelper from "./anime-helper.js";

const helper = new AnimeHelper(anime);
```

3. Link HTML: Include your main script in your HTML file with type="module".

```html
<script type="module" src="your-main-script.js"></script>
```

#### Option 2: As a Standard Script (Non-Module)

1. Include the Scripts: Add the scripts to your HTML using standard `<script>` tags. Make sure `anime-helper.js` comes after anime.js.

```html
<script src="anime.js"></script>
<script src="anime-helper.js"></script>
<script src="your-main-script.js"></script>
```

2. Initialize the Helper: In your main script, AnimeHelper will be available on the global window object.

```javascript
// In your-main-script.js
const helper = new AnimeHelper(window.anime);
```

## Usage

The core of the library is the `helper.observe(targets, config)` method.

#### Basic Animation

This is the default behavior if no `type` is specified.

```javascript
helper.observe(".my-box", {
  params: {
    translateX: 250,
    rotate: "1turn",
    duration: 800,
  },
});
```

#### Text Animation (`type: 'splitText'`)

```javascript
helper.observe(".my-title", {
  type: "splitText",
  splitBy: "chars", // 'words' or 'lines. Supports array ['words', 'chars', 'lines]
  splitParams: {
    from: "bottom", // 'top', 'left', 'right'
    stagger: 30,
    distance: "1em",
  },
  params: {
    duration: 800,
    ease: "easeOutQuint",
  },
});
```

#### Scroll-Triggered Animations

You can add a scrollParams object to any animation type to make it scroll-triggered.

#### Reveal Animation (Plays on Enter)

This is the default scroll behavior. The animation plays when it enters the viewport.

```javascript
helper.observe(".fade-in-card", {
  type: "default", // Can be any type
  preset: "fadeIn",
  scrollParams: {
    enter: "start 80%", // Target's top hits 80% down the viewport
    once: true, // Only play the animation once
    resetOnLeave: true, // Reset the animation when it scrolls out of view
  },
});
```

#### Scrubbing Animation (Syncs with Scroll)

To make an animation's progress directly match the scrollbar position, add `sync: true`.

```javascript
helper.observe(".progress-bar", {
  type: "default",
  params: {
    scaleX: [0, 1],
  },
  scrollParams: {
    sync: true, // This enables scrubbing
    enter: "top bottom", // Starts when element top hits viewport bottom
    leave: "bottom top", // Ends when element bottom hits viewport top
  },
});
```

#### Pinning (`pin: true`)

Create a "sticky" section where an animation scrubs while the user scrolls.

```javascript
helper.observe(".pin-container", {
  pin: true,
  pinParams: {
    target: ".element-to-make-sticky",
    animationTarget: ".element-to-animate-inside",
    duration: "200vh", // Pin will last for 200% of the viewport height. Supports relative values like +=, -=. (*= not yet supported)
    start: "0px",
  },
  params: {
    rotate: 360,
    easing: "linear",
  },
});
```

#### Timelines (type: 'timeline')

Build complex, multi-step animation sequences.

```javascript
// First, create a reusable animation
const reusableAnim = helper.observe(".reusable-box", {
  reusable: true, // This sets autoplay: false
  params: { scale: 1.2 },
});

helper.observe(null, {
  type: "timeline",
  params: { loop: true, direction: "alternate" },
  steps: [
    // Step 1: Build from a config object
    {
      target: ".box-1",
      params: { translateX: 250, duration: 500 },
    },
    // Step 2: Sync a pre-built, reusable animation instance
    {
      instance: reusableAnim,
      offset: "<", // Start when the previous animation ends
    },
  ],
});
```

#### Reusable Animations & Instance Control

Create animations that don't play immediately and control them with static methods.

```javascript
// 1. Create a reusable animation instance
helper.observe(".my-interactive-element", {
  reusable: true, // Sets autoplay: false
  params: {
    scale: [1, 1.2],
    duration: 300,
  },
});
// 2. Control it later from anywhere in your code
const button = document.querySelector("#my-button");
button.addEventListener("click", () => {
  // Use the static .get() method to retrieve and control the instance
  AnimeHelper.get(".my-interactive-element").restart();
});
```

- `observe()`also returns animation instance. You can use assign an animation instance to a variable instead of using `get()`

```javascript
const myInteractiveElement = helper.observe('.my-interactive-element', {...});
console.log(myInteractiveElement); // Log animation instance
```

### Creating Custom Presets

You can extend the helper with your own reusable animation presets.

#### 1. Define the Preset

Use the static `addPreset()` method to define your animation. A preset is a function that receives the user's `config` object and must return an anime.js parameter object.

```javascript
// Define a new 'shake' preset
AnimeHelper.addPreset("shake", (config) => {
  // You can read from the user's config to make the preset dynamic
  const intensity = config.intensity || 10;

  return {
    translateX: [
      { value: intensity * -1, duration: 50, easing: "easeInOutQuad" },
      { value: intensity, duration: 50, easing: "easeInOutQuad" },
      { value: intensity * -0.5, duration: 50, easing: "easeInOutQuad" },
      { value: intensity * 0.5, duration: 50, easing: "easeInOutQuad" },
      { value: 0, duration: 250, easing: "easeOutQuad" },
    ],
    duration: 500, // Default duration for the shake
  };
});
```

#### 2. Use the Preset

Now you can use `preset: 'shake'` in any `observe` call. The preset's parameters will be automatically merged, and you can override them in the `params` object.

```javascript
// Use the custom 'shake' preset
helper.observe(".form-error", {
  preset: "shake",
  intensity: 5, // Pass a custom property to the preset
  params: {
    duration: 700, // Override the preset's default duration
  },
});
```

## API Reference

`helper.observe(targets, config)`

This is the core method for creating all animations.

- `targets` (`String|HTMLElement|NodeList`): The primary element(s) for the effect. For `pin` and container-based `scroll` animations, this is the container/track element.
- `config` (`Object`): The main configuration object that defines the animation's behavior.

`config` Object Properties
| Property | Type | Description |
| :--- | :---- | :--- |
| `type` | `String` | Optional. The type of animation to create. Can be `'default' or null or omitted`, `'splitText'`, `'timeline'`, `'scroll'`, `'pin'`. Defaults to `'default'`. |
| `pin` | `Boolean` | If true, enables the pinning feature. This forces the animation to be a `type: 'scroll'` scrubbing animation. |
| `reusable` | `Boolean` | If true, creates the animation with autoplay: false, making it a reusable instance that can be controlled manually. |
| `animationTarget` | `String` | Optional selector for type: 'scroll'. Specifies the child element(s) to animate while the main targets element is used as the scroll track. (can also use `target` or `targets` inside `pinParams`) |
| `params` | `Object` | The standard [anime.js](https://animejs.com/) parameters for the animation (e.g., `translateX`, `duration`, `easing`). |
| `scrollParams` | `Object` | Configuration for the [anime.js scroll observer](https://animejs.com/documentation/scroll). Adding this to any non-scroll type makes it scroll-triggered. |
| `pinParams` | `Object` | Configuration for the pinning effect. Used only when `pin: true`. (e.g., `{ duration: '200vh', target: '.sticky-child' }`). `duration` supports relative values. |
| `splitParams` | `Object` | Configuration for `type: 'splitText'`. (e.g., `{ from: 'bottom', stagger: 50 }`) |
| `timelineParams` | `Object` | Configuration for `type: 'timeline'`. The steps array is the most important property here. |

#### Static Control Methods

These methods are called directly on the AnimeHelper class (e.g., AnimeHelper.get(...)) to control named animation instances created with string selectors.

| Method                          | Description                                                            |
| :------------------------------ | :--------------------------------------------------------------------- |
| `AnimeHelper.get(selector)`     | Retrieves a stored animation instance by its selector.                 |
| `AnimeHelper.getAll()`          | Retrieves the entire Map of all stored instances.                      |
| `AnimeHelper.play(selector)`    | Plays a specific animation instance.                                   |
| `AnimeHelper.playAll()`         | Plays all stored animation instances.                                  |
| `AnimeHelper.pause(selector)`   | Pauses a specific animation instance.                                  |
| `AnimeHelper.pauseAll()`        | Pauses all stored animation instances.                                 |
| `AnimeHelper.restart(selector)` | Restarts a specific animation instance from the beginning.             |
| `AnimeHelper.restartAll()`      | Restarts all stored animation instances.                               |
| `AnimeHelper.kill(selector)`    | Kills and reverts a specific animation instance, removing its effects. |
| `AnimeHelper.killAll()`         | Kills and reverts all stored animation instances.                      |
