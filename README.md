# AnimeHelper - A GSAP-like Helper for Anime.js

AnimeHelper is a professional-grade toolkit for the Anime.js library (v4+). It provides a high-level, declarative API for creating complex, scroll-triggered, and interactive web animations with a strong focus on performance and ease of use, closely mirroring the developer experience of GSAP's ScrollTrigger plugin.

This class manages a single, optimized scroll listener for the entire page, ensuring smooth performance even with many animations.

## Features

- GSAP-like ScrollTrigger: Create animations that are controlled by the user's scroll position.
- Pinning: Lock an element to the screen for a specific scroll duration.
- Scrubbing: Link an animation's progress directly to the scrollbar.
- Declarative API: Define complex animations with a simple configuration object.
- Built-in & Custom Presets: Use pre-made animations or easily add your own.
- Full Animation Control: Public methods (play, pause, restart, seek) and global controls (pauseAll, killAll) for managing animations from anywhere in your code.
- SPA Ready: Includes a refresh() method to update animations after dynamic content changes.
- Performance Optimized: Uses requestAnimationFrame and passive listeners for smooth, jank-free scrolling.
- Debug Markers: Visually debug your scroll trigger start and end points.

## Setup

1. Include Anime.js: Make sure you have Anime.js v4.1.3 or higher included in your project.

```
<!-- ANIME.JS v4.1.3 (IIFE Global Build) -->
<script src="https://cdn.jsdelivr.net/npm/animejs@4.1.3/lib/anime.iife.min.js"></script>
```

2. Include AnimeHelper: Add the anime-helper.js script to your page.

```
<script src="path/to/anime-helper.js"></script>
```

## Usage/Examples

1. Initialize the Helper: Create a new instance of the class, typically after the DOM has loaded.

```javascript
document.addEventListener("DOMContentLoaded", () => {
  const helper = new AnimeHelper();

  // Your animation code here...
});
```

2. Observe an Element: Use the observe() method to target an element and apply an animation.

```javascript
helper.observe(".my-element", {
  preset: "fadeIn", // Use a built-in preset
  scrollTrigger: {
    start: "top 80%", // Start when the top of the element is 80% down the viewport
    markers: true, // Show debug markers
  },
});
```

## API Reference

`new AnimeHelper()`

Creates a new instance of the helper and sets up the global scroll/resize listeners. You typically only need one instance per page.

`helper.observe(target, config)`

This is the main method for creating scroll-based animations.

- `target`: A CSS selector string, an array of selectors, or a DOM element.

#### Config Object Properties:

| Property        | Type     | Description                                                                                           |
| :-------------- | :------- | :---------------------------------------------------------------------------------------------------- |
| `preset`        | `string` | The name of a built-in or custom preset to use (e.g., `'fadeIn'`).                                    |
| `params`        | `object` | An Anime.js parameters object for custom animations.                                                  |
| `type`          | `string` | Special animation type. Can be `'stagger'` or `'text'`.                                               |
| `childSelector` | `string` | **Required** if `type: 'stagger'`. A CSS selector for the children to stagge                          |
| `scrollTrigger` | `object` | An object to configure the scroll-based behavior. See details below.                                  |
| `subTimeline`   | `object` | Defines a secondary animation on a child element.                                                     |
| `controls`      | `object` | Defines interactive controls like `{ onClick: 'restart' }`.                                           |
| `onUpdate`      | `string` | A callback function that fires every frame of the animation. Receives `(element, animationInstance)`. |
| `id`            | `string` | **Required**. Id of item to fetch                                                                     |
| `id`            | `string` | **Required**. Id of item to fetch                                                                     |

#### The scrollTrigger Object:

| Property  | Type      | Description                                                                                                                  |
| :-------- | :-------- | :--------------------------------------------------------------------------------------------------------------------------- |
| `start`   | `string`  | The trigger point. Format: `"[elementEdge] [viewportEdge]"`. Default: `'top bottom'`. Examples: `'top top'`, `'center 80%'`. |
| `end`     | `string`  | The end point for the scroll animation. Can be absolute (`'bottom top'`) or relative to the start (`'+=500'`, `'+=100%'`)    |
| `pin`     | `boolean` | If `true`, the element will be pinned to the screen for the duration of the scroll trigger.                                  |
| `scrub`   | `boolean` | If `true`, the animation's progress is directly linked to the scroll position..                                              |
| `markers` | `boolean` | If `true`, visual markers for the start and end points will be displayed on the page.                                        |

#### Instance Controls

These methods allow you to control animations on specific targets. All are chainable.

- `helper.play('.my-element')`
- `helper.pause('.my-element')`
- `helper.reverse('.my-element')`
- `helper.restart('.my-element')`
- `helper.seek('.my-element', '50%')`
- `helper.refresh()`: Recalculates all scroll trigger positions.

### Static API

These methods can be called directly on the class for one-off animations not tied to the helper's scroll functionality.

- `AnimeHelper.to(target, params)`
- `AnimeHelper.from(target, params)`
- `AnimeHelper.fromTo(target, fromParams, toParams)`
- `AnimeHelper.timeline(params)`
- `AnimeHelper.addPreset(name, presetFunction)`

### Global Controls

- `AnimeHelper.pauseAll()`: Pauses every animation on the page.
- `AnimeHelper.playAll()`: Resumes every animation on the page.
- `AnimeHelper.restartAll()`: Restarts every animation on the page.
- `AnimeHelper.killAll()`: Destroys all helper instances and removes all animations/listeners.

## Advanced Example

This example pins a container to the top of the screen and then scrubs through an animation as the user scrolls.

```javascript
helper.observe(".my-pinned-section", {
  type: "timeline",
  params: {
    steps: [
      {
        target: ".my-pinned-section .title",
        params: {
          scale: [1, 1.5],
          opacity: [1, 0],
        },
      },
      {
        target: ".my-pinned-section .image",
        params: {
          rotate: 360,
        },
        offset: "-=500", // Overlap the animations
      },
    ],
  },
  scrollTrigger: {
    pin: true,
    scrub: true,
    start: "top top",
    end: "+=200%", // Pin for a scroll distance equal to 200% of the viewport height
    markers: true,
  },
});
```
