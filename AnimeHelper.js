/**
 * @class AnimeHelper
 * A professional-grade toolkit for the Anime.js library (v4+ compliant).
 * This class provides a high-level, declarative API for creating complex, scroll-triggered,
 * and interactive web animations with a strong focus on performance and ease of use.
 * @version 5.6 (Production Ready) - Added auto-refresh on window.load for stability.
 * @license MIT
 */
class AnimeHelper {
  // --- STATIC PROPERTIES & METHODS (Anime.js v4+) ---

  /**
   * @private
   * @static
   * @property {AnimeHelper[]} _instances - Tracks all active instances of the AnimeHelper class for global controls.
   */
  static _instances = [];
  /**
   * @private
   * @static
   * @property {Object.<string, function>} _presets - Stores custom animation presets added via `addPreset`.
   */
  static _presets = {};

  /**
   * Creates a standard "to" animation. A static shorthand for `anime.animate()`.
   * @static
   * @param {string|HTMLElement|NodeList} targets - The element(s) to animate.
   * @param {object} params - The Anime.js parameters object.
   * @returns {object} The Anime.js animation instance.
   */
  static to(targets, params) {
    return window.anime.animate(targets, params);
  }

  /**
   * Creates a "from" animation, animating from the given values to the element's current state.
   * @static
   * @param {string|HTMLElement|NodeList} targets - The element(s) to animate.
   * @param {object} params - The Anime.js parameters object defining the starting state.
   * @returns {object} The Anime.js animation instance.
   */
  static from(targets, params) {
    const finalParams = { ...params };
    const animationProps = Object.keys(params).filter(
      (k) =>
        ![
          "targets",
          "duration",
          "easing",
          "delay",
          "endDelay",
          "round",
          "autoplay",
          "loop",
          "direction",
        ].includes(k)
    );
    animationProps.forEach((prop) => {
      const toValue = prop === "opacity" || prop.startsWith("scale") ? 1 : 0;
      finalParams[prop] = [params[prop], toValue];
    });
    return window.anime.animate(targets, finalParams);
  }

  /**
   * Creates a "fromTo" animation from a specified start state to a specified end state.
   * @static
   * @param {string|HTMLElement|NodeList} targets - The element(s) to animate.
   * @param {object} fromParams - The object defining the starting state of the animation.
   * @param {object} toParams - The object defining the ending state and other animation parameters.
   * @returns {object} The Anime.js animation instance.
   */
  static fromTo(targets, fromParams, toParams) {
    const finalParams = { ...toParams };
    const animationProps = Object.keys(toParams).filter(
      (k) =>
        ![
          "targets",
          "duration",
          "easing",
          "delay",
          "endDelay",
          "round",
          "autoplay",
          "loop",
          "direction",
        ].includes(k)
    );
    animationProps.forEach((prop) => {
      if (fromParams.hasOwnProperty(prop)) {
        finalParams[prop] = [fromParams[prop], toParams[prop]];
      }
    });
    return window.anime.animate(targets, finalParams);
  }

  /**
   * Creates a new Anime.js timeline. A static shorthand for `anime.createTimeline()`.
   * @static
   * @param {object} params - The timeline parameters.
   * @returns {object} The Anime.js timeline instance.
   */
  static timeline(params) {
    return window.anime.createTimeline(params);
  }

  /**
   * Adds a custom, reusable animation preset that can be used in configurations.
   * @static
   * @param {string} name - The name of the preset (e.g., 'zoomIn').
   * @param {function} presetFn - A function that takes an options object and returns a valid AnimeHelper config object.
   */
  static addPreset(name, presetFn) {
    AnimeHelper._presets[name] = presetFn;
  }

  // --- GLOBAL CONTROL METHODS ---
  /**
   * Pauses all animations controlled by all AnimeHelper instances.
   * @static
   */
  static pauseAll() {
    AnimeHelper._instances.forEach((instance) =>
      instance.elementMap.forEach((data) => {
        data.instance?.pause();
        data.subInstance?.pause();
      })
    );
  }

