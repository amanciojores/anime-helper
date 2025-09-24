/**
 * @class AnimeHelper
 * @version 4.8.2
 * @summary A high-level utility class to simplify and streamline the creation of complex animations using Anime.js.
 * @description This helper abstracts common animation patterns like scroll-triggered reveals, text splitting,
 * timeline orchestration, and element pinning into a declarative, easy-to-use API.
 */
class AnimeHelper {
  _anime;
  _animateFn;
  _timelineFn;
  _scopeFn;
  _resolveTargetsFn;
  _textSplitFn;
  _scrollFn;
  _animatable;

  /**
   * @type {Map<string, object>}
   * @private
   * @static
   * @description A map to store and retrieve animation instances by their string selector.
   */
  static _instances = new Map();
  /**
   * @type {Array<object>}
   * @private
   * @static
   * @description A queue for timeline syncing operations, processed after all instances are created.
   */
  static _syncQueue = [];

  /* ========================== GLOBAL FUNCTIONS ================================ */

  /**
   * @static
   * @description Processes the sync queue, linking slave timelines to their masters. Should be called after all helpers are initialized.
   */
  static applySyncs() {
    this._syncQueue.forEach(({ slave, masterSelector, offset }) => {
      const masterTimeline = this._instances.get(masterSelector);
      if (masterTimeline && typeof masterTimeline.sync === "function") {
        masterTimeline.sync(slave, offset);
      } else {
        console.warn(
          `AnimeHelper: Could not find a master timeline with target "${masterSelector}" to sync with.`
        );
      }
    });
    this._syncQueue = [];
  }

  /**
   * @type {Object.<string, Function>}
   * @private
   * @static
   * @description A registry for animation presets that can be used across instances.
   */
  static _presets = {
    fadeIn: (config) => {
      const from = config.from || "bottom";
      const defaultDistance = 20;
      const animation = {
        opacity: [0, 1],
      };
      switch (from) {
        case "top":
          animation.translateY = [-defaultDistance, 0];
          break;
        case "left":
          animation.translateX = [-defaultDistance, 0];
          break;
        case "right":
          animation.translateX = [defaultDistance, 0];
          break;
        case "bottom":
        default:
          animation.translateY = [defaultDistance, 0];
          break;
      }
      return animation;
    },
  };

  /**
   * Adds a new animation preset to the helper.
   * @static
   * @param {string} name - The name of the preset.
   * @param {Function} generator - A function that takes a config object and returns an anime.js params object.
   */
  static addPreset(name, generator) {
    if (typeof name !== "string" || typeof generator !== "function") {
      console.error(
        "AnimeHelper.addPreset() requires a string name and a generator function."
      );
      return;
    }
    this._presets[name] = generator;
  }

  /**
   * Retrieves a stored animation instance by its selector.
   * @static
   * @param {string} instanceName - The string selector used to create the animation.
   * @returns {object|undefined} The anime.js animation instance.
   */
  static get(instanceName) {
    return this._instances.get(instanceName);
  }

  /**
   * Retrieves the entire map of stored animation instances.
   * @static
   * @returns {Map<string, object>} The map of all named instances.
   */
  static getAll() {
    return this._instances;
  }

  /**
   * Reverts a specific animation instance to its original state.
   * @static
   * @param {string} instanceName - The selector of the instance to kill.
   */
  static kill(instanceName) {
    this.#assignMethodToAnimation(this.get(instanceName), "revert");
  }

  /**
   * Reverts all stored animation instances.
   * @static
   */
  static killAll() {
    this.#assignMethodToAnimation(this.getAll(), "revert");
  }

  /**
   * Plays a specific animation instance.
   * @static
   * @param {string} instanceName - The selector of the instance to play.
   */
  static play(instanceName) {
    this.#assignMethodToAnimation(this.get(instanceName), "play");
  }

  /**
   * Plays all stored animation instances.
   * @static
   */
  static playAll() {
    this.#assignMethodToAnimation(this.getAll(), "play");
  }

  /**
   * Pauses a specific animation instance.
   * @static
   * @param {string} instanceName - The selector of the instance to pause.
   */
  static pause(instanceName) {
    this.#assignMethodToAnimation(this.get(instanceName), "pause");
  }

  /**
   * Pauses all stored animation instances.
   * @static
   */
  static pauseAll() {
    this.#assignMethodToAnimation(this.getAll(), "pause");
  }

