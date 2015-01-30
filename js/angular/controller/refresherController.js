IonicModule
.controller('$ionicRefresher', [
  '$scope',
  '$attrs',
  '$element',
  '$ionicBind',
  '$timeout',
  function($scope, $attrs,  $element, $ionicBind, $timeout) {
    var self = this,
        isDragging = false,
        isOverscrolling = false,
        dragOffset = 0,
        lastOverscroll = 0,
        ptrThreshold = 60,
        activated = false,
        scrollTime = 500,
        startY = null,
        deltaY = null;

    self.scrollParent = self.scrollChild = null;

    if (angular.isUndefined($attrs.pullingIcon)) {
      $attrs.$set('pullingIcon', 'ion-android-arrow-down');
    }
    $scope.showSpinner = angular.isUndefined($attrs.refreshingIcon);

    $ionicBind($scope, $attrs, {
      pullingIcon: '@',
      pullingText: '@',
      refreshingIcon: '@',
      refreshingText: '@',
      spinner: '@',
      disablePullingRotation: '@',
      $onRefresh: '&onRefresh',
      $onPulling: '&onPulling'
    });

    if (isDefined($attrs.onPullProgress)) {
      var onPullProgressFn = $parse($attrs.onPullProgress);
      $scope.$onPullProgress = function(progress) {
        onPullProgressFn($scope, {
          progress: progress
        });
      };
    }

    function handleDragEnd() {
      startY = null;
      if (!isDragging) {
        dragOffset = 0;
        lastOverscroll = 0;
        isOverscrolling = false;
        setScrollLock(false);
        return true;
      }
      isDragging = false;
      dragOffset = 0;
      if (lastOverscroll > ptrThreshold) {
        self.sharedMethods.start();
        scrollTo(ptrThreshold, scrollTime);
      }else {
        scrollTo(0, scrollTime, self.sharedMethods.deactivate);
        isOverscrolling = false;
      }
      return true;
    }

    function handleDrag(e) {
      if (e.touches.length > 1)return; //multi-touch gesture
      if (startY === null) startY = parseInt(e.touches[0].screenY);
      deltaY = parseInt(e.touches[0].screenY) - startY;

      if (deltaY - dragOffset <= 0 || self.scrollParent.scrollTop !== 0) {
        if (isOverscrolling) {
          isOverscrolling = false;
          setScrollLock(false);
        }
        if (isDragging) nativescroll(self.scrollParent,parseInt(deltaY - dragOffset) * -1);
        // this only needs to happen once and a DOM read is cheaper than a write
        if (self.scrollChild.style['-webkit-transform'] !== 'translateY(0px)') {
          overscroll(0);
        }
        return true;
      }else if (deltaY > 0 && self.scrollParent.scrollTop === 0 && !isOverscrolling) {
        // starting overscroll, but drag started below scrollTop 0, so we need to offset the position
        dragOffset = deltaY;
      }
      e.preventDefault();
      if (!isOverscrolling) {
        isOverscrolling = true;
        setScrollLock(true);
      }

      isDragging = true;
      overscroll(parseInt(deltaY - dragOffset));
      lastOverscroll = parseInt(deltaY - dragOffset);

      if (!activated && lastOverscroll > ptrThreshold) {
        activated = true;
        ionic.requestAnimationFrame(self.sharedMethods.activate);

      } else if (activated && lastOverscroll < ptrThreshold) {
        activated = false;
        ionic.requestAnimationFrame(self.sharedMethods.deactivate);
      }
    }

    function overscroll(val) {
      self.scrollChild.style['-webkit-transform'] = 'translateY(' + val + 'px)';
    }

    function nativescroll(target, newScrollTop) {
      target.scrollTop = newScrollTop;
      var e = document.createEvent("UIEvents");
      // creates a scroll event that bubbles, can be cancelled, and with its view
      // and detail property initialized to window and 1, respectively
      e.initUIEvent("scroll", true, true, window, 1);
      target.dispatchEvent(e);
    }

    function setScrollLock(enabled) {
      if (enabled) {
        ionic.requestAnimationFrame(function() {
          self.scrollChild.classList.add('overscroll');
          self.sharedMethods.show();
        });
      } else {
        ionic.requestAnimationFrame(function() {
          self.scrollChild.classList.remove('overscroll');
          self.sharedMethods.hide();
        });
      }
    }

    $scope.$on('scroll.refreshComplete', function() {
      // prevent the complete from firing before the scroll has started
      $timeout(function() {
        ionic.requestAnimationFrame(self.sharedMethods.tail);
        // scroll back to home during tail animation
        scrollTo(0, scrollTime, self.sharedMethods.deactivate);
        // return to native scrolling after tail animation has time to finish
        $timeout(function() {
          if (isOverscrolling) {
            isOverscrolling = false;
            setScrollLock(false);
          }
          lastOverscroll = 0;
        }, scrollTime);
      }, scrollTime);
    });

    function scrollTo(Y, duration, callback) {
      // credit https://gist.github.com/dezinezync/5487119
      var start = Date.now(),
        from = lastOverscroll;
      if (from === Y) {
        callback();
        return; /* Prevent scrolling to the Y point if already there */
      }
      function min(a, b) {
        return a < b ? a : b;
      }
      function scroll() {
        var currentTime = Date.now(),
          time = min(1, ((currentTime - start) / duration)),
          // where .5 would be 50% of time on a linear scale easedT gives a fraction based on the easing method
          easedT = easing.easeOutCubic(time);
        overscroll(parseInt((easedT * (Y - from)) + from));
        if (time < 1) ionic.requestAnimationFrame(scroll);
        else {
          lastOverscroll = Y;
          if (Y < 5 && Y > -5) {
            isOverscrolling = false;
            setScrollLock(false);
          }
          if (callback) callback();
        }
      }
      ionic.requestAnimationFrame(scroll);
    }


    self.init = function() {
      self.scrollParent = $element.parent().parent()[0];
      self.scrollChild = $element.parent()[0];
      ionic.on('touchmove', handleDrag, self.scrollChild);
      ionic.on('touchend', handleDragEnd, self.scrollChild);
      ionic.on('scroll', function(e) {
        //console.log('scroll!',e);
      }, self.scrollParent);
    };

    // DOM manipulation and broadcast methods shared by JS and Native Scrolling
    self.sharedMethods = {
      activate: function() {
        $element[0].classList.add('active');
        $scope.$onPulling();
        self.sharedMethods.onPullProgress(1);
      },
      deactivate: function() {
        // give tail 150ms to finish
        $timeout(function() {
          // deactivateCallback
          $element[0].classList.remove('active');
          $element[0].classList.remove('refreshing');
          $element[0].classList.remove('refreshing-tail');
          if (activated) activated = false;
        },150);
      },
      start: function() {
        // startCallback
        $element[0].classList.add('refreshing');
        $scope.$onRefresh();
      },
      show: function() {
        // showCallback
        $element[0].classList.remove('invisible');
      },
      hide: function() {
        // showCallback
        $element[0].classList.add('invisible');
      },
      tail: function() {
        // tailCallback
        $element[0].classList.add('refreshing-tail');
      },
      onPullProgress: function(progress) {
        $scope.$broadcast('$ionicRefresher.pullProgress', progress);
        $scope.$onPullProgress && $scope.$onPullProgress(progress);
      }
    };

    var easing = {
      // no easing, no acceleration
      linear: function (t) { return t; },
      // accelerating from zero velocity
      easeInQuad: function (t) { return t*t; },
      // decelerating to zero velocity
      easeOutQuad: function (t) { return t*(2-t); },
      // acceleration until halfway, then deceleration
      easeInOutQuad: function (t) { return t<0.5 ? 2*t*t : -1+(4-2*t)*t; },
      // accelerating from zero velocity
      easeInCubic: function (t) { return t*t*t; },
      // decelerating to zero velocity
      easeOutCubic: function (t) { return (--t)*t*t+1; },
      // acceleration until halfway, then deceleration
      easeInOutCubic: function (t) { return t<0.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1; },
      // accelerating from zero velocity
      easeInQuart: function (t) { return t*t*t*t; },
      // decelerating to zero velocity
      easeOutQuart: function (t) { return 1-(--t)*t*t*t; },
      // acceleration until halfway, then deceleration
      easeInOutQuart: function (t) { return t<0.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t; },
      // accelerating from zero velocity
      easeInQuint: function (t) { return t*t*t*t*t; },
      // decelerating to zero velocity
      easeOutQuint: function (t) { return 1+(--t)*t*t*t*t; },
      // acceleration until halfway, then deceleration
      easeInOutQuint: function (t) { return t<0.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t; }
    };
  }
]);