  /**
   * Plays (resumes) all animations controlled by all AnimeHelper instances.
   * @static
   */
  static playAll() {
    AnimeHelper._instances.forEach((instance) =>
      instance.elementMap.forEach((data) => {
        data.instance?.play();
        data.subInstance?.play();
      })
    );
  }

  /**
   * Restarts all animations controlled by all AnimeHelper instances from the beginning.
   * @static
   */
  static restartAll() {
    AnimeHelper._instances.forEach((instance) =>
      instance.elementMap.forEach((data) => {
        data.instance?.restart();
        data.subInstance?.restart();
      })
    );
  }

  /**
   * Destroys all AnimeHelper instances, cleaning up all animations, listeners, and elements.
   * @static
   */
  static killAll() {
    while (AnimeHelper._instances.length) {
      AnimeHelper._instances[0].destroy();
    }
  }

  /**
   * Initializes the AnimeHelper instance.
   * Sets up global event listeners for scroll, resize, and page load, and registers the instance for global controls.
   */
  constructor() {
    this.anime = window.anime;
    if (!this.anime) {
      console.error("Anime.js not found.");
      return;
    }
    this.elementMap = new Map();
    this._initializePresets();
    this.isTicking = false;

    this._boundScrollHandler = this._handleScroll.bind(this);
    this._boundResizeHandler = this._handleResize.bind(this);

    window.addEventListener("scroll", this._boundScrollHandler, {
      passive: true,
    });
    window.addEventListener("resize", this._boundResizeHandler);
    window.addEventListener("load", this._boundResizeHandler);

    AnimeHelper._instances.push(this);
  }

  // --- PUBLIC CONTROL & CORE METHODS ---
  /**
   * Recalculates the positions and dimensions for all scroll-triggered animations.
   * Crucial for use in SPAs or after dynamic content changes (e.g., loading images).
   * @returns {this} The AnimeHelper instance for chaining.
   */
  refresh() {
    this._handleResize();
    return this;
  }

  /**
   * Retrieves the internal data objects for a given target selector or element.
   * @param {string|HTMLElement} target - The CSS selector or element to find.
   * @returns {object[]} An array of data objects, each containing the animation instance and config.
   */
  get(target) {
    return this._getElements(target)
      .map((el) => this.elementMap.get(el))
      .filter(Boolean);
  }

  /**
   * Plays the animations for the given target(s).
   * @param {string|HTMLElement} target - The CSS selector or element to play.
   * @returns {this} The AnimeHelper instance for chaining.
   */
  play(target) {
    this.get(target).forEach((data) => data.instance?.play());
    return this;
  }

  /**
   * Pauses the animations for the given target(s).
   * @param {string|HTMLElement} target - The CSS selector or element to pause.
   * @returns {this} The AnimeHelper instance for chaining.
   */
  pause(target) {
    this.get(target).forEach((data) => data.instance?.pause());
    return this;
  }

  /**
   * Reverses the animations for the given target(s).
   * @param {string|HTMLElement} target - The CSS selector or element to reverse.
   * @returns {this} The AnimeHelper instance for chaining.
   */
  reverse(target) {
    this.get(target).forEach((data) => data.instance?.reverse());
    return this;
  }

  /**
   * Restarts the animations for the given target(s).
   * @param {string|HTMLElement} target - The CSS selector or element to restart.
   * @returns {this} The AnimeHelper instance for chaining.
   */
  restart(target) {
    this.get(target).forEach((data) => data.instance?.restart());
    return this;
  }

  /**
   * Seeks the animations for a target to a specific time (in ms) or percentage.
   * @param {string|HTMLElement} target - The CSS selector or element to seek.
   * @param {number|string} value - The time in milliseconds or a percentage string (e.g., "50%").
   * @returns {this} The AnimeHelper instance for chaining.
   */
  seek(target, value) {
    this.get(target).forEach((data) => {
      if (!data.instance) return;
      if (typeof value === "string" && value.endsWith("%")) {
        const percent = parseFloat(value) / 100;
        data.instance.seek(data.instance.duration * percent);
      } else {
        data.instance.seek(value);
      }
    });
    return this;
  }

