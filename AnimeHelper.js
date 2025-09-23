/**
 * AnimeHelper: A utility class to simplify and streamline animations using Anime.js.
 * Add static get method
 * @version 4.7.2
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

  static _instances = new Map();
  static _syncQueue = [];

  /* ========================== GLOBAL FUNCTIONS ================================ */
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

  static addPreset(name, generator) {
    if (typeof name !== "string" || typeof generator !== "function") {
      console.error(
        "AnimeHelper.addPreset() requires a string name and a generator function."
      );
      return;
    }
    this._presets[name] = generator;
  }

  static get(instanceName) {
    return this._instances.get(instanceName);
  }

  /* ========================== HELPER FUNCTIONS ================================ */

  _delayToStagger(value) {
    return this._anime.stagger(value);
  }

  _getPreset(preset, config) {
    if (preset) {
      const presetFn = this.constructor._presets[preset];
      if (presetFn) {
        return presetFn(config);
      }
    }
    return {};
  }

  _parseCssValue(cssValue) {
    if (typeof cssValue !== "string") return null;
    const match = cssValue.match(/^(\-?[\d\.]+)([a-z%]*)$/i);
    if (match) {
      const [, value, unit] = match;
      return { value: parseFloat(value), unit: unit || "" };
    }
    return null;
  }
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
      : [trackElement]; // Fallback to pinning the track itself

    if (!pinElements || pinElements.length === 0) {
      console.warn(
        `AnimeHelper Pin: Could not find the pin target "${target}" inside "${parentTarget}".`
      );
      return;
    }

    // Apply sticky positioning to the element(s) to be pinned
    pinElements.forEach((el) => {
      el.style.position = "sticky";
      el.style.top = start;
    });

    // Adjust the height of the TRACK to create the scrollable duration
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

  /* ==========================                  ================================ */

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
   * This is the central logic for all scroll-triggered animations.
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

    // Create the observer instance. Anime.js will automatically link it
    // to the animation when it's passed into the `autoplay` property.
    return this._scrollFn(observerConfig);
  }

  observe(targets, config) {
    if (!config) {
      console.warn("AnimeHelper.observe() expects a configuration object.");
      return;
    }

    let animationInstance;
    let animationTarget = targets; // Default animation target
    let observerTarget = targets; // Default observer target

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
      const finalAnimationTarget = config.animationTarget || targets;
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

  _createAnimatable(targets, config) {
    return this._animatable(targets, config);
  }

  /**
   * The specialist method for creating 'scrubbing' animations.
   * It now accepts separate targets for the animation and the observer.
   * @private
   *
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

    // The animation targets can be different from the observer target.
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
   *
   * @todo - Review the array targets if the animation is properly being assigned
   * @todo - check animejs if we're using multiple selector properly [char, words, lines]
   *
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

  get anime() {
    return this._anime;
  }
}

export default AnimeHelper;
