(function(ionic) {
  var NOOP = function() {};

  ionic.views.Scroll = ionic.views.View.inherit({
    initialize: function(options) {
      var self = this;

      self.__container = self.el = options.el;
      self.__content = options.el.firstElementChild;

      self.options = {

        /** Disable scrolling on x-axis by default */
        scrollingX: false,

        /** Enable scrolling on y-axis */
        scrollingY: true,

        /** Bouncing (content can be slowly moved outside and jumps back after releasing) */
        bouncing: ionic.platform.isIOS(),

        deceleration: null,

        freeze: false,

        getContentWidth: function() {
          return Math.max(self.__content.scrollWidth, self.__content.offsetWidth);
        },

        getContentHeight: function() {
          return Math.max(self.__content.scrollHeight, self.__content.offsetHeight + (self.__content.offsetTop * 2));
        }

      };

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
    __cleanup: NOOP,
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

    // TODO: turn in to methods
    __scrollTop: el.scrollTop,
    __scrollLeft: el.scrollLeft,
    __clientHeight: self.__content.clientHeight,
    __clientWidth: self.__content.clientWidth,
    __maxScrollTop: Math.max((self.__contentHeight) - self.__clientHeight, 0),
    __maxScrollLeft: Math.max((self.__contentWidth) - self.__clientWidth, 0),

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
      self.__container.scrollTop = top;
      self.__container.scrollLeft = left;
    }
});

})(ionic);