  /**
   * The main method. Finds target elements, applies their configuration, and prepares them for scroll-based interactions.
   * @param {string|HTMLElement|NodeList} target - The element(s) to observe.
   * @param {object} config - The master configuration object for the animation.
   * @returns {this} The AnimeHelper instance for chaining.
   */
  observe(target, config) {
    this._getElements(target).forEach((el) => {
      const data = {
        config,
        instance: null,
        subInstance: null,
        listeners: {},
        scroll: { isActive: false, progress: 0, direction: 1 },
      };
      this.elementMap.set(el, data);
      this._applyInitialState(el, config);
      this._playAnimation(el, data);
      if (config.scrollTrigger) {
        if (config.scrollTrigger.pin) this._createPinSpacer(el, data);
        this._calculateScrollBounds(el, data);
        if (config.scrollTrigger.markers) this._createMarkers(el, data);
      }
    });
    this._handleScroll();
    return this;
  }

  /**
   * Disconnects all listeners and cleans up elements to prevent memory leaks.
   */
  destroy() {
    window.removeEventListener("scroll", this._boundScrollHandler);
    window.removeEventListener("resize", this._boundResizeHandler);
    window.removeEventListener("load", this._boundResizeHandler);

    AnimeHelper._instances = AnimeHelper._instances.filter(
      (inst) => inst !== this
    );
    this.elementMap.forEach((data, el) => {
      Object.values(data.listeners).forEach(({ event, handler }) =>
        el.removeEventListener(event, handler)
      );
      if (data.scroll.startMarker) data.scroll.startMarker.remove();
      if (data.scroll.endMarker) data.scroll.endMarker.remove();
      if (data.scroll.pinSpacer) {
        Object.assign(el.style, data.scroll.originalStyles);
        data.scroll.pinSpacer.replaceWith(el);
      }
    });
    this.elementMap.clear();
    console.log("AnimeHelper destroyed.");
  }

  // --- PRIVATE HANDLERS, HELPERS, PRESETS, ETC. ---

  /**
   * @private
   * Throttled scroll handler that updates animations using requestAnimationFrame.
   */
  _handleScroll() {
    if (!this.isTicking) {
      window.requestAnimationFrame(() => {
        this._updateScrollAnimations(window.scrollY);
        this.isTicking = false;
      });
      this.isTicking = true;
    }
  }

  /**
   * @private
   * Handler for window resize and load events, recalculating all animation bounds.
   */
  _handleResize() {
    this.elementMap.forEach((data, el) => {
      if (data.config.scrollTrigger) {
        if (data.scroll.pinSpacer) this._updatePinSpacer(el, data);
        this._calculateScrollBounds(el, data);
        if (data.config.scrollTrigger.markers) this._updateMarkers(data);
      }
    });
    this._handleScroll();
  }

