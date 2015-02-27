(function(ionic) {
  var NOOP = function() {};
  ionic.views.ScrollNative = ionic.views.View.inherit({

    initialize: function(options) {
      var self = this;

      self.__container = self.el = options.el;
      self.__content = options.el.firstElementChild;
      self.isNative = true;

      // TODO: turn in to methods
      self.__scrollTop = self.el.scrollTop;
      self.__scrollLeft = self.el.scrollLeft;
      self.__clientHeight = self.__content.clientHeight,
      self.__clientWidth = self.__content.clientWidth,
      self.__maxScrollTop = Math.max((self.__contentHeight) - self.__clientHeight, 0),
      self.__maxScrollLeft = Math.max((self.__contentWidth) - self.__clientWidth, 0),

      self.options = {

        /** Disable scrolling on x-axis by default */
        scrollingX: false,

        /** Enable scrolling on y-axis */
        scrollingY: true,

        /** Bouncing (content can be slowly moved outside and jumps back after releasing) */
        bouncing: ionic.Platform.isIOS(),

        deceleration: null,

        freeze: false,

        getContentWidth: function() {
          return Math.max(self.__content.scrollWidth, self.__content.offsetWidth);
        },

        getContentHeight: function() {
          return Math.max(self.__content.scrollHeight, self.__content.offsetHeight + (self.__content.offsetTop * 2));
        }

      };

      for (var key in options) {
        self.options[key] = options[key];
      }

      self.onScroll = function() {
        // this is run every scroll event, so keep it light
        if (!ionic.scroll.isScrolling) {
          setTimeout(self.setScrollStart, 50);
        } else {
          clearTimeout(self.scrollTimer);
          self.scrollTimer = setTimeout(function(){
            ionic.scroll.isScrolling = false;
          }, 80);
        }
      };

      self.freeze = function(shouldFreeze) {
        if (arguments.length) {
          self.options.freeze = shouldFreeze;
        }
        return self.options.freeze;
      };

    },
    // Not Used in native scrolling, but called by other Ionic components

    __callback: NOOP,
    zoomTo: NOOP,
    zoomBy: NOOP,
    activatePullToRefresh: NOOP,

    resize: function(continueScrolling) {
      var self = this;
      if (!self.__container || !self.options) return;

      // Update Scroller dimensions for changed content
      // Add padding to bottom of content
      self.setDimensions(
        self.__container.clientWidth,
        self.__container.clientHeight,
        self.options.getContentWidth(),
        self.options.getContentHeight(),
        continueScrolling
      );
    },



    run: function() {
      // should be noop, but keeping this for future proofing
      this.resize();
    },

    /**
     * Returns the scroll position and zooming values
     *
     * @return {Map} `left` and `top` scroll position and `zoom` level
     */
    getValues: function() {
      return {
        left: this.__scrollLeft,
        top: this.__scrollTop,
        zoom: 1
      };
    },

    /**
     * Configures the dimensions of the client (outer) and content (inner) elements.
     * Requires the available space for the outer element and the outer size of the inner element.
     * All values which are falsy (null or zero etc.) are ignored and the old value is kept.
     *
     * @param clientWidth {Integer} Inner width of outer element
     * @param clientHeight {Integer} Inner height of outer element
     * @param contentWidth {Integer} Outer width of inner element
     * @param contentHeight {Integer} Outer height of inner element
     */
    setDimensions: function(clientWidth, clientHeight, contentWidth, contentHeight, continueScrolling) {
      var self = this;

      if (!clientWidth && !clientHeight && !contentWidth && !contentHeight) {
        // this scrollview isn't rendered, don't bother
        return;
      }

      // Only update values which are defined
      if (clientWidth === +clientWidth) {
        self.__clientWidth = clientWidth;
      }

      if (clientHeight === +clientHeight) {
        self.__clientHeight = clientHeight;
      }

      if (contentWidth === +contentWidth) {
        self.__contentWidth = contentWidth;
      }

      if (contentHeight === +contentHeight) {
        self.__contentHeight = contentHeight;
      }

      // Refresh maximums
      self.__computeScrollMax();

      // Refresh scroll position
      if (!continueScrolling) {
        self.scrollTo(self.__scrollLeft, self.__scrollTop, true, null, true);
      }

    },

    /**
     * Recomputes scroll minimum values based on client dimensions and content dimensions.
     */
    __computeScrollMax: function() {
      var self = this;

      self.__maxScrollLeft = Math.max((self.__contentWidth) - self.__clientWidth, 0);
      self.__maxScrollTop = Math.max((self.__contentHeight) - self.__clientHeight, 0);

      if (!self.__didWaitForSize && !self.__maxScrollLeft && !self.__maxScrollTop) {
        self.__didWaitForSize = true;
        self.__waitForSize();
      }
    },

    /**
     * Returns the maximum scroll values
     *
     * @return {Map} `left` and `top` maximum scroll values
     */
    getScrollMax: function() {
      return {
        left: this.__maxScrollLeft,
        top: this.__maxScrollTop
      };
    },

    /**
     * If the scroll view isn't sized correctly on start, wait until we have at least some size
     */
    __waitForSize: function() {
      var self = this;

      clearTimeout(self.__sizerTimeout);

      var sizer = function() {
        self.resize(true);
      };

      sizer();
      self.__sizerTimeout = setTimeout(sizer, 500);
    },

    scrollBy: function(left, top, animate) {
      var self = this;

      var startLeft = self.__isAnimating ? self.__scheduledLeft : self.__scrollLeft;
      var startTop = self.__isAnimating ? self.__scheduledTop : self.__scrollTop;

      self.scrollTo(startLeft + (left || 0), startTop + (top || 0), animate);
    },

    /**
     * Scrolls to the given position. Respect limitations and snapping automatically.
     *
     * @param left {Number} Horizontal scroll position, keeps current if value is <code>null</code>
     * @param top {Number} Vertical scroll position, keeps current if value is <code>null</code>
     * @param animate {Boolean} Whether the scrolling should happen using an animation
     */
    scrollTo: function(left, top, animate) {
      //TODO add animate functionality
      var self = this;

      self.el.scrollTop = top;
      self.el.scrollLeft = left;
    },

    onScroll: function() {

      if (!ionic.scroll.isScrolling) {
        setTimeout(self.setScrollStart, 50);
      } else {
        clearTimeout(self.scrollTimer);
        self.scrollTimer = setTimeout(self.setScrollStop, 80);
      }

    },

    resetScrollView: function(e) {
      //return scrollview to original height once keyboard has hidden
      if (self.isScrolledIntoView) {
        self.isScrolledIntoView = false;
        container.style.height = "";
        container.style.overflow = "";
        self.resize();
        ionic.scroll.isScrolling = false;
      }
    },

    __initEventHandlers: function() {
      var self = this;

      // Event Handler
      var container = self.__container;

      container.addEventListener('resetScrollView', self.resetScrollView);
      container.addEventListener('scroll', self.onScroll);
    },

    __cleanup: function() {
      var self = this;
      var container = self.__container;

      container.removeEventListener('resetScrollView', self.resetScrollView);
      container.removeEventListener('scroll', self.onScroll);

      ionic.tap.removeClonedInputs(container, self);

      delete self.__container;
      delete self.__content;
      delete self.__indicatorX;
      delete self.__indicatorY;
      delete self.options.el;

      self.resize = self.scrollTo = self.onScroll = self.resetScrollView = NOOP;
      container = null;
    }
  });

})(ionic);