  /**
   * Resumes a specific animation instance.
   * @static
   * @param {string} instanceName - The selector of the instance to resume.
   */
  static resume(instanceName) {
    this.#assignMethodToAnimation(this.get(instanceName), "resume");
  }

  /**
   * Resumes all stored animation instances.
   * @static
   */
  static resumeAll() {
    this.#assignMethodToAnimation(this.getAll(), "resume");
  }

  /**
   * Restarts a specific animation instance.
   * @static
   * @param {string} instanceName - The selector of the instance to restart.
   */
  static restart(instanceName) {
    this.#assignMethodToAnimation(this.get(instanceName), "restart");
  }

  /**
   * Restarts all stored animation instances.
   * @static
   */
  static restartAll() {
    this.#assignMethodToAnimation(this.getAll(), "restart");
  }

  /* ========================== HELPER FUNCTIONS ================================ */

  /**
   * A private static helper to apply a method to a single instance or a map of instances.
   * @private
   * @static
   * @param {object|Map<string, object>} instance - The animation instance or a Map of instances.
   * @param {string} method - The name of the method to call (e.g., 'play', 'pause').
   */
  static #assignMethodToAnimation(instance, method) {
    if (!instance) return;

    if (instance instanceof Map) {
      instance.forEach((animation) => {
        if (animation && typeof animation[method] === "function") {
          animation[method]();
        }
      });
      return;
    }