  /**
   * @private
   * Core logic that runs on each scroll frame. Updates all observed animations based on scroll position.
   * @param {number} scrollY - The current vertical scroll position of the window.
   */
  _updateScrollAnimations(scrollY) {
    this.elementMap.forEach((data, el) => {
      if (!data.config.scrollTrigger || !data.instance) return;
      const { start, end, pinStart, pinEnd } = data.scroll;
      const config = data.config.scrollTrigger;
      const wasActive = data.scroll.isActive;
      const isActive = scrollY >= start && scrollY <= end;
      const clampedProgress =
        end === start
          ? 1
          : Math.max(0, Math.min(1, (scrollY - start) / (end - start)));
      const direction = scrollY > (data.scroll.lastY || scrollY) ? 1 : -1;

      if (isActive && !wasActive) {
        config.onEnter?.(el, direction);
        if (config.toggleActions) {
          this._runToggleAction(data.instance, config.toggleActions, 0);
        } else if (!config.scrub) {
          data.instance.play();
        }
      } else if (!isActive && wasActive) {
        if (direction === 1) {
          config.onLeave?.(el, direction);
          if (config.toggleActions)
            this._runToggleAction(data.instance, config.toggleActions, 2);
        } else {
          config.onLeaveBack?.(el, direction);
          if (config.toggleActions)
            this._runToggleAction(data.instance, config.toggleActions, 3);
        }
      }
      if (isActive && wasActive && direction !== data.scroll.direction) {
        if (direction === -1) {
          config.onEnterBack?.(el, direction);
          if (config.toggleActions)
            this._runToggleAction(data.instance, config.toggleActions, 1);
        }
      }
      if (config.scrub) {
        data.instance.seek(data.instance.duration * clampedProgress);
      }
      if (config.pin) {
        if (scrollY >= pinStart && scrollY <= pinEnd) {
          if (!data.scroll.isPinned) {
            Object.assign(el.style, {
              position: "fixed",
              top: `${data.scroll.pinTop}px`,
              left: `${data.scroll.pinLeft}px`,
              width: `${data.scroll.pinWidth}px`,
            });
            data.scroll.isPinned = true;
          }
        } else {
          if (data.scroll.isPinned) {
            Object.assign(el.style, {
              position: "absolute",
              left: "0",
              top: scrollY < pinStart ? "0" : `${pinEnd - pinStart}px`,
            });
            data.scroll.isPinned = false;
          }
        }
      }
      data.scroll.isActive = isActive;
      data.scroll.progress = clampedProgress;
      data.scroll.direction = direction;
      data.scroll.lastY = scrollY;
    });
  }

  /**
   * @private
   * Executes a specific animation action (e.g., 'play', 'pause') based on the toggleActions string.
   * @param {object} instance - The Anime.js animation instance.
   * @param {string} actions - A space-separated string of actions (e.g., "play pause resume reverse").
   * @param {number} index - The index of the action to execute.
   */
  _runToggleAction(instance, actions, index) {
    const action = actions.split(" ")[index] || "play";
    if (instance && typeof instance[action] === "function") {
      instance[action]();
    }
  }

  /**
   * @private
   * Calculates the absolute pixel start and end values for a scroll trigger.
   * @param {HTMLElement} element - The target element.
   * @param {object} data - The element's stored data object.
   */
  _calculateScrollBounds(element, data) {
    const rect =
      data.scroll.pinSpacer?.getBoundingClientRect() ||
      element.getBoundingClientRect();
    const scrollY = window.scrollY;
    const wh = window.innerHeight;
    const config = data.config.scrollTrigger;
    const parsePos = (posStr, elRect) => {
      const [elEdge, vpEdge] = posStr.split(" ");
      let elOffset =
        elEdge === "top"
          ? elRect.top + scrollY
          : elEdge === "center"
          ? elRect.top + scrollY + elRect.height / 2
          : elEdge === "bottom"
          ? elRect.bottom + scrollY
          : elRect.top + scrollY + (parseFloat(elEdge) / 100) * elRect.height;
      let vpOffset =
        vpEdge === "top"
          ? 0
          : vpEdge === "center"
          ? wh / 2
          : vpEdge === "bottom"
          ? wh
          : (parseFloat(vpEdge) / 100) * wh;
      return elOffset - vpOffset;
    };
    data.scroll.start = parsePos(config.start || "top bottom", rect);

    if (
      config.end &&
      typeof config.end === "string" &&
      config.end.startsWith("+=")
    ) {
      let offset = parseFloat(config.end.substring(2));
      if (config.end.includes("%")) {
        offset = (parseFloat(config.end.substring(2)) / 100) * wh;
      }
      data.scroll.end = data.scroll.start + offset;
    } else {
      data.scroll.end = parsePos(config.end || "bottom top", rect);
    }

    if (config.pin) {
      const [startElEdge, startVpEdge] = (config.start || "top bottom").split(
        " "
      );
      let vpOffset =
        startVpEdge === "top"
          ? 0
          : startVpEdge === "center"
          ? wh / 2
          : startVpEdge === "bottom"
          ? wh
          : (parseFloat(startVpEdge) / 100) * wh;
      let elEdgeOffset =
        startElEdge === "top"
          ? 0
          : startElEdge === "center"
          ? rect.height / 2
          : startElEdge === "bottom"
          ? rect.height
          : (parseFloat(startElEdge) / 100) * rect.height;
      data.scroll.pinTop = vpOffset - elEdgeOffset;
      data.scroll.pinStart = data.scroll.start;
      data.scroll.pinEnd = data.scroll.end;
      if (data.scroll.pinSpacer)
        data.scroll.pinSpacer.style.height = `${
          data.scroll.end - data.scroll.start + rect.height
        }px`;
    }
  }

  /**
   * @private
   * Creates and stores the main animation instance for an element.
   * @param {HTMLElement} target - The target element.
   * @param {object} data - The element's stored data object.
   */
  _playAnimation(target, data) {
    const config = this._getConfigFromPreset(data.config);
    const mainTimeline = this._createTimelineFromConfig(target, config, false);
    data.instance = mainTimeline;
    if (config.scrollTrigger?.scrub) {
      mainTimeline.seek(0);
    }
    if (config.subTimeline) {
      const subTarget = target.querySelector(config.subTimeline.target);
      if (subTarget) {
        let subAnimParams = this._prepareAnimationConfig(
          subTarget,
          config.subTimeline
        ).params;
        const subCallbacks = this._createCallbackHooks(
          subTarget,
          config.subTimeline
        );
        data.subInstance = this.anime.animate(subTarget, {
          ...subAnimParams,
          ...subCallbacks,
        });
        if (config.subTimeline.controls)
          this._setupControls(
            subTarget,
            data,
            config.subTimeline.controls,
            true
          );
      }
    }
    if (config.controls)
      this._setupControls(target, data, config.controls, false);
  }

  /**
   * @private
   * Builds an Anime.js timeline instance from a configuration object.
   * @param {HTMLElement} target - The root element for the animation.
   * @param {object} config - The processed animation configuration.
   * @param {boolean} autoplay - Whether the timeline should play immediately.
   * @returns {object} The created Anime.js timeline instance.
   */
  _createTimelineFromConfig(target, config, autoplay = true) {
    const timelineSettings =
      config.timelineSettings ||
      (config.params && config.params.timelineSettings) ||
      {};
    const mainCallbacks = this._createCallbackHooks(target, config);
    const finalSettings = { autoplay, ...timelineSettings, ...mainCallbacks };
    const timeline = this.anime.createTimeline(finalSettings);
    if (config.type === "timeline" && config.params?.steps) {
      config.params.steps.forEach((step) => {
        const stepTarget = step.target
          ? target.querySelectorAll(step.target)
          : target;
        timeline.add(stepTarget, step.params, step.offset);
      });
    } else {
      const animConfig = this._prepareAnimationConfig(target, config);
      timeline.add(animConfig.targets, animConfig.params);
    }
    return timeline;
  }

  /**
   * @private
   * Attaches interactive event listeners (e.g., click, hover) to an element to control its animation.
   * @param {HTMLElement} target - The element to attach listeners to.
   * @param {object} data - The element's stored data object.
   * @param {object} controls - The controls configuration (e.g., `{ onClick: 'restart' }`).
   * @param {boolean} isSubInstance - Whether to control the main or sub-timeline instance.
   */
  _setupControls(target, data, controls, isSubInstance = false) {
    const instance = isSubInstance ? data.subInstance : data.instance;
    if (controls.onClick) {
      const handler = () => this[controls.onClick]?.(target);
      target.addEventListener("click", handler);
      data.listeners.click = { event: "click", handler };
    }
    if (controls.onHover === "pause") {
      const pauseHandler = () => instance?.pause();
      const playHandler = () => instance?.play();
      target.addEventListener("mouseenter", pauseHandler);
      target.addEventListener("mouseleave", playHandler);
      data.listeners.mouseenter = {
        event: "mouseenter",
        handler: pauseHandler,
      };
      data.listeners.mouseleave = { event: "mouseleave", handler: playHandler };
    }
  }