    if (instance && typeof instance[method] === "function") {
      instance[method]();
    }
  }

  /**
   * Converts a numerical delay into an anime.js stagger function.
   * @param {number} value - The stagger delay in milliseconds.
   * @returns {Function} An anime.js stagger function.
   * @private
   */
  _delayToStagger(value) {
    return this._anime.stagger(value);
  }

  /**
   * Retrieves a preset animation configuration object.
   * @param {string} preset - The name of the preset.
   * @param {object} config - The user's main configuration object.
   * @returns {object} The preset's parameter object.
   * @private
   */
  _getPreset(preset, config) {
    if (preset) {
      const presetFn = this.constructor._presets[preset];
      if (presetFn) {
        return presetFn(config);
      }
    }
    return {};
  }

  /**
   * Parses a CSS value string into a number and unit.
   * @param {string} cssValue - The CSS value to parse (e.g., '100vh', '-50px').
   * @returns {{value: number, unit: string}|null} An object with the value and unit.
   * @private
   */
  _parseCssValue(cssValue) {
    if (typeof cssValue !== "string") return null;
    const match = cssValue.match(/^(\-?[\d\.]+)([a-z%]*)$/i);
    if (match) {
      const [, value, unit] = match;
      return { value: parseFloat(value), unit: unit || "" };
    }
    return null;
  }

  /**
   * Creates the DOM structure and applies CSS for the pinning effect.
   * @param {HTMLElement} parentTarget - The element that will act as the scrollable track.
   * @param {object} config - The pin configuration from `pinParams`.
   * @private
   */
  _createPin(parentTarget, config) {
    const { duration = "auto", start = "0px", target } = config;
    const trackElement = this._resolveTargetsFn(parentTarget)[0];
    if (!trackElement) {
      console.warn(
        `AnimeHelper Pin: Could not find the track element "${parentTarget}".`
      );
      return;
    }

    const pinElements = target
      ? trackElement.querySelectorAll(target)
      : [trackElement];

    if (!pinElements || pinElements.length === 0) {
      console.warn(
        `AnimeHelper Pin: Could not find the pin target "${target}" inside "${parentTarget}".`
      );
      return;
    }

    pinElements.forEach((el) => {
      el.style.position = "sticky";
      el.style.top = start;
    });

    if (duration !== "auto") {
      const relativeValues = ["-=", "+="];
      if (relativeValues.some((value) => duration.includes(value))) {
        const currentHeight = trackElement.offsetHeight;
        const { value: durationValue } = this._parseCssValue(
          duration.substring(2)
        );
        let newHeight = currentHeight;

        if (duration.includes("+=")) {
          newHeight = currentHeight + durationValue;
        } else if (duration.includes("-=")) {
          newHeight = currentHeight - durationValue;
        }
        trackElement.style.height = `${newHeight}px`;
      } else {
        trackElement.style.height = duration;
      }
    }
  }

  /* ========================== CORE METHODS ================================ */

  /**
   * Initializes the AnimeHelper instance.
   * @param {object} animeInstance - An instance of the Anime.js library.
   */
  constructor(animeInstance) {
    const lib =
      animeInstance ||
      (typeof window !== "undefined" ? window.anime : undefined);
    if (!lib) throw new Error("Anime.js not found.");
    this._anime = lib;
    this._animateFn = lib.animate || lib;
    this._timelineFn = lib.createTimeline || lib.timeline;
    this._scopeFn = lib.createScope || lib.scope;
    this._resolveTargetsFn = lib.utils?.$ || lib.$;
    this._textSplitFn = lib.text?.split || lib.splitText;
    this._scrollFn = lib.scroll || lib.onScroll;
    this._animatable = lib.animatable || lib.createAnimatable;
  }

  /**
   * Creates a scroll observer if scrollParams are provided.
   * @param {string|HTMLElement|Array<HTMLElement>} targets - The element to observe.
   * @param {object} config - The main configuration object.
   * @returns {object|undefined} An Anime.js scroll observer instance.
   * @private
   */
  _createScrollObserver(targets, config) {
    if (!this._scrollFn || !config.scrollParams) {
      return undefined;
    }

    const { scrollParams, scrollContainer } = config;
    const observerTarget = this._resolveTargetsFn(targets)[0];

    if (!observerTarget) {
      console.warn(
        `AnimeHelper: Could not find a target for the scroll observer.`
      );
      return undefined;
    }

    const observerConfig = {
      target: observerTarget,
      container: scrollContainer,
      ...scrollParams,
    };

    return this._scrollFn(observerConfig);
  }

  /**
   * The main method to create and control animations.
   * @param {string|HTMLElement|Array<HTMLElement>} targets - The primary target for the animation or effect.
   * @param {object} config - The configuration object for the animation.
   * @returns {object|undefined} The created Anime.js instance.
   */
  observe(targets, config) {
    if (!config) {
      console.warn("AnimeHelper.observe() expects a configuration object.");
      return;
    }

    let animationInstance;
    let animationTarget = targets;
    let observerTarget = targets;

    if (config.pin) {
      const pinParams = config.pinParams || {};
      observerTarget = targets;
      animationTarget = pinParams.target || targets;
      this._createPin(targets, pinParams);
      config.type = "scroll";
      config.scrollParams = {
        target: observerTarget,
        enter: "start start",
        leave: "end end",
        ...config.scrollParams,
      };
    }

    if (config.type === "scroll") {
      const finalAnimationTarget =
        config.animationTarget ||
        config.pinParams?.target ||
        config.pinParams?.targets ||
        targets;
      const finalObserverTarget = config.animationTarget
        ? targets
        : finalAnimationTarget;

      animationInstance = this._createScrollAnimation(
        finalAnimationTarget,
        finalObserverTarget,
        config
      );
    } else {
      const scrollObserver = this._createScrollObserver(observerTarget, config);
      const effectiveParams = { ...(config.params || {}) };
      if (scrollObserver) {
        effectiveParams.autoplay = scrollObserver;
      } else if (config.reusable) {
        effectiveParams.autoplay = false;
        delete config.reusable;
      }
      const effectiveConfig = { ...config, params: effectiveParams };

      switch (effectiveConfig.type) {
        case "animatable":
          animationInstance = this._createAnimatable(
            animationTarget,
            config.params
          );
          break;
        case "splitText":
          animationInstance = this._createTextSplitAnimation(
            animationTarget,
            effectiveConfig
          );
          break;
        case "scope":
          animationInstance = this._createScopedAnimation(
            animationTarget,
            effectiveConfig
          );
          break;
        case "timeline":
          animationInstance = this._buildTimeline(
            animationTarget,
            effectiveConfig
          );
          break;
        default:
          animationInstance = this._createSingleAnimation(
            animationTarget,
            effectiveConfig
          );
      }
    }

    if (typeof targets === "string" && animationInstance) {
      this.constructor._instances.set(targets, animationInstance);
    }

    if (config.syncWith) {
      this.constructor._syncQueue.push({
        slave: animationInstance,
        masterSelector: config.syncWith,
        offset: config.offset,
      });
    }

    return animationInstance;
  }

  /**
   * Creates a stateful, controllable animatable instance.
   * @param {string|HTMLElement|Array<HTMLElement>} targets - The animation targets.
   * @param {object} config - The animatable parameters object.
   * @returns {object} An anime.js animatable instance.
   * @private
   */
  _createAnimatable(targets, config) {
    return this._animatable(targets, config);
  }

  /**
   * Creates a scrubbing scroll animation.
   * @param {string|HTMLElement|Array<HTMLElement>} animationTargets - The element(s) to animate.
   * @param {string|HTMLElement|Array<HTMLElement>} observerTargets - The element that drives the scroll progress.
   * @param {object} config - The main configuration object.
   * @returns {object} An anime.js animation instance.
   * @private
   */
  _createScrollAnimation(animationTargets, observerTargets, config) {
    const { params = {}, scrollParams = {}, scrollContainer, preset } = config;

    if (!this._scrollFn) {
      console.error(
        "AnimeHelper: Scroll module (anime.onScroll || anime.scroll) not found."
      );
      return;
    }

    const observerTarget = this._resolveTargetsFn(observerTargets)[0];
    if (!observerTarget) {
      console.warn(
        `AnimeHelper: Could not find a target for the scroll animation.`
      );
      return;
    }

    const scrollConfig = {
      target: observerTarget,
      container: scrollContainer,
      ...scrollParams,
      sync: true,
    };

    const finalAnimationTargets = config.animationTarget
      ? this._resolveTargetsFn(observerTargets)[0].querySelectorAll(
          animationTargets
        )
      : this._resolveTargetsFn(animationTargets);

    return this._animateFn(finalAnimationTargets, {
      ...params,
      ...this._getPreset(preset, config),
      autoplay: this._scrollFn(scrollConfig),
    });
  }

  /**
   * Creates a text splitting animation.
   * @param {string|HTMLElement|Array<HTMLElement>} targets - The text element to split and animate.
   * @param {object} config - The main configuration object.
   * @returns {object} An anime.js animation or timeline instance.
   * @private
   */
  _createTextSplitAnimation(targets, config) {
    if (!this._textSplitFn) {
      console.error(
        "AnimeHelper: TextSplitter module (anime.text.split) not found."
      );
      return;
    }

    const {
      splitBy = "words",
      splitParams = {},
      params: animationParams = {},
      timelineParams = {},
    } = config;

    if (Array.isArray(splitBy)) {
      return this._createMultiSplitTimeline(targets, {
        splitBy,
        splitParams,
        timelineParams,
      });
    }

    const {
      from = "bottom",
      stagger = 50,
      distance = "1em",
      debug = false,
      splitOptions = {},
    } = splitParams;

    const text = this._textSplitFn(targets, { [splitBy]: splitOptions, debug });
    const splitTargets = text[splitBy];

    if (!splitTargets || splitTargets.length === 0) {
      console.warn(`AnimeHelper: Could not find any "${splitBy}" to animate.`);
      return;
    }

    const transforms = {
      top: { translateY: [-distance, 0] },
      bottom: { translateY: [distance, 0] },
      left: { translateX: [-distance, 0] },
      right: { translateX: [distance, 0] },
    };

    const generatedProps = {
      opacity: [0, 1],
      ...(transforms[from] || transforms.bottom),
    };

    const finalConfig = {
      delay: this._delayToStagger(stagger),
      ...generatedProps,
      ...animationParams,
    };

    return this._animateFn(splitTargets, finalConfig);
  }

  /**
   * Creates a multi-layered text splitting timeline.
   * @param {string|HTMLElement|Array<HTMLElement>} targets - The text element to split.
   * @param {object} config - An object containing splitBy, splitParams, and timelineParams.
   * @returns {object} An anime.js timeline instance.
   * @private
   */
  _createMultiSplitTimeline(targets, { splitBy, splitParams, timelineParams }) {
    const { debug = false, splitOptions = {} } = splitParams;

    if (
      !timelineParams ||
      !Array.isArray(timelineParams.steps) ||
      timelineParams.steps.length !== splitBy.length
    ) {
      console.error(
        "AnimeHelper: When 'splitBy' is an array, 'timelineParams.steps' must also be an array of the same length."
      );
      return;
    }

    if (!Array.isArray(splitOptions) || splitOptions.length === 0) {
      console.error(
        "AnimeHelper: When 'splitBy' is an array, 'splitOptions' must also be an array of the same length or contain at least one element."
      );
      return;
    }

    const buildSplit = splitBy.reduce((acc, curr, index) => {
      acc[curr] = splitOptions[index];
      return acc;
    }, {});

    const splitValues = this._textSplitFn(targets, { ...buildSplit, debug });

    timelineParams.steps.forEach((step, index) => {
      step.target = splitValues[splitBy[index]];
      if (step.params && step.params.stagger) {
        step.params.delay = this._delayToStagger(step.params.stagger);
      }
      if (step.stagger) {
        step.offset = this._delayToStagger(step.stagger);
        delete step.stagger;
      }
    });

    return this._buildTimeline(null, timelineParams);
  }

  /**
   * Creates a scoped animation.
   * @param {string|HTMLElement|Array<HTMLElement>} targets - The root element for the scope.
   * @param {object} config - The main configuration object.
   * @returns {object} An anime.js scope instance.
   * @private
   */
  _createScopedAnimation(targets, config) {
    const scopeParams = { ...config.scopeParams };
    scopeParams.root = targets;
    const scope = this._scopeFn(scopeParams);

    if (typeof config.run !== "function") {
      console.warn('AnimeHelper: type "scope" requires a "run" function.');
      return scope;
    }

    scope.add(() => {
      const userContext = {
        matches: scope.matches,
        utils: this._anime.utils,
        methods: {
          register: (name, func) => scope.add(name, func),
        },
      };
      config.run(userContext);
      if (typeof config.onRevert === "function") {
        return () => config.onRevert(userContext);
      }
    });
    return scope;
  }

  /**
   * Creates a single, standard animation instance.
   * @param {string|HTMLElement|Array<HTMLElement>} targets - The animation targets.
   * @param {object} config - The main configuration object.
   * @param {boolean} [returnAnimation=true] - Whether to return a full instance or just the params object.
   * @returns {object} An anime.js animation instance or a parameter object.
   * @private
   */
  _createSingleAnimation(targets, config, returnAnimation = true) {
    let animationParams = { ...config.params };
    if (config.preset) {
      const preset = this.constructor._presets[config.preset];
      if (preset) {
        animationParams = { ...preset(config), ...animationParams };
      }
    }

    if (!returnAnimation) {
      return animationParams;
    }

    return this._animateFn(targets, animationParams);
  }

  /**
   * Builds an anime.js timeline from a declarative configuration.
   * @param {string|HTMLElement|Array<HTMLElement>|null} parentTargets - The parent element for nested target selectors.
   * @param {object} config - The main configuration object.
   * @returns {object} An anime.js timeline instance.
   * @private
   */
  _buildTimeline(parentTargets, config) {
    const timelineParams = { ...config.params };
    const mainTl = this._timelineFn(timelineParams);
    const parentElement = this._resolveTargetsFn(parentTargets)[0];

    if (!parentElement && parentTargets !== null) {
      console.warn(
        "AnimeHelper: Could not find a valid parent element for the timeline."
      );
    }

    if (Array.isArray(config.offsetLabel)) {
      config.offsetLabel.forEach((labelDef) => {
        if (labelDef.label) {
          mainTl.label(labelDef.label, labelDef.offset);
        }
      });
    }

    if (Array.isArray(config.steps)) {
      config.steps.forEach((step) => {
        if (step.instance) {
          mainTl.sync(step.instance, step.offset);
          return;
        }

        const childElements = Array.isArray(step.target)
          ? step.target
          : parentElement
          ? parentElement.querySelectorAll(step.target)
          : this._resolveTargetsFn(step.target);

        if (childElements.length > 0) {
          if (step.params?.stagger) {
            step.params.delay = this._delayToStagger(step.params.stagger);
            delete step.params.stagger;
          }
          if (step.stagger) {
            step.offset = this._delayToStagger(step.stagger);
            delete step.stagger;
          }

          const addAnimationParams = this._createSingleAnimation(
            childElements,
            step,
            false
          );
          mainTl.add(childElements, addAnimationParams, step.offset);
        } else if (parentElement) {
          console.warn(
            `AnimeHelper: Timeline step target "${step.target}" not found within parent.`
          );
        }
      });
    }

    if (Array.isArray(config.call)) {
      config.call.forEach((callDef) => {
        if (typeof callDef.func === "function") {
          mainTl.call(() => callDef.func(mainTl), callDef.at);
        }
      });
    }

    if (timelineParams.init || config.init) {
      return mainTl.init();
    }

    return mainTl;
  }

  /**
   * Returns the underlying anime.js library instance.
   * @returns {object} The anime.js instance.
   */
  get anime() {
    return this._anime;
  }
}

export default AnimeHelper;

if (typeof window !== "undefined") {
  window.AnimeHelper = AnimeHelper;
}