  /**
   * @private
   * Creates a set of wrapped callback functions (onBegin, onUpdate, onComplete) for an animation.
   * @param {HTMLElement} target - The element the callback relates to.
   * @param {object} config - The config object containing user-defined callbacks.
   * @returns {object} An object with Anime.js v4-compatible callback keys.
   */
  _createCallbackHooks(target, config) {
    const hooks = {};
    if (config.onBegin) {
      hooks.onBegin = (anim) => config.onBegin(target, anim);
    }
    if (config.onUpdate) {
      hooks.onUpdate = (anim) => config.onUpdate(target, anim);
    }
    if (config.onComplete) {
      hooks.onComplete = (anim) => config.onComplete(target, anim);
    }
    return hooks;
  }

  /**
   * @private
   * Prepares the final `targets` and `params` for an animation, handling special types like 'stagger' and 'text'.
   * @param {HTMLElement} target - The root element for this animation step.
   * @param {object} config - The configuration for this animation.
   * @returns {{targets: (HTMLElement|NodeList), params: object}} An object containing the final targets and parameters.
   */
  _prepareAnimationConfig(target, config) {
    const params = { ...(config.params || {}) };
    let targets = target;
    switch (config.type) {
      case "stagger":
        targets = this._handleStaggerType(target, config);
        break;
      case "text":
        targets = this._handleTextType(target, config);
        break;
    }
    return { targets, params };
  }

  /**
   * @private
   * "Plugin" helper for stagger animations. Returns the child elements to be staggered.
   * @param {HTMLElement} target - The parent element.
   * @param {object} config - The animation configuration.
   * @returns {NodeList} The list of child elements to animate.
   */
  _handleStaggerType(target, config) {
    return target.querySelectorAll(config.childSelector);
  }

  /**
   * @private
   * "Plugin" helper for text animations. Splits text into letters/words and returns the letter elements.
   * @param {HTMLElement} target - The text container element.
   * @param {object} config - The animation configuration.
   * @returns {NodeList} The list of letter `<span>` elements to animate.
   */
  _handleTextType(target, config) {
    if (!target.dataset.textSetup) {
      const text = target.textContent;
      if (config.groupByWord) {
        target.innerHTML = text
          .split(/(\s+)/)
          .map((part) => {
            if (part.trim() === "") return `<span>${part}</span>`;
            return `<span class="word-wrapper">${part
              .split("")
              .map((char) => `<span class="letter">${char}</span>`)
              .join("")}</span>`;
          })
          .join("");
      } else {
        target.innerHTML = text.replace(
          /\S/g,
          "<span class='letter'>$&</span>"
        );
      }
      target.dataset.textSetup = true;
    }
    return target.querySelectorAll(".letter");
  }

  /**
   * @private
   * Creates a spacer element for pinning, which holds the place of the pinned element in the document flow.
   * @param {HTMLElement} el - The element to pin.
   * @param {object} data - The element's stored data object.
   */
  _createPinSpacer(el, data) {
    const rect = el.getBoundingClientRect();
    const computedStyle = getComputedStyle(el);
    const spacer = this._createElement("div", {
      class: "anime-helper-pin-spacer",
      style: {
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        marginTop: computedStyle.marginTop,
        marginBottom: computedStyle.marginBottom,
        marginLeft: computedStyle.marginLeft,
        marginRight: computedStyle.marginRight,
        flex: computedStyle.flex,
        display: computedStyle.display,
        position: "relative",
      },
    });
    data.scroll.originalStyles = {
      position: el.style.position,
      top: el.style.top,
      left: el.style.left,
      width: el.style.width,
      margin: el.style.margin,
    };
    data.scroll.pinSpacer = spacer;
    data.scroll.pinLeft = rect.left;
    data.scroll.pinWidth = rect.width;
    el.parentNode.insertBefore(spacer, el);
    spacer.appendChild(el);
    Object.assign(el.style, {
      margin: "0",
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
    });
  }

  /**
   * @private
   * Updates the dimensions of a pin spacer on resize.
   * @param {HTMLElement} el - The pinned element.
   * @param {object} data - The element's stored data object.
   */
  _updatePinSpacer(el, data) {
    Object.assign(el.style, data.scroll.originalStyles);
    const rect = el.getBoundingClientRect();
    data.scroll.pinSpacer.style.height = `${rect.height}px`;
    Object.assign(el.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
    });
  }

  /**
   * @private
   * Creates and displays visual markers for a scroll trigger's start and end points.
   * @param {HTMLElement} el - The target element.
   * @param {object} data - The element's stored data object.
   */
  _createMarkers(el, data) {
    const markerStyle = {
      position: "absolute",
      left: "0",
      width: "100%",
      textAlign: "right",
      borderTop: "1px dashed red",
      color: "red",
      fontSize: "10px",
      zIndex: "9999",
    };
    const createAndAppendMarker = (text, id) => {
      const marker = this._createElement(
        "div",
        { id, style: markerStyle },
        `<span>${text}</span>`
      );
      document.body.appendChild(marker);
      return marker;
    };
    const startText = `start (${
      data.config.scrollTrigger.start || "top bottom"
    })`;
    const endText = `end (${data.config.scrollTrigger.end || "bottom top"})`;
    data.scroll.startMarker = createAndAppendMarker(
      startText,
      `start-${Math.random().toString(36).substr(2, 9)}`
    );
    data.scroll.endMarker = createAndAppendMarker(
      endText,
      `end-${Math.random().toString(36).substr(2, 9)}`
    );
    this._updateMarkers(data);
  }

  /**
   * @private
   * Updates the position of scroll trigger markers.
   * @param {object} data - The element's stored data object containing the markers.
   */
  _updateMarkers(data) {
    if (data.scroll.startMarker)
      data.scroll.startMarker.style.top = `${data.scroll.start}px`;
    if (data.scroll.endMarker)
      data.scroll.endMarker.style.top = `${data.scroll.end}px`;
  }

  /**
   * @private
   * A utility function to create a DOM element with specified attributes, styles, and content.
   * @param {string} tag - The HTML tag to create.
   * @param {object} attributes - An object of attributes (e.g., { class: 'foo', style: { color: 'red' } }).
   * @param {string|HTMLElement|Array} content - The content to append to the element.
   * @returns {HTMLElement} The created element.
   */
  _createElement(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (key === "style" && typeof value === "object") {
          Object.assign(element.style, value);
        } else {
          element.setAttribute(key, value);
        }
      }
    }
    if (content) {
      if (typeof content === "string") {
        element.innerHTML = content;
      } else if (Array.isArray(content)) {
        element.append(...content);
      } else if (content instanceof HTMLElement) {
        element.append(content);
      }
    }
    return element;
  }

  /**
   * @private
   * A utility function to find DOM elements from various target types.
   * @param {string|HTMLElement|NodeList} target - The target to resolve.
   * @returns {HTMLElement[]} An array of found elements.
   */
  _getElements(target) {
    if (target instanceof HTMLElement) return [target];
    if (typeof target === "string")
      return Array.from(document.querySelectorAll(target));
    if (Array.isArray(target)) {
      let elements = [];
      target.forEach((selector) => {
        if (typeof selector === "string") {
          elements.push(...document.querySelectorAll(selector));
        }
      });
      return [...new Set(elements)];
    }
    return [];
  }

  /**
   * @private
   * Applies the initial CSS styles to elements before they are animated.
   * @param {HTMLElement} target - The root element being observed.
   * @param {object} config - The animation configuration object.
   */
  _applyInitialState(target, config) {
    if (config.initialState) {
      Object.assign(target.style, config.initialState);
    }
    const effectiveConfig = this._getConfigFromPreset(config);
    if (
      effectiveConfig.type === "timeline" &&
      effectiveConfig.params &&
      effectiveConfig.params.steps
    ) {
      effectiveConfig.params.steps.forEach((step) => {
        if (step.initialState) {
          const elements = step.target
            ? target.querySelectorAll(step.target)
            : [target];
          elements.forEach((el) => {
            Object.assign(el.style, step.initialState);
          });
        }
      });
    }
  }

  /**
   * @private
   * Retrieves a preset configuration and merges it with the user's config.
   * @param {object} config - The user-provided configuration object.
   * @returns {object} The final, merged configuration object.
   */
  _getConfigFromPreset(config) {
    if (!config.preset) return config;
    const presetFn = this.presets[config.preset];
    if (!presetFn) {
      console.error(`AnimeHelper: Preset "${config.preset}" not found.`);
      return config;
    }
    const presetConfig = presetFn(config);
    return { ...presetConfig, ...config };
  }

  /**
   * @private
   * Initializes the built-in and custom-added animation presets.
   */
  _initializePresets() {
    const builtInPresets = {
      fadeIn: (options = {}) => {
        const {
          from = "bottom",
          animateChildren = true,
          override = {},
        } = options;
        const transforms = {
          bottom: { translateY: [100, 0] },
          top: { translateY: [-100, 0] },
          left: { translateX: [-100, 0] },
          right: { translateX: [100, 0] },
        };
        const steps = [
          {
            target: null,
            params: {
              opacity: [0, 1],
              ...transforms[from],
              scale: [0.9, 1],
              easing: "spring(1, 80, 10, 0)",
            },
          },
        ];
        if (animateChildren) {
          steps.push({
            target: "h1, h2, h3, h4, p, a, button, img",
            params: {
              opacity: [0, 1],
              translateY: [20, 0],
              easing: "easeOutExpo",
              delay: this.anime.stagger(150),
              ...override,
            },
          });
        }
        return { type: "timeline", params: { steps } };
      },
      staggerFadeIn: (options = {}) => {
        const {
          from = "bottom",
          childSelector = ":scope > *",
          override = {},
        } = options;
        const transforms = {
          bottom: { translateY: [40, 0] },
          top: { translateY: [-40, 0] },
          left: { translateX: [-40, 0] },
          right: { translateX: [40, 0] },
          center: { scale: [0, 1] },
        };
        const baseParams = {
          opacity: [0, 1],
          ...transforms[from],
          easing: "spring(1, 60, 12, 5)",
          delay: this.anime.stagger(80, {
            from: from === "center" ? "center" : "first",
          }),
        };
        return {
          type: "stagger",
          childSelector: childSelector,
          params: { ...baseParams, ...override },
        };
      },
      letterFadeIn: (options = {}) => {
        const { from = "bottom", override = {} } = options;
        const transforms = {
          bottom: { translateY: ["1.1em", 0] },
          top: { translateY: ["-1.1em", 0] },
          left: { translateX: ["-0.5em", 0] },
          right: { translateX: ["0.5em", 0] },
        };
        const baseParams = {
          opacity: [0, 1],
          ...transforms[from],
          rotateZ:
            from === "left" ? [-10, 0] : from === "right" ? [10, 0] : [5, 0],
          easing: "spring(1, 70, 15, 10)",
          delay: this.anime.stagger(50),
          duration: 1000,
        };
        return { type: "text", params: { ...baseParams, ...override } };
      },
    };
    this.presets = { ...builtInPresets, ...AnimeHelper._presets };
  }
}
